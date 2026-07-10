import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';

// Load runtime env + the seed-written identifiers BEFORE AppModule initialises.
loadEnv({ path: join(__dirname, '..', '.env') });
loadEnv({ path: join(__dirname, '..', '.env.e2e') });

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const CUSTOMER_ID = process.env.E2E_CUSTOMER_ID ?? '';
const ADMIN_ID = process.env.E2E_ADMIN_ID ?? '';
const PAID_CODE = process.env.E2E_PAID_BOOKING_CODE ?? '';
const TOUR_SLUG = process.env.E2E_TOUR_SLUG ?? '';
const ENQUIRY_EMAIL = 'e2e-lead@tourism.test';

/**
 * Mint a real HS256 Supabase-style JWT signed with the configured
 * SUPABASE_JWT_SECRET, so the REAL `SupabaseJwtGuard` verifies it and attaches
 * the matching seeded user (looked up by `sub` = `supabaseId`). Higher fidelity
 * than stubbing the guard — exercises the actual auth + roles path.
 */
async function mintJwt(sub: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.SUPABASE_JWT_SECRET ?? '',
  );
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

interface ListBody<T> {
  data: T[];
  meta: { total: number };
}
interface ItemBody<T> {
  data: T;
}

describe('API happy-path (e2e, seeded DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken = '';
  let adminToken = '';
  let tourId = '';
  let reviewId = '';

  beforeAll(async () => {
    if (!CUSTOMER_ID || !ADMIN_ID || !PAID_CODE || !TOUR_SLUG) {
      throw new Error(
        'e2e prerequisites missing — run `pnpm nx run @tourism/api:seed` first (.env.e2e)',
      );
    }
    if (!process.env.SUPABASE_JWT_SECRET) {
      throw new Error(
        'e2e needs SUPABASE_JWT_SECRET (HS256) set in apps/api/.env',
      );
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    // Mint tokens for the seeded users (real guard maps sub → supabaseId).
    const [customer, admin] = await Promise.all([
      prisma.user.findUnique({
        where: { id: CUSTOMER_ID },
        select: { supabaseId: true, email: true },
      }),
      prisma.user.findUnique({
        where: { id: ADMIN_ID },
        select: { supabaseId: true, email: true },
      }),
    ]);
    if (!customer || !admin) {
      throw new Error('e2e: seeded users not found — reseed');
    }
    customerToken = await mintJwt(customer.supabaseId, customer.email);
    adminToken = await mintJwt(admin.supabaseId, admin.email);

    // Reset prior e2e artifacts so the flow is deterministic + repeatable.
    const booking = await prisma.booking.findUnique({
      where: { code: PAID_CODE },
      select: { id: true, tourId: true },
    });
    if (booking) {
      await prisma.review.deleteMany({ where: { bookingId: booking.id } });
      tourId = booking.tourId;
    }
    await prisma.wishlist.deleteMany({
      where: { userId: CUSTOMER_ID, tourId },
    });
    await prisma.enquiry.deleteMany({ where: { email: ENQUIRY_EMAIL } });
  });

  afterAll(async () => {
    await app?.close();
  });

  const server = (): ReturnType<INestApplication['getHttpServer']> =>
    app.getHttpServer();
  const asCustomer = (t: request.Test): request.Test =>
    t.set('Authorization', `Bearer ${customerToken}`);
  const asAdmin = (t: request.Test): request.Test =>
    t.set('Authorization', `Bearer ${adminToken}`);

  it('lists published tours (public) including the seeded tour', async () => {
    const res = await request(server())
      .get('/api/v1/tours?pageSize=50')
      .expect(200);
    const list = res.body as ListBody<{ slug: string }>;
    expect(list.data.map((t) => t.slug)).toContain(TOUR_SLUG);
  });

  it('returns the seeded tour detail', async () => {
    const res = await request(server())
      .get(`/api/v1/tours/${TOUR_SLUG}`)
      .expect(200);
    const item = res.body as ItemBody<{ slug: string; id: string }>;
    expect(item.data.slug).toBe(TOUR_SLUG);
  });

  it('lets the customer review their PAID booking', async () => {
    const res = await asCustomer(request(server()).post('/api/v1/reviews'))
      .send({
        bookingCode: PAID_CODE,
        rating: 5,
        title: 'E2E',
        body: 'A great seeded experience exercised by the e2e suite.',
      })
      .expect(201);
    const item = res.body as ItemBody<{ id: string }>;
    reviewId = item.data.id;
    expect(reviewId).toBeTruthy();
  });

  it('hides the review from the public list until approved', async () => {
    const res = await request(server())
      .get(`/api/v1/tours/${TOUR_SLUG}/reviews`)
      .expect(200);
    expect((res.body as ListBody<unknown>).meta.total).toBe(0);
  });

  it('lets an admin approve the review', async () => {
    await asAdmin(
      request(server()).patch(`/api/v1/admin/reviews/${reviewId}/moderation`),
    )
      .send({ isApproved: true })
      .expect(200);
  });

  it('shows the approved review publicly (PII-stripped)', async () => {
    const res = await request(server())
      .get(`/api/v1/tours/${TOUR_SLUG}/reviews`)
      .expect(200);
    const list = res.body as ListBody<{ reviewer: { fullName: string } }>;
    expect(list.meta.total).toBeGreaterThanOrEqual(1);
    expect(list.data[0].reviewer.fullName).toBeTruthy();
  });

  it('lets the customer add + list a wishlist item', async () => {
    await asCustomer(
      request(server()).post(`/api/v1/wishlist/${tourId}`),
    ).expect(200);
    const res = await asCustomer(
      request(server()).get('/api/v1/wishlist/me'),
    ).expect(200);
    const list = res.body as ItemBody<Array<{ tourId: string }>>;
    expect(list.data.some((w) => w.tourId === tourId)).toBe(true);
  });

  it('accepts a public enquiry and lists it for an admin', async () => {
    const ack = await request(server())
      .post('/api/v1/enquiries')
      .send({
        name: 'E2E Lead',
        email: ENQUIRY_EMAIL,
        message: 'Interested in the seeded tour — submitted by the e2e suite.',
      })
      .expect(201);
    expect((ack.body as ItemBody<{ received: boolean }>).data.received).toBe(
      true,
    );

    const res = await asAdmin(
      request(server()).get('/api/v1/admin/enquiries?pageSize=100'),
    ).expect(200);
    const list = res.body as ListBody<{ email: string }>;
    expect(list.data.some((e) => e.email === ENQUIRY_EMAIL)).toBe(true);
  });
});
