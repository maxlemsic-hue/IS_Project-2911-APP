"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { StoreHeader } from "../store-header";
import { api, money, priceUnits, useCart } from "../cart-context";

type Submitted = { reference: string; accessCode: string };
export default function CheckoutPage() {
  const { lines, products, loading, error, storageWarning, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const valid =
    lines.length > 0 &&
    lines.every((line) => {
      const product = products.find((product) => product.id === line.productId);
      return (
        product &&
        Number.isInteger(line.quantity) &&
        line.quantity >= product.minimumOrderQuantity
      );
    });
  const total = lines.reduce((sum, line) => {
    const product = products.find((product) => product.id === line.productId);
    return (
      sum +
      (product
        ? priceUnits(product.unitPrice) * BigInt(line.quantity)
        : BigInt(0))
    );
  }, BigInt(0));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !valid) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setFailure("");
    try {
      const response = await fetch(api + "/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines,
          customerName: data.get("customerName"),
          contactPhone: data.get("contactPhone"),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(
          typeof result.message === "string"
            ? result.message
            : "The request could not be submitted. Review your cart and try again.",
        );
      if (
        typeof result.reference !== "string" ||
        typeof result.accessCode !== "string"
      )
        throw Error(
          "We could not read your order confirmation. Your cart has been kept.",
        );
      setSubmitted({
        reference: result.reference,
        accessCode: result.accessCode,
      });
      clear();
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "The ordering service is unavailable. Your cart has been kept.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <StoreHeader />
      <main className="cart-page">
        <p className="eyebrow">ONE STEP CLOSER TO PRINT</p>
        <h1>{submitted ? "Request received." : "Your order request."}</h1>
        {submitted ? (
          <div className="receipt" role="status">
            <h2>Pending Review</h2>
            <p>
              Save these details now. Your private access code is shown here
              once and cannot be retrieved later.
            </p>
            <dl>
              <dt>Order reference</dt>
              <dd>{submitted.reference}</dd>
              <dt>Private access code</dt>
              <dd>{submitted.accessCode}</dd>
            </dl>
            <p>
              Our team will review your request. You will confirm the details
              before arranging payment.
            </p>
            <Link className="button" href="/#tracking">
              Track your order →
            </Link>
          </div>
        ) : (
          <>
            <p>
              Your request is subject to staff review and final customer
              confirmation. Payment follows confirmation.
            </p>
            {storageWarning && <p role="status">{storageWarning}</p>}
            {loading ? (
              <p role="status">Preparing your checkout…</p>
            ) : error ? (
              <p role="alert">{error}</p>
            ) : !valid ? (
              <div className="empty-state">
                <h2>Your cart needs a little attention.</h2>
                <p>Add available products and check minimum quantities.</p>
                <Link className="button" href="/cart">
                  Return to cart
                </Link>
              </div>
            ) : (
              <form className="cart-layout checkout-form" onSubmit={submit}>
                <div className="checkout-details">
                  <h2>Your details</h2>
                  <label>
                    Name
                    <input
                      name="customerName"
                      autoComplete="name"
                      required
                      maxLength={100}
                      disabled={busy}
                    />
                  </label>
                  <label>
                    Contact number
                    <input
                      name="contactPhone"
                      type="tel"
                      autoComplete="tel"
                      required
                      maxLength={24}
                      disabled={busy}
                    />
                  </label>
                  <p className="hint">
                    Keep your private order details safe. You will use them to
                    track progress and chat with our team.
                  </p>
                  {failure && <p role="alert">{failure}</p>}
                </div>
                <aside className="cart-summary">
                  <h2>Your prints</h2>
                  {lines.map((line) => {
                    const product = products.find(
                      (product) => product.id === line.productId,
                    )!;
                    return (
                      <div className="checkout-line" key={line.productId}>
                        <strong>{product.name}</strong>
                        <span>
                          {line.quantity} ×{" "}
                          {money(priceUnits(product.unitPrice))} /{" "}
                          {product.sellingUnitLabel}
                        </span>
                        <span>
                          {money(
                            priceUnits(product.unitPrice) *
                              BigInt(line.quantity),
                          )}
                        </span>
                      </div>
                    );
                  })}
                  <div className="summary-total">
                    <span>Estimated total</span>
                    <strong>{money(total)}</strong>
                  </div>
                  <p>
                    Availability and final details are reviewed by our team.
                  </p>
                  <button disabled={busy}>
                    {busy ? "Submitting request…" : "Submit order request"}
                  </button>
                </aside>
              </form>
            )}
            {!busy && (
              <Link className="text-link" href="/cart">
                ← Return to cart
              </Link>
            )}
          </>
        )}
      </main>
    </>
  );
}
