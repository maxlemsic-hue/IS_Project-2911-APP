import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, type OrderStatus } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { OrderConversationService } from './order-conversation.service.js';

describe('Order production decisions', () => {
  const reference = 'test-order';
  const owner = {
    id: 'staff-id',
    username: 'owner',
    displayName: 'Owner',
    role: 'OWNER_ADMIN',
  } as const;
  const id = 'c2d8342f-70af-44c3-a813-bf01472cc1db';
  const db = {
    customerOrder: { findUnique: vi.fn() },
    paymentReceipt: { aggregate: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    staffAudit: { create: vi.fn() },
  };
  const service = new OrderConversationService({
    database: { $transaction: (run: (tx: typeof db) => unknown) => run(db) },
  } as unknown as PrismaService);

  function order(status: OrderStatus) {
    db.customerOrder.findUnique.mockResolvedValue({
      id,
      status,
      items: [{ unitPrice: new Prisma.Decimal('20'), quantity: 25 }],
    });
  }

  beforeEach(() => {
    vi.resetAllMocks();
    db.$executeRaw.mockResolvedValue(1);
  });

  it('rejects an unknown action before locking the order', async () => {
    await expect(
      service.advance(owner, reference, { action: 'cancel' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it.each([
    ['start', 'PROCESSING'],
    ['ready', 'ACCEPTED'],
    ['complete', 'PROCESSING'],
    ['complete', 'COMPLETED'],
  ] as const)(
    'rejects %s from %s without a status write',
    async (action, from) => {
      order(from);
      await expect(
        service.advance(owner, reference, { action }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.$executeRaw).not.toHaveBeenCalled();
    },
  );

  it('requires the full verified total before releasing a Ready order', async () => {
    order('READY');
    db.paymentReceipt.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('499.99') },
    });
    await expect(
      service.advance(owner, reference, { action: 'complete' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.paymentReceipt.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: id, status: 'APPROVED' },
      }),
    );
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  it('records a paid release and its timestamp in the same write', async () => {
    order('READY');
    db.paymentReceipt.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('500.00') },
    });
    await expect(
      service.advance(owner, reference, { action: 'complete' }),
    ).resolves.toEqual({ status: 'COMPLETED' });
    const [parts, to, orderId, from] = db.$executeRaw.mock.calls[0] as [
      TemplateStringsArray,
      string,
      string,
      string,
    ];
    expect([from, to, orderId]).toEqual(['READY', 'COMPLETED', id]);
    expect(parts.join('')).toContain(
      'INSERT INTO "public"."OrderStatusChange"',
    );
    expect(parts.join('')).toContain('clock_timestamp()');
  });
});
