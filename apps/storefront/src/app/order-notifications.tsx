"use client";

import { useCallback, useEffect, useState } from "react";

const api = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"
).replace(/\/$/, "");
const labels = {
  ORDER_AVAILABLE: "Your order is available for confirmation.",
  RECEIPT_APPROVED: "Admin verified a payment receipt.",
  RECEIPT_REJECTED: "Admin rejected a payment receipt.",
  ORDER_ACCEPTED: "Admin accepted your order.",
  PRODUCTION_STARTED: "Production started on your order.",
  ORDER_READY: "Your order is ready.",
  ORDER_COMPLETED: "Your order was released and completed.",
  ADMIN_REPLY: "Admin replied in your order chat.",
};
type Notice = {
  id: string;
  kind: keyof typeof labels;
  createdAt: string;
  read: boolean;
};
type NotificationList = { notifications: Notice[]; unreadCount: number };

export function OrderNotifications({
  reference,
  accessCode,
}: {
  reference: string;
  accessCode: string;
}) {
  const [data, setData] = useState<NotificationList | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const url = `${api}/orders/${encodeURIComponent(reference)}/notifications`;
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(url, {
        signal,
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessCode}` },
      });
      if (!response.ok) throw new Error("Could not load notifications.");
      return response.json() as Promise<NotificationList>;
    },
    [url, accessCode],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Could not load notifications.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [load]);

  async function refresh() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setData(await load());
    } catch {
      setError("Could not load notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function markRead(id: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${url}/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessCode}` },
      });
      if (!response.ok) throw new Error();
      setData((current) => {
        if (!current) return current;
        const notifications = current.notifications.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        );
        return {
          notifications,
          unreadCount: notifications.filter((item) => !item.read).length,
        };
      });
    } catch {
      setError("Could not mark the notification as read.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="order-notifications"
      aria-labelledby="notifications-heading"
    >
      <h4 id="notifications-heading">
        Order notifications {data && <span>· {data.unreadCount} unread</span>}
      </h4>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        Refresh notifications
      </button>
      {busy && !data && <p>Loading notifications…</p>}
      {error && <p role="alert">{error}</p>}
      {data &&
        (data.notifications.length ? (
          <ul>
            {data.notifications.map((notice) => (
              <li key={notice.id}>
                <p>
                  {!notice.read && <strong>Unread · </strong>}
                  {labels[notice.kind]}
                </p>
                <time dateTime={notice.createdAt}>
                  {new Date(notice.createdAt).toLocaleString()}
                </time>
                {[
                  "ADMIN_REPLY",
                  "RECEIPT_APPROVED",
                  "RECEIPT_REJECTED",
                ].includes(notice.kind) && <a href="#order-chat">Go to chat</a>}
                {!notice.read && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void markRead(notice.id)}
                  >
                    Mark as read
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No notifications for this order yet.</p>
        ))}
    </section>
  );
}
