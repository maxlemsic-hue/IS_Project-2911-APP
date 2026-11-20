import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type OrderStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StaffActor } from '../staff/staff-auth.service.js';
import { staffOrderScope } from './staff-order-access.js';
import { orderTotal } from './order-total.js';
import {
  enteredCents,
  paymentAmounts,
  php,
  receiptImage,
  roundedCents,
} from './payment-rules.js';

type Access = { reference: string; accessHash?: string };
const production = {
  start: { from: 'ACCEPTED', to: 'PROCESSING', audit: 'PRODUCTION_STARTED' },
  ready: { from: 'PROCESSING', to: 'READY', audit: 'ORDER_READY' },
  complete: { from: 'READY', to: 'COMPLETED', audit: 'ORDER_COMPLETED' },
} as const;
const receiptDetails = {
  id: true,
  status: true,
  amount: true,
  rejectionReason: true,
  contentType: true,
} satisfies Prisma.PaymentReceiptSelect;

function textField(value: unknown, max: number, message: string) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > max ||
    value.includes(String.fromCharCode(0))
  )
    throw new BadRequestException(message);
  return value.trim();
}

function receiptId(id: string) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
    throw new NotFoundException('Receipt not found.');
  return id;
}

@Injectable()
export class OrderConversationService {
  constructor(private readonly prisma: PrismaService) {}

  private async order(
    db: Prisma.TransactionClient,
    access: Access,
    actor?: StaffActor,
  ) {
    const order = await db.customerOrder.findUnique({
      where: { ...access, ...(actor ? staffOrderScope(actor) : {}) },
      select: {
        id: true,
        status: true,
        items: { select: { unitPrice: true, quantity: true } },
      },
    });
    if (!order)
      throw new NotFoundException(
        'Order could not be found with those details.',
      );
    return order;
  }

  private async amounts(
    db: Prisma.TransactionClient,
    order: Awaited<ReturnType<OrderConversationService['order']>>,
  ) {
    const summary = await db.paymentReceipt.aggregate({
      where: { orderId: order.id, status: 'APPROVED' },
      _sum: { amount: true },
    });
    return paymentAmounts(
      orderTotal(order.items),
      roundedCents(summary._sum.amount?.toFixed(2) ?? '0'),
    );
  }

  async conversation(access: Access) {
    const db = this.prisma.database;
    const order = await this.order(db, access);
    const [messages, receipts, totals] = await Promise.all([
      db.orderMessage.findMany({
        where: { orderId: order.id },
        select: { id: true, sender: true, text: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      db.paymentReceipt.findMany({
        where: { orderId: order.id },
        select: receiptDetails,
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      }),
      this.amounts(db, order),
    ]);
    return {
      status: order.status,
      messages,
      receipts,
      orderTotal: php(totals.due),
      minimumDeposit: php(totals.deposit),
      verifiedTotal: php(totals.verified),
      remainingBalance: php(totals.due - totals.verified),
      depositMet: totals.verified >= totals.deposit,
      paidInFull: totals.verified >= totals.due,
    };
  }

  async message(access: Access, body: unknown, staffUserId?: string) {
    const { text } = (body ?? {}) as Record<string, unknown>;
    const message = textField(
      text,
      2000,
      'Enter a message of up to 2,000 characters.',
    );
    await this.prisma.database.$transaction(async (db) => {
      const order = await this.order(db, access);
      await db.orderMessage.create({
        data: {
          orderId: order.id,
          sender: staffUserId ? 'ADMIN' : 'CUSTOMER',
          text: message,
        },
        select: { id: true },
      });
      if (staffUserId)
        await db.staffAudit.create({
          data: { staffUserId, orderId: order.id, action: 'ADMIN_REPLY' },
          select: { id: true },
        });
    });
  }

  async upload(access: Access, file?: { buffer: Buffer }) {
    if (!file) throw new BadRequestException('Choose a receipt image.');
    const contentType = receiptImage(file.buffer);
    try {
      return await this.prisma.database.$transaction(async (db) => {
        const order = await this.lock(db, access);
        if (
          !['AWAITING_PAYMENT', 'ACCEPTED', 'PROCESSING', 'READY'].includes(
            order.status,
          )
        )
          throw new ConflictException(
            'Payment evidence is only accepted for confirmed orders before completion.',
          );
        return db.paymentReceipt.create({
          data: {
            orderId: order.id,
            content: new Uint8Array(file.buffer),
            contentType,
            imageHash: createHash('sha256').update(file.buffer).digest('hex'),
          },
          select: receiptDetails,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'This receipt image has already been submitted.',
        );
      throw error;
    }
  }

  async image(access: Access, id: string) {
    const db = this.prisma.database;
    const order = await this.order(db, access);
    const receipt = await db.paymentReceipt.findUnique({
      where: { id: receiptId(id), orderId: order.id },
      select: { content: true, contentType: true },
    });
    if (!receipt) throw new NotFoundException('Receipt not found.');
    return receipt;
  }

  // Payment writes, acceptance and release take the same order lock.
  private async lock(
    db: Prisma.TransactionClient,
    access: Access,
    actor?: StaffActor,
  ) {
    const credential = access.accessHash
      ? Prisma.sql`AND "accessHash" = ${access.accessHash}`
      : Prisma.empty;
    await db.$queryRaw`SELECT id FROM "public"."CustomerOrder"
      WHERE reference = ${access.reference} ${credential} FOR UPDATE`;
    return this.order(db, access, actor);
  }

  async verify(
    staffUserId: string,
    reference: string,
    id: string,
    body: unknown,
  ) {
    const { decision, reason, amount, paymentReference, fundsReceived } =
      (body ?? {}) as Record<string, unknown>;
    if (decision !== 'approve' && decision !== 'reject')
      throw new BadRequestException('Choose approve or reject.');
    const rejected = decision === 'reject';
    const rejectionReason = rejected
      ? textField(
          reason,
          500,
          'Enter a rejection reason of up to 500 characters.',
        )
      : null;
    const cents = rejected ? null : enteredCents(amount);
    const paymentId =
      typeof paymentReference === 'string'
        ? paymentReference.trim().toUpperCase()
        : '';
    if (
      !rejected &&
      (fundsReceived !== true || !/^[A-Z0-9-]{4,80}$/.test(paymentId))
    )
      throw new BadRequestException(
        'Confirm actual funds received and enter the external payment reference.',
      );

    try {
      await this.prisma.database.$transaction(async (db) => {
        const order = await this.lock(db, { reference });
        const receipt = await db.paymentReceipt.findUnique({
          where: { id: receiptId(id), orderId: order.id },
          select: { status: true },
        });
        if (!receipt) throw new NotFoundException('Receipt not found.');
        if (receipt.status !== 'PENDING_VERIFICATION')
          throw new ConflictException(
            'This receipt has already been verified.',
          );
        if (cents !== null) {
          const totals = await this.amounts(db, order);
          if (totals.verified + cents > totals.due)
            throw new BadRequestException(
              'The verified amount exceeds the remaining order balance.',
            );
        }
        if (rejected) {
          await db.$executeRaw`UPDATE "public"."PaymentReceipt"
            SET status = 'REJECTED', "verifiedAt" = CURRENT_TIMESTAMP, "rejectionReason" = ${rejectionReason}
            WHERE id = ${id}::uuid`;
        } else if (cents !== null) {
          await db.$executeRaw`UPDATE "public"."PaymentReceipt"
            SET status = 'APPROVED', "verifiedAt" = CURRENT_TIMESTAMP, amount = ${php(cents)}::numeric, "paymentReference" = ${paymentId}
            WHERE id = ${id}::uuid`;
        }
        await db.staffAudit.create({
          data: {
            staffUserId,
            orderId: order.id,
            receiptId: id,
            action: rejected ? 'RECEIPT_REJECTED' : 'RECEIPT_APPROVED',
          },
          select: { id: true },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2010'
      ) {
        const adapterError = error.meta?.['driverAdapterError'] as
          { cause?: { originalCode?: string } } | undefined;
        if (adapterError?.cause?.originalCode === '23505')
          throw new ConflictException(
            'This external payment reference has already been counted.',
          );
      }
      throw error;
    }
  }

  async accept(staffUserId: string, reference: string, body: unknown) {
    const { manualStockChecked } = (body ?? {}) as Record<string, unknown>;
    if (manualStockChecked !== true)
      throw new BadRequestException('Confirm the final manual stock check.');
    await this.prisma.database.$transaction(async (db) => {
      const order = await this.lock(db, { reference });
      if (order.status !== 'AWAITING_PAYMENT')
        throw new ConflictException(
          'Only confirmed orders awaiting payment can be accepted.',
        );
      const totals = await this.amounts(db, order);
      if (totals.verified < totals.deposit)
        throw new ConflictException(
          'At least 50% of the order total must be verified before acceptance.',
        );
      await db.$executeRaw`UPDATE "public"."CustomerOrder" SET status = 'ACCEPTED', "acceptedAt" = CURRENT_TIMESTAMP
        WHERE id = ${order.id}::uuid`;
      await db.staffAudit.create({
        data: { staffUserId, orderId: order.id, action: 'ORDER_ACCEPTED' },
        select: { id: true },
      });
    });
  }

  async progress(access: Access, actor?: StaffActor) {
    const db = this.prisma.database;
    const order = await this.order(db, access, actor);
    // Format UTC in PostgreSQL to avoid the adapter's session-zone timestamp conversion.
    return db.$queryRaw<{ status: OrderStatus; occurredAt: string }[]>`
      SELECT "status",
        to_char("occurredAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "occurredAt"
      FROM (
        SELECT 'ACCEPTED'::"public"."OrderStatus" AS "status", "acceptedAt" AS "occurredAt"
        FROM "public"."CustomerOrder" WHERE id = ${order.id}::uuid AND "acceptedAt" IS NOT NULL
        UNION ALL
        SELECT "toStatus", "occurredAt" FROM "public"."OrderStatusChange" WHERE "orderId" = ${order.id}::uuid
      ) AS milestones
      ORDER BY "status"
    `;
  }

  async advance(actor: StaffActor, reference: string, body: unknown) {
    const { action } = (body ?? {}) as Record<string, unknown>;
    if (action !== 'start' && action !== 'ready' && action !== 'complete')
      throw new BadRequestException('Choose a valid production action.');
    if (action === 'complete' && actor.role !== 'OWNER_ADMIN')
      throw new ForbiddenException('Only Owner/Admin can release an order.');
    const { from, to, audit } = production[action];
    await this.prisma.database.$transaction(async (db) => {
      const order = await this.lock(db, { reference }, actor);
      if (order.status !== from)
        throw new ConflictException(
          'This action is unavailable in the current order status. Refresh the order.',
        );
      if (action === 'complete') {
        const totals = await this.amounts(db, order);
        if (totals.verified < totals.due)
          throw new ConflictException(
            'Full verified payment is required before release.',
          );
      }
      const changed = await db.$executeRaw`
        WITH changed AS (
          UPDATE "public"."CustomerOrder" SET status = ${to}::"public"."OrderStatus"
          WHERE id = ${order.id}::uuid AND status = ${from}::"public"."OrderStatus"
          RETURNING id
        )
        INSERT INTO "public"."OrderStatusChange" (id, "orderId", "fromStatus", "toStatus", "occurredAt")
        SELECT ${randomUUID()}::uuid, id, ${from}::"public"."OrderStatus",
          ${to}::"public"."OrderStatus", clock_timestamp() FROM changed
      `;
      if (changed !== 1)
        throw new ConflictException('Order status changed. Refresh the order.');
      await db.staffAudit.create({
        data: { staffUserId: actor.id, orderId: order.id, action: audit },
        select: { id: true },
      });
    });
    return { status: to };
  }
}
