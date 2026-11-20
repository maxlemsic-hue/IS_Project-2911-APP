import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { orderTotal } from './order-total.js';
import type { StaffActor } from '../staff/staff-auth.service.js';

const available = {
  publicationStatus: 'PUBLISHED',
  isAvailable: true,
  archivedAt: null,
  category: { isActive: true, archivedAt: null },
} satisfies Prisma.ProductWhereInput;

const orderDetails = {
  reference: true,
  status: true,
  createdAt: true,
  items: {
    select: {
      productName: true,
      productSku: true,
      sellingUnit: true,
      quantity: true,
      unitPrice: true,
    },
  },
} satisfies Prisma.CustomerOrderSelect;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function digest(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class OrderingService {
  constructor(private readonly prisma: PrismaService) {}

  products() {
    return this.prisma.database.product.findMany({
      where: available,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        sku: true,
        specificationText: true,
        unitPrice: true,
        sellingUnitLabel: true,
        minimumOrderQuantity: true,
        category: { select: { name: true } },
      },
    });
  }

  submit(body: unknown, actor?: StaffActor) {
    if (actor && !['CASHIER', 'OWNER_ADMIN'].includes(actor.role)) {
      throw new ForbiddenException(
        'Your staff role cannot create walk-in orders.',
      );
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new BadRequestException(
        'Enter product, quantity, name and contact number.',
      );
    }
    const input = body as Record<string, unknown>;
    const { customerName, contactPhone } = input;
    if ('items' in input && ('productId' in input || 'quantity' in input)) {
      throw new BadRequestException('Use either items or a single product.');
    }
    const submitted =
      'items' in input
        ? input.items
        : [{ productId: input.productId, quantity: input.quantity }];
    if (
      !Array.isArray(submitted) ||
      submitted.length < 1 ||
      submitted.length > 100
    ) {
      throw new BadRequestException('Submit between 1 and 100 product lines.');
    }
    const seen = new Set<string>();
    const lines = submitted.map((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw new BadRequestException(
          'Each item needs a product and quantity.',
        );
      }
      const { productId, quantity } = entry as Record<string, unknown>;
      if (typeof productId !== 'string' || !uuid.test(productId)) {
        throw new BadRequestException('Select a valid product for every item.');
      }
      if (
        typeof quantity !== 'number' ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 2147483647
      ) {
        throw new BadRequestException(
          'Enter positive whole-number quantities within the supported range.',
        );
      }
      const id = productId.toLowerCase();
      if (seen.has(id))
        throw new BadRequestException('Each product may appear only once.');
      seen.add(id);
      return { productId: id, quantity };
    });
    if (
      typeof customerName !== 'string' ||
      !customerName.trim() ||
      customerName.trim().length > 100 ||
      [0, 10, 13].some((code) =>
        customerName.includes(String.fromCharCode(code)),
      )
    ) {
      throw new BadRequestException('Enter a name of up to 100 characters.');
    }
    if (
      typeof contactPhone !== 'string' ||
      !/^\+?[0-9 ()-]{7,24}$/.test(contactPhone.trim())
    ) {
      throw new BadRequestException('Enter a valid contact number.');
    }
    const phone = contactPhone.trim().replace(/[ ()-]/g, '');
    if (!/^\+?\d{7,15}$/.test(phone)) {
      throw new BadRequestException('Enter a valid contact number.');
    }

    return this.prisma.database.$transaction(async (db) => {
      const items = await Promise.all(
        lines.map(async ({ productId, quantity }) => {
          const product = await db.product.findFirst({
            where: { id: productId, ...available },
            select: {
              id: true,
              name: true,
              sku: true,
              unitPrice: true,
              sellingUnitLabel: true,
              minimumOrderQuantity: true,
            },
          });
          if (!product)
            throw new NotFoundException(
              'A selected product is unavailable. Review your cart.',
            );
          if (quantity < product.minimumOrderQuantity) {
            throw new BadRequestException(
              `${product.name}: minimum quantity is ${product.minimumOrderQuantity}.`,
            );
          }
          return {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            sellingUnit: product.sellingUnitLabel,
            quantity,
            unitPrice: product.unitPrice,
          };
        }),
      );
      const accessCode = randomBytes(32).toString('base64url');
      const order = await db.customerOrder.create({
        data: {
          reference: `T29-${randomUUID()}`,
          ...(actor
            ? { source: 'WALK_IN' as const, createdById: actor.id }
            : {}),
          accessHash: digest(accessCode),
          customerName: customerName.trim(),
          contactPhone: phone,
          items: { create: items },
        },
        select: orderDetails,
      });
      if (actor) {
        const saved = await db.customerOrder.findUniqueOrThrow({
          where: { reference: order.reference },
          select: { id: true },
        });
        await db.staffAudit.create({
          data: {
            staffUserId: actor.id,
            orderId: saved.id,
            action: 'WALK_IN_CREATED',
          },
          select: { id: true },
        });
      }
      return {
        ...order,
        accessCode,
        orderTotal: orderTotal(order.items),
        ...(actor
          ? {
              source: 'WALK_IN' as const,
              createdBy: { id: actor.id, displayName: actor.displayName },
            }
          : {}),
      };
    });
  }

  async retrieve(reference: string, authorization?: string) {
    const access = privateOrderAccess(reference, authorization);
    const order = await this.prisma.database.customerOrder.findUnique({
      where: access,
      select: orderDetails,
    });
    if (!order)
      throw new NotFoundException(
        'Order could not be found with those details.',
      );
    return { ...order, orderTotal: orderTotal(order.items) };
  }

  async confirm(reference: string, body: unknown, authorization?: string) {
    const access = privateOrderAccess(reference, authorization);
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      !('confirm' in body) ||
      body.confirm !== true
    ) {
      throw new BadRequestException('Explicit confirmation is required.');
    }
    return this.prisma.database.$transaction(async (db) => {
      // PostgreSQL assigns the instant and returns UTC text independently of the session time zone.
      const [confirmation] = await db.$queryRaw<{ confirmedAt: string }[]>`
        UPDATE "public"."CustomerOrder"
        SET status = 'AWAITING_PAYMENT', "confirmedAt" = CURRENT_TIMESTAMP
        WHERE reference = ${access.reference} AND "accessHash" = ${access.accessHash}
          AND status = 'AVAILABLE_FOR_CONFIRMATION' AND "confirmedAt" IS NULL
        RETURNING to_char("confirmedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "confirmedAt"
      `;
      const order = await db.customerOrder.findUnique({
        where: access,
        select: orderDetails,
      });
      if (!order)
        throw new NotFoundException(
          'Order could not be found with those details.',
        );
      if (!confirmation)
        throw new ConflictException(
          'This order cannot be confirmed in its current status. Look up the order again.',
        );
      return { ...order, ...confirmation, orderTotal: orderTotal(order.items) };
    });
  }
}

export function privateOrderAccess(reference: string, authorization?: string) {
  const code = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization ?? '')?.[1];
  if (
    !reference.startsWith('T29-') ||
    !uuid.test(reference.slice(4)) ||
    !code
  ) {
    throw new NotFoundException('Order could not be found with those details.');
  }
  return { reference, accessHash: digest(code) };
}
