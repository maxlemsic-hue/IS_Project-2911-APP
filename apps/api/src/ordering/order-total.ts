import type { Prisma } from '../generated/prisma/client.js';

export function orderTotal(
  items: { unitPrice: Prisma.Decimal; quantity: number }[],
) {
  const units = items.reduce(
    (total, item) =>
      total +
      BigInt(item.unitPrice.toFixed(4).replace('.', '')) *
        BigInt(item.quantity),
    0n,
  );
  const fraction = (units % 10000n).toString().padStart(4, '0');
  return `${units / 10000n}.${fraction}`;
}
