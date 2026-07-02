import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Enquiry, EmailType, EnquiryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { ListEnquiriesQueryDto } from './dto/list-enquiries-query.dto';

/** Admin CRM row — the enquiry plus its (optional) tour's display fields, flattened. */
export type AdminEnquiryItem = Enquiry & {
  tourSlug: string | null;
  tourTitle: string | null;
};

export interface PaginatedEnquiries {
  items: AdminEnquiryItem[];
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
          nationality: dto.nationality ?? null,
          travelDate: dto.travelDate ? new Date(dto.travelDate) : null,
          groupSize: dto.groupSize ?? null,
          budgetTier: dto.budgetTier ?? null,
          interests: dto.interests ?? [],
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
   * Admin CRM list — paginated, newest-first, optional `status` filter + tour join.
   * `Promise.all` list+count (pooler-safe; no `$transaction`). Case-insensitive
   * free-text search across name/email/phone/message.
   */
  async findAllForAdmin(
    query: ListEnquiriesQueryDto,
  ): Promise<PaginatedEnquiries> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();
    const where: Prisma.EnquiryWhereInput = {
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.enquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { tour: { select: { slug: true, title: true } } },
      }),
      this.prisma.enquiry.count({ where }),
    ]);

    const items: AdminEnquiryItem[] = rows.map(({ tour, ...row }) => ({
      ...row,
      tourSlug: tour?.slug ?? null,
      tourTitle: tour?.title ?? null,
    }));

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
