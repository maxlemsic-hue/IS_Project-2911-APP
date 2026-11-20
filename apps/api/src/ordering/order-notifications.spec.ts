import { NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PrismaService } from '../prisma/prisma.service.js';
import { OrderNotificationsService } from './order-notifications.service.js';

describe('Private order notifications', () => {
  const id = '561ad526-2bd1-4abd-86e3-2d47aa8cc73b';
  const orderId = 'c2d8342f-70af-44c3-a813-bf01472cc1db';
  const reference = `T29-${orderId}`;
  const code = 'a'.repeat(43);
  const auth = `Bearer ${code}`;
  const db = {
    customerOrder: { findUnique: vi.fn() },
    orderNotification: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  };
  const service = new OrderNotificationsService({
    database: db,
  } as unknown as PrismaService);

  beforeEach(() => {
    vi.resetAllMocks();
    db.customerOrder.findUnique.mockResolvedValue({ id: orderId });
  });

  it('rejects missing credentials without querying', async () => {
    await expect(service.list(reference)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(db.customerOrder.findUnique).not.toHaveBeenCalled();
  });

  it('never lists notifications for an unrelated credential', async () => {
    db.customerOrder.findUnique.mockResolvedValue(null);
    await expect(service.list(reference, auth)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('scopes lookup by the hashed access code and counts only unread items', async () => {
    const notifications = [{ read: true }, { read: false }, { read: false }];
    db.$queryRaw.mockResolvedValue(notifications);
    await expect(service.list(reference, auth)).resolves.toEqual({
      notifications,
      unreadCount: 2,
    });
    expect(db.customerOrder.findUnique).toHaveBeenCalledWith({
      where: {
        reference,
        accessHash: createHash('sha256').update(code).digest('hex'),
      },
      select: { id: true },
    });
  });

  it('treats an already-read notification as success without changing its timestamp', async () => {
    db.$executeRaw.mockResolvedValue(0);
    db.orderNotification.findUnique.mockResolvedValue({ id });
    await expect(
      service.markRead(reference, id, auth),
    ).resolves.toBeUndefined();
    const [parts, paramId, paramOrder] = db.$executeRaw.mock.calls[0] as [
      TemplateStringsArray,
      string,
      string,
    ];
    expect([paramId, paramOrder]).toEqual([id, orderId]);
    expect(parts.join('')).toContain('"readAt" IS NULL');
    expect(db.orderNotification.findUnique).toHaveBeenCalledWith({
      where: { id, orderId },
      select: { id: true },
    });
  });

  it('rejects notification IDs that do not belong to the authenticated order', async () => {
    db.$executeRaw.mockResolvedValue(0);
    db.orderNotification.findUnique.mockResolvedValue(null);
    await expect(service.markRead(reference, id, auth)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
