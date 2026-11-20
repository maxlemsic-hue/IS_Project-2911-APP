"use client";

import Link from "next/link";
import { useCart } from "./cart-context";

export function CartLink() {
  const { lines } = useCart();
  return (
    <Link className="button small" href="/cart">
      Cart ({lines.reduce((sum, line) => sum + line.quantity, 0)})
    </Link>
  );
}
export function StoreHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        TWENTY9
        <span>
          ELEVEN<span className="brand-dot">.</span>
        </span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#catalog">Our products</Link>
        <Link href="/#tracking">Track your order ↗</Link>
      </nav>
      <CartLink />
    </header>
  );
}
