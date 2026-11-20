import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Staff order access', () => {
  const cookie = 't29_staff=' + 'a'.repeat(43);
  const list = vi.fn(() => []);
  const session = vi.fn();
  let app: INestApplication;
  const staff = { id: 'staff-test', username: 'staff', displayName: 'Staff' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        database: { $queryRaw: session, customerOrder: { findMany: list } },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => vi.resetAllMocks());

  it('rejects missing sessions and the retired demo bearer scheme', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/orders').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .set('Authorization', 'Bearer old-demo-key')
      .expect(401);
    expect(list).not.toHaveBeenCalled();
  });

  it('allows Owner/Admin to list orders with an active session', async () => {
    session.mockResolvedValue([{ ...staff, role: 'OWNER_ADMIN' }]);
    await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .set('Cookie', cookie)
      .expect('Cache-Control', 'no-store')
      .expect(200, []);
  });

  it('limits Production Staff to assigned orders and denies payment verification', async () => {
    session.mockResolvedValue([{ ...staff, role: 'PRODUCTION' }]);
    await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .set('Cookie', cookie)
      .expect(200, []);
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          productionStaffId: staff.id,
          status: { in: ['ACCEPTED', 'PROCESSING', 'READY', 'COMPLETED'] },
        },
      }),
    );
    await request(app.getHttpServer())
      .patch('/api/v1/admin/orders/demo/receipts/example')
      .set('Cookie', cookie)
      .set('X-Staff-Request', '1')
      .send({ decision: 'approve' })
      .expect(403);
  });

  it('allows Cashier identity while denying the online order queue', async () => {
    session.mockResolvedValue([{ ...staff, role: 'CASHIER' }]);
    await request(app.getHttpServer())
      .get('/api/v1/staff/me')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .set('Cookie', cookie)
      .expect(403);
  });

  it('requires the staff request header for changes before reading a session', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/admin/orders/demo/status')
      .set('Cookie', cookie)
      .send({ action: 'review' })
      .expect(403);
    expect(session).not.toHaveBeenCalled();
  });
});
