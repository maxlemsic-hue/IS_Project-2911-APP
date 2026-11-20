import { Injectable, NotFoundException } from '@nestjs/common';
import type { OrderNotificationKind } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { privateOrderAccess } from './ordering.service.js';

type Notification = {
  id: string;
  kind: OrderNotificationKind;
  createdAt: string;
  read: boolean;
};

@Injectable()
export class OrderNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async orderId(reference: string, auth?: string) {
    const access = privateOrderAccess(reference, auth);
    const order = await this.prisma.database.customerOrder.findUnique({
      where: access,
      select: { id: true },
    });
    if (!order)
      throw new NotFoundException(
        'Order could not be found with those details.',
      );
    return order.id;
  }

  async list(reference: string, auth?: string) {
    const orderId = await this.orderId(reference, auth);
    const notifications = await this.prisma.database.$queryRaw<Notification[]>`
      SELECT id, kind, "readAt" IS NOT NULL AS read,
        to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
      FROM "public"."OrderNotification" n WHERE "orderId" = ${orderId}::uuid
      ORDER BY n."createdAt" DESC, id DESC
    `;
    return {
      notifications,
      unreadCount: notifications.filter((entry) => !entry.read).length,
    };
  }

  async markRead(reference: string, id: string, auth?: string) {
    const orderId = await this.orderId(reference, auth);
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
      throw new NotFoundException('Notification not found.');
    const db = this.prisma.database;
    const changed = await db.$executeRaw`
      UPDATE "public"."OrderNotification" SET "readAt" = clock_timestamp()
      WHERE id = ${id}::uuid AND "orderId" = ${orderId}::uuid AND "readAt" IS NULL
    `;
    if (
      !changed &&
      !(await db.orderNotification.findUnique({
        where: { id, orderId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Notification not found.');
  }
}
