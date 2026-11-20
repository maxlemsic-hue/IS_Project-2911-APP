"use client";

import { useState } from "react";
import { statusLabels, type OrderStatus } from "./order-status";

const api = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"
).replace(/\/$/, "");
type Milestone = { status: OrderStatus; occurredAt: string };

export function OrderProgress({
  reference,
  accessCode,
  onStatus,
}: {
  reference: string;
  accessCode: string;
  onStatus: (status: OrderStatus) => void;
}) {
  const [history, setHistory] = useState<Milestone[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `${api}/orders/${encodeURIComponent(reference)}/progress`,
        {
          cache: "no-store",
          headers: { Authorization: `Bearer ${accessCode}` },
        },
      );
      if (!response.ok) throw new Error("Could not load production progress.");
      const entries = (await response.json()) as Milestone[];
      setHistory(entries);
      const latest = entries.at(-1);
      if (latest) onStatus(latest.status);
    } catch {
      setError("Could not load production progress.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="conversation">
      <h4>Production progress</h4>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {history ? "Refresh progress" : "View progress"}
      </button>
      {history &&
        (history.length ? (
          <ol>
            {history.map((entry) => (
              <li key={entry.status}>
                <strong>{statusLabels[entry.status]}</strong>{" "}
                <time dateTime={entry.occurredAt}>
                  {new Date(entry.occurredAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p>Production milestones appear after Admin accepts the order.</p>
        ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
