"use client";

import Link from "next/link";
import { StoreHeader } from "../store-header";
import { money, priceUnits, useCart } from "../cart-context";

export default function CartPage() {
  const { lines, products, loading, error, storageWarning, change, remove } =
    useCart();
  const unavailable = lines.some(
    (line) => !products.some((product) => product.id === line.productId),
  );
  const invalid = lines.some((line) => {
    const product = products.find((product) => product.id === line.productId);
    return product && line.quantity < product.minimumOrderQuantity;
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
  return (
    <>
      <StoreHeader />
      <main className="cart-page">
        <p className="eyebrow">YOUR IDEAS, TOGETHER</p>
        <h1>Your print cart.</h1>
        <p>Review your quantities before sending your request.</p>
        {storageWarning && <p role="status">{storageWarning}</p>}
        {loading ? (
          <p role="status">Loading your cart…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : !lines.length ? (
          <div className="empty-state">
            <h2>A little room for your ideas.</h2>
            <p>Add a print to get started.</p>
            <Link className="button" href="/#catalog">
              Explore products
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-layout">
              <div className="cart-lines">
                {lines.map((line) => {
                  const product = products.find(
                    (product) => product.id === line.productId,
                  );
                  return (
                    <article className="cart-item" key={line.productId}>
                      <div>
                        <h2>{product?.name || "Unavailable product"}</h2>
                        {product ? (
                          <>
                            <p>
                              {money(priceUnits(product.unitPrice))} per{" "}
                              {product.sellingUnitLabel}
                            </p>
                            <p className="hint">
                              Minimum {product.minimumOrderQuantity}{" "}
                              {product.sellingUnitLabel}
                            </p>
                          </>
                        ) : (
                          <p role="alert">
                            This product is no longer available. Remove it to
                            continue.
                          </p>
                        )}
                      </div>
                      <label>
                        Quantity
                        <input
                          type="number"
                          min={product?.minimumOrderQuantity || 1}
                          max={2147483647}
                          key={line.quantity}
                          defaultValue={line.quantity}
                          disabled={!product}
                          onBlur={(event) => {
                            const quantity = Number(event.target.value);
                            const next =
                              Number.isInteger(quantity) &&
                              quantity <= 2147483647
                                ? Math.max(
                                    product!.minimumOrderQuantity,
                                    quantity,
                                  )
                                : line.quantity;
                            event.target.value = String(next);
                            change(line.productId, next);
                          }}
                        />
                      </label>
                      {product &&
                        line.quantity < product.minimumOrderQuantity && (
                          <p role="alert">
                            Increase this item to the current minimum quantity.
                          </p>
                        )}
                      {product && (
                        <strong>
                          {money(
                            priceUnits(product.unitPrice) *
                              BigInt(line.quantity),
                          )}
                        </strong>
                      )}
                      <button
                        type="button"
                        className="remove-item"
                        onClick={() => remove(line.productId)}
                      >
                        Remove {product?.name || "product"}
                      </button>
                    </article>
                  );
                })}
              </div>
              <aside className="cart-summary">
                <h2>Request summary</h2>
                <p>
                  {lines.length} products ·{" "}
                  {lines.reduce((sum, line) => sum + line.quantity, 0)} items
                </p>
                <div className="summary-total">
                  <span>Estimated total</span>
                  <strong>{money(total)}</strong>
                </div>
                <p>
                  Our team reviews availability first. You confirm the final
                  details before payment.
                </p>
                {!unavailable && !invalid ? (
                  <Link className="button" href="/checkout">
                    Continue to checkout →
                  </Link>
                ) : (
                  <p role="alert">Update your cart before continuing.</p>
                )}
              </aside>
            </div>
          </>
        )}
        <Link className="text-link" href="/#catalog">
          ← Continue shopping
        </Link>
      </main>
    </>
  );
}
