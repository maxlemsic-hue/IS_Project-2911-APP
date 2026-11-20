"use client";

import { useState, type FormEvent } from "react";
import { useCart } from "./cart-context";
import { CartLink } from "./store-header";
import Link from "next/link";
import { ProductArtwork } from "./product-artwork";
import { OrderConversation } from "./order-conversation";
import { OrderProgress } from "./order-progress";
import { OrderNotifications } from "./order-notifications";
import { productionRank, statusLabels, type OrderStatus } from "./order-status";

type SavedOrder = {
  reference: string;
  status: OrderStatus;
  items: {
    productName: string;
    productSku: string;
    quantity: number;
    sellingUnit: string;
    unitPrice: `${number}`;
  }[];
};

type OrderDetails = SavedOrder & { orderTotal: `${number}` };

const api = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"
).replace(/\/$/, "");
const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 4,
});

async function request<T>(
  path: string,
  signalMessage: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(api + path, { cache: "no-store", ...options });
  } catch {
    throw new Error("The ordering service is unavailable. Try again shortly.");
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      message?: unknown;
    } | null;
    throw new Error(
      response.status < 500 && typeof error?.message === "string"
        ? error.message
        : signalMessage,
    );
  }
  return response.json() as Promise<T>;
}

export default function Home() {
  const { products, loading, error: catalogError, lines, change } = useCart();
  const [added, setAdded] = useState("");
  const [category, setCategory] = useState("All products");
  const categories = [
    "All products",
    ...new Set(products.map((entry) => entry.category.name)),
  ];
  const visibleProducts =
    category === "All products"
      ? products
      : products.filter((entry) => entry.category.name === category);
  const [lookupError, setLookupError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [viewed, setViewed] = useState<
    (OrderDetails & { accessCode: string }) | null
  >(null);
  const [reference, setReference] = useState("");
  const [code, setCode] = useState("");

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lookingUp || confirming) return;
    setViewed(null);
    setLookupError("");
    setConfirmError("");
    setLookingUp(true);
    const accessCode = code.trim();
    try {
      const order = await request<OrderDetails>(
        `/orders/${encodeURIComponent(reference.trim())}`,
        "Order could not be retrieved.",
        { headers: { Authorization: `Bearer ${accessCode}` } },
      );
      setViewed({ ...order, accessCode });
    } catch (error) {
      setLookupError(
        error instanceof Error
          ? error.message
          : "Order could not be retrieved.",
      );
    } finally {
      setLookingUp(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      lookingUp ||
      confirming ||
      viewed?.status !== "AVAILABLE_FOR_CONFIRMATION" ||
      !new FormData(event.currentTarget).has("confirm")
    )
      return;
    setConfirmError("");
    setConfirming(true);
    try {
      const { reference, accessCode } = viewed;
      const order = await request<OrderDetails>(
        `/orders/${encodeURIComponent(reference)}/confirm`,
        "Order could not be confirmed.",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessCode}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirm: true }),
        },
      );
      setViewed({ ...order, accessCode });
    } catch (error) {
      setConfirmError(
        error instanceof Error
          ? error.message
          : "Order could not be confirmed.",
      );
    } finally {
      setConfirming(false);
    }
  }

  function showStatus(reference: string, status: OrderStatus) {
    setViewed((order) =>
      order?.reference === reference &&
      productionRank(status) >= productionRank(order.status)
        ? { ...order, status }
        : order,
    );
  }

  return (
    <>
      <a className="skip-link" href="#catalog">
        Skip to products
      </a>
      <div className="announcement">
        Made for your ideas. Printed with care.
      </div>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Twenty9 Eleven home">
          TWENTY9
          <span>
            ELEVEN<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#catalog">Our products</a>
          <a href="#how-it-works">How to order</a>
          <a href="#tracking">
            Track your order <span aria-hidden="true">↗</span>
          </a>
        </nav>
        <CartLink />
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">YOUR IDEAS. IN PRINT.</p>
            <h1 id="hero-title">
              Small details.
              <br />
              Big <em>impressions.</em>
            </h1>
            <p>
              Bring a little more you to every occasion. Discover prints for
              your celebrations, your business, and everything in between.
            </p>
            <div className="hero-actions">
              <a className="button" href="#catalog">
                Explore our products <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href="#how-it-works">
                How it works
              </a>
            </div>
            <p className="hero-note">
              Choose your print. We’ll review the details together.
            </p>
          </div>
          <div
            className="print-scene"
            role="img"
            aria-label="Illustrative printed stationery in coral, cream and green"
          >
            <div className="scene-caption">A LITTLE INSPIRATION, ON PAPER.</div>
            <div className="poster poster-back">
              <span>
                MAKE
                <br />
                SOMETHING
                <br />
                <em>matter.</em>
              </span>
              <small>TWENTY9 ELEVEN / PRINT STUDIO</small>
            </div>
            <div className="poster poster-front">
              <span className="poster-flower" aria-hidden="true">
                ✳
              </span>
              <span>
                good things
                <br />
                <em>start here.</em>
              </span>
              <small>YOUR NEXT IDEA, BEAUTIFULLY PRINTED.</small>
            </div>
            <div className="scene-seal">
              ideas
              <br />
              made real ↗
            </div>
          </div>
        </section>
        <section
          id="how-it-works"
          className="workflow"
          aria-label="How ordering works"
        >
          <div>
            <strong>Find your print</strong>
            <p>Choose a product and send your request.</p>
          </div>
          <div>
            <strong>Let’s get it right</strong>
            <p>We review availability. You confirm the details.</p>
          </div>
          <div>
            <strong>Pay, then we print</strong>
            <p>Submit your receipt after confirmation.</p>
          </div>
        </section>
        <section
          id="catalog"
          className="catalog"
          aria-labelledby="products-heading"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE PRINT COLLECTION</p>
              <h2 id="products-heading">Something for every idea.</h2>
            </div>
            <p>
              Explore our available prints.
              <br />
              Made personal, from the first detail.
            </p>
          </div>
          <div
            className="category-tabs"
            role="group"
            aria-label="Filter products by category"
          >
            {categories.map((name) => (
              <button
                type="button"
                key={name}
                aria-pressed={category === name}
                onClick={() => setCategory(name)}
              >
                {name}
              </button>
            ))}
          </div>
          {loading && (
            <div className="loading-state" role="status">
              <span className="loading-dot" />
              Loading the print collection…
            </div>
          )}
          {catalogError && <p role="alert">{catalogError}</p>}
          {!loading && !catalogError && products.length === 0 && (
            <div className="empty-state">
              <h3>Our collection is being prepared.</h3>
              <p>Please check back soon for available products.</p>
            </div>
          )}
          {products.length > 0 && (
            <div>
              <fieldset>
                <legend className="sr-only">Select a product</legend>
                <div className="product-grid">
                  {visibleProducts.map((entry, index) => (
                    <article className="product" key={entry.id}>
                      <ProductArtwork productId={entry.id} index={index} />
                      <span className="product-copy">
                        <span className="product-category">
                          {entry.category.name}
                        </span>
                        <strong>{entry.name}</strong>

                        {entry.specificationText && (
                          <span>{entry.specificationText}</span>
                        )}
                        <span className="product-price">
                          {currency.format(entry.unitPrice)} per{" "}
                          {entry.sellingUnitLabel}
                        </span>
                        <span className="product-minimum">
                          Minimum {entry.minimumOrderQuantity}{" "}
                          {entry.sellingUnitLabel}
                        </span>
                        <button
                          type="button"
                          className="add-product"
                          onClick={() => {
                            const existing = lines.find(
                              (line) => line.productId === entry.id,
                            );
                            change(
                              entry.id,
                              (existing?.quantity || 0) +
                                entry.minimumOrderQuantity,
                            );
                            setAdded(entry.name + " added to your cart.");
                          }}
                        >
                          Add to cart ↗
                        </button>
                      </span>
                    </article>
                  ))}
                </div>
              </fieldset>
              <div className="request-panel" id="request">
                <div className="request-intro">
                  <p className="eyebrow">LET’S MAKE IT HAPPEN</p>
                  <h2>Make it yours.</h2>
                  <p>
                    Adjust quantities in your cart. Our team will review the
                    request before you confirm and arrange payment.
                  </p>
                </div>
                <div className="request-fields">
                  {added && <p role="status">{added}</p>}
                  <Link className="button" href="/cart">
                    Review cart ({lines.length} products) →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
        <section
          id="tracking"
          className="tracking"
          aria-labelledby="find-heading"
        >
          <p className="eyebrow">FROM FIRST IDEA TO FINAL PRINT</p>
          <h2 id="find-heading">Your order, at a glance.</h2>
          <p>
            Use your private reference and access code to follow progress, chat
            with our team, and send payment receipts.
          </p>
          <form onSubmit={lookup}>
            <label>
              Order reference{" "}
              <input
                required
                maxLength={40}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </label>
            <label>
              Private access code{" "}
              <input
                type="password"
                autoComplete="off"
                required
                maxLength={43}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            {lookupError && <p role="alert">{lookupError}</p>}
            <button disabled={lookingUp || confirming}>
              {lookingUp ? "Looking up…" : "View order"}
            </button>
          </form>
          {viewed && (
            <div className="receipt" aria-live="polite">
              <h3>{statusLabels[viewed.status]}</h3>
              {productionRank(viewed.status) > 0 && (
                <p>
                  Order changes and cancellations are closed once production
                  starts.
                </p>
              )}
              <p>{viewed.reference}</p>
              <ul>
                {viewed.items.map((item) => (
                  <li key={item.productSku}>
                    {item.productName} · {item.quantity} ×{" "}
                    {currency.format(item.unitPrice)} per {item.sellingUnit}
                  </li>
                ))}
              </ul>
              <p>
                <strong>
                  Order total {currency.format(viewed.orderTotal)}
                </strong>
              </p>
              {viewed.status === "AVAILABLE_FOR_CONFIRMATION" && (
                <form onSubmit={confirm}>
                  <label className="confirmation">
                    <input type="checkbox" name="confirm" required />I reviewed
                    the details and confirm this order.
                  </label>
                  <button disabled={confirming || lookingUp}>
                    {confirming ? "Confirming…" : "Confirm order"}
                  </button>
                </form>
              )}
              {confirmError && <p role="alert">{confirmError}</p>}
              <OrderNotifications
                key={`notifications:${viewed.reference}`}
                reference={viewed.reference}
                accessCode={viewed.accessCode}
              />
              <OrderProgress
                key={`progress:${viewed.reference}`}
                reference={viewed.reference}
                accessCode={viewed.accessCode}
                onStatus={(status) => showStatus(viewed.reference, status)}
              />
              <OrderConversation
                key={`chat:${viewed.reference}`}
                reference={viewed.reference}
                accessCode={viewed.accessCode}
                orderStatus={viewed.status}
                onStatus={(status) => showStatus(viewed.reference, status)}
              />
            </div>
          )}
        </section>
      </main>
      <footer className="site-footer">
        <a className="brand" href="#">
          TWENTY9<span>ELEVEN.</span>
        </a>
        <p>Thoughtful prints. Personal touches.</p>
        <nav aria-label="Footer navigation">
          <a href="#catalog">Explore products</a>
          <a href="#tracking">Track an order</a>
        </nav>
        <small>© TWENTY9 ELEVEN</small>
      </footer>
    </>
  );
}
