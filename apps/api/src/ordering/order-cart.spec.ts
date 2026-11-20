import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { OrderingService } from './ordering.service.js';

const first = 'c2d8342f-70af-44c3-a813-bf01472cc1db';
const second = 'd2d8342f-70af-44c3-a813-bf01472cc1dc';
const customer = { customerName: 'Cart Customer', contactPhone: '09123456789' };
const catalog = [
  {
    id: first,
    name: 'First',
    sku: 'T29-P-000001',
    unitPrice: new Prisma.Decimal('18.1234'),
    sellingUnitLabel: 'piece',
    minimumOrderQuantity: 25,
  },
  {
    id: second,
    name: 'Second',
    sku: 'T29-P-000002',
    unitPrice: new Prisma.Decimal('0.1001'),
    sellingUnitLabel: 'sheet',
    minimumOrderQuantity: 10,
  },
];
function setup() {
  const findFirst = vi.fn(({ where }: { where: { id: string } }) =>
    Promise.resolve(catalog.find((product) => product.id === where.id) ?? null),
  );
  const create = vi.fn(({ data }: { data: { items: { create: unknown[] } } }) =>
    Promise.resolve({
      reference: 'demo',
      status: 'PENDING_REVIEW',
      items: data.items.create,
    }),
  );
  const transaction = vi.fn((work: (db: unknown) => unknown) =>
    work({ product: { findFirst }, customerOrder: { create } }),
  );
  return {
    service: new OrderingService({
      database: { $transaction: transaction },
    } as unknown as PrismaService),
    findFirst,
    create,
    transaction,
  };
}
describe('Multi-product order requests', () => {
  it('snapshots server prices and sums different prices and quantities exactly', async () => {
    const { service, create, findFirst } = setup();
    const order = await service.submit({
      ...customer,
      items: [
        { productId: first, quantity: 25, unitPrice: '0' },
        { productId: second, quantity: 13, unitPrice: '0' },
      ],
      orderTotal: '0',
    });
    expect(order.orderTotal).toBe('454.3863');
    expect(order.items).toHaveLength(2);
    expect(create).toHaveBeenCalledOnce();
    expect(order.items[0]).toMatchObject({
      productId: first,
      productName: 'First',
      productSku: 'T29-P-000001',
      sellingUnit: 'piece',
      quantity: 25,
      unitPrice: catalog[0].unitPrice,
    });
    expect(findFirst.mock.calls[0][0].where).toMatchObject({
      publicationStatus: 'PUBLISHED',
      isAvailable: true,
      archivedAt: null,
      category: { isActive: true, archivedAt: null },
    });
  });
  it('retains the legacy single-product payload', async () => {
    const { service } = setup();
    const order = await service.submit({
      ...customer,
      productId: first,
      quantity: 25,
    });
    expect(order.items).toHaveLength(1);
    expect(order.orderTotal).toBe('453.0850');
  });
  it.each([
    [],
    null,
    [{ productId: 'bad', quantity: 25 }],
    [{ productId: first, quantity: 1.2 }],
    [{ productId: first, quantity: '25' }],
    [{ productId: first, quantity: 2147483648 }],
    [
      { productId: first, quantity: 25 },
      { productId: first.toUpperCase(), quantity: 25 },
    ],
    Array.from({ length: 101 }, () => ({ productId: first, quantity: 25 })),
  ])('rejects malformed or duplicate lines before a transaction', (items) => {
    const { service, transaction } = setup();
    expect(() => service.submit({ ...customer, items })).toThrow(
      BadRequestException,
    );
    expect(transaction).not.toHaveBeenCalled();
  });
  it('rejects ambiguous legacy and cart payloads', () => {
    const { service } = setup();
    expect(() =>
      service.submit({
        ...customer,
        items: [{ productId: first, quantity: 25 }],
        productId: first,
      }),
    ).toThrow(BadRequestException);
  });
  it('validates all lines before creating the order', async () => {
    const { service, create } = setup();
    await expect(
      service.submit({
        ...customer,
        items: [
          { productId: first, quantity: 25 },
          { productId: second, quantity: 9 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects unavailable lines without creating an order', async () => {
    const { service, findFirst, create } = setup();
    findFirst.mockResolvedValueOnce(catalog[0]).mockResolvedValueOnce(null);
    await expect(
      service.submit({
        ...customer,
        items: [
          { productId: first, quantity: 25 },
          { productId: second, quantity: 10 },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });
});
