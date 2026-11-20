"use client";

import { useEffect, useState, type FormEvent } from "react";
import { canUploadReceipt, type OrderStatus } from "./order-status";

const api = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"
).replace(/\/$/, "");
const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
const labels = {
  PENDING_VERIFICATION: "Pending Verification",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
type Receipt = {
  id: string;
  status: keyof typeof labels;
  amount: `${number}` | null;
  rejectionReason: string | null;
  contentType: string;
};
type Conversation = {
  status: OrderStatus;
  messages: { id: string; sender: "CUSTOMER" | "ADMIN"; text: string }[];
  receipts: Receipt[];
  orderTotal: `${number}`;
  minimumDeposit: `${number}`;
  verifiedTotal: `${number}`;
  remainingBalance: `${number}`;
  paidInFull: boolean;
};

export function OrderConversation({
  reference,
  accessCode,
  orderStatus,
  onStatus,
}: {
  reference: string;
  accessCode: string;
  orderStatus: OrderStatus;
  onStatus: (status: OrderStatus) => void;
}) {
  const [data, setData] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const url = `${api}/orders/${encodeURIComponent(reference)}`;

  async function request(path: string, options?: RequestInit) {
    const response = await fetch(url + path, {
      cache: "no-store",
      ...options,
      headers: { Authorization: `Bearer ${accessCode}`, ...options?.headers },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: unknown;
      } | null;
      throw new Error(
        response.status < 500 && typeof body?.message === "string"
          ? body.message
          : "Could not access the order conversation.",
      );
    }
    return response;
  }

  async function refresh() {
    const conversation = (await (
      await request("/conversation")
    ).json()) as Conversation;
    setData(conversation);
    onStatus(conversation.status);
  }

  async function perform(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Conversation request failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void perform(async () => {
      await request("/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });
      setMessage("");
      await refresh();
    });
  }

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    void perform(async () => {
      await request("/receipts", { method: "POST", body });
      form.reset();
      await refresh();
    });
  }

  async function view(id: string) {
    await perform(async () => {
      const image = await (
        await request(`/receipts/${encodeURIComponent(id)}`)
      ).blob();
      setImageUrl(URL.createObjectURL(image));
    });
  }

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );
  const uploadsEnabled = canUploadReceipt(orderStatus);

  return (
    <div className="conversation" id="order-chat">
      <h4>Order chat and payment evidence</h4>
      <button
        type="button"
        disabled={busy}
        onClick={() => void perform(refresh)}
      >
        {data ? "Refresh chat" : "Open chat"}
      </button>
      {data && (
        <>
          <p>
            Order total {money.format(data.orderTotal)} · Minimum 50% deposit{" "}
            {money.format(data.minimumDeposit)}
          </p>
          <p>
            Verified {money.format(data.verifiedTotal)} · Balance{" "}
            {money.format(data.remainingBalance)}
          </p>
          {data.paidInFull ? (
            <p>Full payment verified.</p>
          ) : (
            <p>Full verified payment is required before release.</p>
          )}
          <ul>
            {data.messages.map((entry) => (
              <li key={entry.id}>
                <strong>
                  {entry.sender === "ADMIN" ? "Admin" : "Customer"}
                </strong>{" "}
                {entry.text}
              </li>
            ))}
          </ul>
          <form onSubmit={send}>
            <label>
              Message{" "}
              <textarea
                required
                maxLength={2000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
            <button disabled={busy}>Send message</button>
          </form>
          <h4>Payment receipts</h4>
          <p>
            Pay outside the system. Uploading a receipt submits evidence for
            manual verification.
          </p>
          <ul>
            {data.receipts.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void view(entry.id)}
                >
                  View receipt
                </button>{" "}
                {labels[entry.status]}{" "}
                {entry.amount && money.format(entry.amount)}{" "}
                {entry.rejectionReason && (
                  <span>· {entry.rejectionReason}</span>
                )}
              </li>
            ))}
          </ul>
          {imageUrl && (
            <p>
              <a href={imageUrl} target="_blank" rel="noreferrer">
                Open receipt image
              </a>
            </p>
          )}
          {uploadsEnabled && (
            <form onSubmit={upload}>
              <label>
                Receipt image (PNG or JPEG, up to 5 MB){" "}
                <input
                  name="receipt"
                  type="file"
                  accept="image/png,image/jpeg"
                  required
                />
              </label>
              <button disabled={busy}>Submit receipt</button>
            </form>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
