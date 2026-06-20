import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Enquiry, EmailType, EnquiryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { ListEnquiriesQueryDto } from './dto/list-enquiries-query.dto';

export interface PaginatedEnquiries {
  items: Enquiry[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/**
 * "Inquire Now" lead capture (ADR-0003) + admin CRM pipeline.
 *
 * Public create persists the lead with `status=NEW`. Anti-abuse (rate-limit +
 * honeypot) is enforced at the controller; this service stays a pure writer.
 * `tourId` is optional — a general enquiry has none; if provided it must resolve
 * to a published tour (a dangling reference would otherwise sit in the CRM).
 */
@Injectable()
export class EnquiryService {
  private readonly logger = new Logger(EnquiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEnquiryDto): Promise<Enquiry> {
    if (dto.tourId) {
      const tour = await this.prisma.tour.findFirst({
        where: { id: dto.tourId, isPublished: true },
        select: { id: true },
      });
      if (!tour) {
        throw new NotFoundException({
          code: 'TOUR_NOT_FOUND',
          message: `Tour "${dto.tourId}" not found`,
        });
      }
    }

    // Create + acknowledgement-email enqueue commit together in a short tx
    // (ADR-0007); the fresh enquiry id makes `dedupeKey` unique by construction.
    const enquiry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.enquiry.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone ?? null,
          message: dto.message,
          tourId: dto.tourId ?? null,
        },
      });
      await tx.outbox.create({
        data: {
          type: EmailType.ENQUIRY_RECEIVED,
          payload: { enquiryId: created.id },
          dedupeKey: `enquiry-received:${created.id}`,
        },
      });
      return created;
    });
    this.logger.log(`New enquiry ${enquiry.id} from ${dto.email}`);
    return enquiry;
  }

  /**
   * Admin CRM list — paginated, newest-first, optional `status` filter.
   * `Promise.all` list+count (pooler-safe; no `$transaction`).
   */
  async findAllForAdmin(
    query: ListEnquiriesQueryDto,
  ): Promise<PaginatedEnquiries> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.EnquiryWhereInput =
      query.status !== undefined ? { status: query.status } : {};

    const [items, total] = await Promise.all([
      this.prisma.enquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.enquiry.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /** CRM pipeline transition (NEW → CONTACTED → …). 404 if id is unknown. */
  async updateStatus(id: string, status: EnquiryStatus): Promise<Enquiry> {
    const existing = await this.prisma.enquiry.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'ENQUIRY_NOT_FOUND',
        message: `Enquiry "${id}" not found`,
      });
    }
    const updated = await this.prisma.enquiry.update({
      where: { id },
      data: { status },
    });
    this.logger.log(`Enquiry ${id} → status ${status}`);
    return updated;
  }
}
