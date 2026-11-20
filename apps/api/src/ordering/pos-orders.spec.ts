import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { OrderingService } from './ordering.service.js';
const actor = {
  id: 'c2d8342f-70af-44c3-a813-bf01472cc1db',
  username: 'cashier',
  displayName: 'Cashier',
  role: 'CASHIER' as const,
};
const productId = 'd2d8342f-70af-44c3-a813-bf01472cc1dc';
function setup() {
  const product = {
    id: productId,
    name: 'Print',
    sku: 'T29-P-000001',
    unitPrice: new Prisma.Decimal('12.3456'),
    sellingUnitLabel: 'piece',
    minimumOrderQuantity: 10,
  };
  const create = vi.fn(({ data }) =>
    Promise.resolve({
      reference: 'ref',
      status: 'PENDING_REVIEW',
      items: data.items.create,
    }),
  );
  const audit = vi.fn().mockResolvedValue({ id: 'audit' });
  const transaction = vi.fn((work) =>
    work({
      product: { findFirst: vi.fn().mockResolvedValue(product) },
      customerOrder: {
        create,
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'order' }),
      },
      staffAudit: { create: audit },
    }),
  );
  return {
    service: new OrderingService({
      database: { $transaction: transaction },
    } as unknown as PrismaService),
    create,
    audit,
    transaction,
  };
}
const body = {
  items: [{ productId, quantity: 10, unitPrice: '0' }],
  customerName: 'Walk-in Customer',
  contactPhone: '09123456789',
  source: 'ONLINE',
  createdById: 'spoofed',
};
describe('Walk-in order creation', () => {
  it('uses trusted staff attribution, server prices and Pending Review', async () => {
    const { service, create, audit } = setup();
    const order = await service.submit(body, actor);
    expect(order.source).toBe('WALK_IN');
    expect(order.status).toBe('PENDING_REVIEW');
    expect(order.orderTotal).toBe('123.4560');
    expect(create.mock.calls[0][0].data).toMatchObject({
      source: 'WALK_IN',
      createdById: actor.id,
    });
    expect(audit).toHaveBeenCalledWith({
      data: {
        staffUserId: actor.id,
        orderId: 'order',
        action: 'WALK_IN_CREATED',
      },
      select: { id: true },
    });
  });
  it('allows Owner/Admin creation', async () => {
    const { service } = setup();
    expect(
      (await service.submit(body, { ...actor, role: 'OWNER_ADMIN' })).source,
    ).toBe('WALK_IN');
  });
  it('rejects Production before opening a transaction', () => {
    const { service, transaction } = setup();
    expect(() =>
      service.submit(body, { ...actor, role: 'PRODUCTION' }),
    ).toThrow(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('does not trust public source or creator claims', async () => {
    const { service, create, audit } = setup();
    await service.submit({ ...body, source: 'WALK_IN', createdById: actor.id });
    expect(create.mock.calls[0][0].data).not.toHaveProperty('source');
    expect(create.mock.calls[0][0].data).not.toHaveProperty('createdById');
    expect(audit).not.toHaveBeenCalled();
  });
  it('uses shared minimum quantity validation', async () => {
    const { service, create, audit } = setup();
    await expect(
      service.submit({ ...body, items: [{ productId, quantity: 9 }] }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
  it('propagates an audit failure within the order transaction', async () => {
    const { service, audit, transaction } = setup();
    audit.mockRejectedValueOnce(Error('audit unavailable'));
    await expect(service.submit(body, actor)).rejects.toThrow(
      'audit unavailable',
    );
    expect(transaction).toHaveBeenCalledOnce();
  });
});
