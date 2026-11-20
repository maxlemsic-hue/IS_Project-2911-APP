import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { orderTotal } from './order-total.js';
import type { StaffActor } from '../staff/staff-auth.service.js';
import { staffId } from '../staff/staff-accounts.service.js';
import { staffOrderScope } from './staff-order-access.js';

const productionSummary = {
  reference: true,
  status: true,
  createdAt: true,
} satisfies Prisma.CustomerOrderSelect;
const productionItem = {
  id: true,
  productName: true,
  productSku: true,
  sellingUnit: true,
  quantity: true,
};

const summary = {
  reference: true,
  status: true,
  createdAt: true,
  customerName: true,
} satisfies Prisma.CustomerOrderSelect;

const details = {
  ...summary,
  id: true,
  productionStaffId: true,
  contactPhone: true,
  declineReason: true,
  items: {
    select: {
      ...productionItem,
      unitPrice: true,
    },
  },
} satisfies Prisma.CustomerOrderSelect;

function withTotal(
  order: Prisma.CustomerOrderGetPayload<{ select: typeof details }>,
) {
  return { ...order, orderTotal: orderTotal(order.items) };
}

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: StaffActor) {
    return this.prisma.database.customerOrder.findMany({
      where: staffOrderScope(actor),
      orderBy: [{ createdAt: 'desc' }, { reference: 'asc' }],
      select: actor.role === 'PRODUCTION' ? productionSummary : summary,
    });
  }

  async details(actor: StaffActor, reference: string) {
    const where = { reference, ...staffOrderScope(actor) };
    const db = this.prisma.database;
    if (actor.role === 'PRODUCTION') {
      const assigned = await db.customerOrder.findUnique({
        where,
        select: { ...productionSummary, items: { select: productionItem } },
      });
      if (!assigned) throw new NotFoundException('Order not found.');
      return assigned;
    }
    const order = await db.customerOrder.findUnique({ where, select: details });
    if (!order) throw new NotFoundException('Order not found.');
    return withTotal(order);
  }

  async update(staffUserId: string, reference: string, body: unknown) {
    const { action, reason } = (body ?? {}) as Record<string, unknown>;
    const declineReason = typeof reason === 'string' ? reason.trim() : '';
    if (action !== 'review' && action !== 'available' && action !== 'decline') {
      throw new BadRequestException('Choose a valid review action.');
    }
    if (
      action === 'decline' &&
      (!declineReason ||
        declineReason.length > 500 ||
        declineReason.includes(String.fromCharCode(0)))
    ) {
      throw new BadRequestException(
        'Enter a decline reason of up to 500 characters.',
      );
    }
    const status =
      action === 'review'
        ? 'IN_REVIEW'
        : action === 'available'
          ? 'AVAILABLE_FOR_CONFIRMATION'
          : 'DECLINED';
    const previousStatus = action === 'review' ? 'PENDING_REVIEW' : 'IN_REVIEW';
    try {
      return await this.prisma.database.$transaction(async (db) => {
        const order = await db.customerOrder.update({
          where: { reference, status: previousStatus },
          data: {
            status,
            declineReason: action === 'decline' ? declineReason : null,
          },
          select: details,
        });
        await db.staffAudit.create({
          data: {
            staffUserId,
            orderId: order.id,
            action:
              action === 'review'
                ? 'REVIEW_STARTED'
                : action === 'available'
                  ? 'ORDER_AVAILABLE'
                  : 'ORDER_DECLINED',
          },
          select: { id: true },
        });
        return withTotal(order);
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2025'
      )
        throw error;
      const order = await this.prisma.database.customerOrder.findUnique({
        where: { reference },
        select: { reference: true },
      });
      if (!order) throw new NotFoundException('Order not found.');
      throw new ConflictException(
        'Order status changed or this action is unavailable. Reload the order.',
      );
    }
  }

  async assign(staffUserId: string, reference: string, body: unknown) {
    const { productionStaffId: target } = (body ?? {}) as Record<
      string,
      unknown
    >;
    if (target !== null && !staffId(target))
      throw new BadRequestException(
        'Choose a production staff member or remove the assignment.',
      );
    const productionStaffId = target?.toLowerCase() ?? null;
    return this.prisma.database.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM "public"."CustomerOrder" WHERE reference = ${reference} FOR UPDATE`;
      const order = await db.customerOrder.findUnique({
        where: { reference },
        select: { id: true, status: true, productionStaffId: true },
      });
      if (!order) throw new NotFoundException('Order not found.');
      if (!['ACCEPTED', 'PROCESSING', 'READY'].includes(order.status))
        throw new ConflictException(
          'Only active production orders can be assigned.',
        );
      if (order.productionStaffId === productionStaffId)
        return { productionStaffId };
      if (productionStaffId) {
        const assigned = await db.staffUser.findUnique({
          where: { id: productionStaffId, active: true, role: 'PRODUCTION' },
          select: { id: true },
        });
        if (!assigned)
          throw new BadRequestException(
            'Choose an active Production Staff account.',
          );
      }
      await db.customerOrder.update({
        where: { id: order.id },
        data: { productionStaffId },
        select: { id: true },
      });
      await db.staffAudit.create({
        data: {
          staffUserId,
          orderId: order.id,
          action: productionStaffId
            ? 'PRODUCTION_ASSIGNED'
            : 'PRODUCTION_UNASSIGNED',
        },
        select: { id: true },
      });
      return { productionStaffId };
    });
  }

  async audit(reference: string) {
    const db = this.prisma.database;
    const order = await db.customerOrder.findUnique({
      where: { reference },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return db.$queryRaw`SELECT a.id, a.action, a."receiptId", u.username, u."displayName",
      to_char(a."occurredAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "occurredAt"
      FROM "public"."StaffAudit" a JOIN "public"."StaffUser" u ON u.id=a."staffUserId"
      WHERE a."orderId"=${order.id}::uuid ORDER BY a."occurredAt", a.id`;
  }
}
