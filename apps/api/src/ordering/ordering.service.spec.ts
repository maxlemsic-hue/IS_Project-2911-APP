import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { OrderingService } from './ordering.service.js';

describe('Ordering input validation', () => {
  const transaction = vi.fn();
  const service = new OrderingService({
    database: { $transaction: transaction },
  } as unknown as PrismaService);
  const valid = {
    productId: 'c2d8342f-70af-44c3-a813-bf01472cc1db',
    quantity: 25,
    customerName: 'Demo Customer',
    contactPhone: '09123456789',
  };

  it.each([
    { productId: 'wrong' },
    { quantity: '25' },
    { quantity: 1.5 },
    { quantity: 2147483648 },
    { customerName: ' ' },
    { contactPhone: '123-456' },
  ])('rejects invalid input before querying (%j)', (change) => {
    expect(() => service.submit({ ...valid, ...change })).toThrow(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('requires a private access code even with a valid reference', async () => {
    await expect(service.retrieve(`T29-${valid.productId}`)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
