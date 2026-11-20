import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { OrderingService } from './ordering.service.js';

describe('Customer order confirmation', () => {
  const reference = 'T29-c2d8342f-70af-44c3-a813-bf01472cc1db';
  const code = 'x'.repeat(43);
  const authorization = `Bearer ${code}`;
  const queryRaw = vi.fn();
  const findUnique = vi.fn();
  const db = { $queryRaw: queryRaw, customerOrder: { findUnique } };
  const service = new OrderingService({
    database: { $transaction: (run: (tx: typeof db) => unknown) => run(db) },
  } as unknown as PrismaService);

  beforeEach(() => vi.resetAllMocks());

  it.each([null, {}, { confirm: false }, { confirm: 'true' }])(
    'requires explicit boolean confirmation (%j)',
    async (body) => {
      await expect(
        service.confirm(reference, body, authorization),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(queryRaw).not.toHaveBeenCalled();
    },
  );

  it('rejects invalid credentials before attempting a write', async () => {
    await expect(
      service.confirm(reference, { confirm: true }, 'Bearer invalid'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('atomically scopes the transition and returns the exact snapshot total', async () => {
    queryRaw.mockResolvedValue([{ confirmedAt: '2026-11-20T08:33:07.272Z' }]);
    findUnique.mockResolvedValue({
      reference,
      status: 'AWAITING_PAYMENT',
      items: [
        { unitPrice: new Prisma.Decimal('99999999999999.9999'), quantity: 25 },
      ],
    });
    await expect(
      service.confirm(reference, { confirm: true }, authorization),
    ).resolves.toMatchObject({
      status: 'AWAITING_PAYMENT',
      orderTotal: '2499999999999999.9975',
      confirmedAt: '2026-11-20T08:33:07.272Z',
    });
    const [parts, ref, hash] = queryRaw.mock.calls[0] as [
      TemplateStringsArray,
      string,
      string,
    ];
    expect(ref).toBe(reference);
    expect(hash).toBe(createHash('sha256').update(code).digest('hex'));
    expect(parts.join('?')).toContain(
      'WHERE reference = ? AND "accessHash" = ?',
    );
    expect(parts.join('?')).toContain(
      'AND status = \'AVAILABLE_FOR_CONFIRMATION\' AND "confirmedAt" IS NULL',
    );
    expect(parts.join('?')).toContain('"confirmedAt" = CURRENT_TIMESTAMP');
  });

  it('distinguishes an ineligible owned order from an unrelated order', async () => {
    queryRaw.mockResolvedValue([]);
    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ reference });
    await expect(
      service.confirm(reference, { confirm: true }, authorization),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.confirm(reference, { confirm: true }, authorization),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
