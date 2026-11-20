"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Product = {
  id: string;
  name: string;
  specificationText: string | null;
  unitPrice: `${number}`;
  sellingUnitLabel: string;
  minimumOrderQuantity: number;
  category: { name: string };
};
export type CartLine = { productId: string; quantity: number };
export const api = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"
).replace(/\/$/, "");
const storageKey = "twenty9-eleven-cart-v1";
export function priceUnits(price: string) {
  const [whole, fraction = ""] = price.split(".");
  return BigInt(whole) * BigInt(10000) + BigInt(fraction.padEnd(4, "0"));
}
export function money(units: bigint) {
  const value = units.toString().padStart(5, "0");
  const whole = BigInt(value.slice(0, -4)).toLocaleString("en-PH");
  const fraction = value
    .slice(-4)
    .replace(/0{0,2}$/, "")
    .padEnd(2, "0");
  return "₱" + whole + "." + fraction;
}
type CartContextValue = {
  lines: CartLine[];
  products: Product[];
  loading: boolean;
  error: string;
  storageWarning: string;
  change: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved: unknown = JSON.parse(
          localStorage.getItem(storageKey) || "[]",
        );
        if (!Array.isArray(saved) || saved.length > 100) throw Error();
        const seen = new Set<string>();
        const restored: CartLine[] = [];
        for (const item of saved) {
          if (
            !item ||
            typeof item.productId !== "string" ||
            !/^[a-f0-9-]{36}$/i.test(item.productId) ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1 ||
            item.quantity > 2147483647 ||
            seen.has(item.productId.toLowerCase())
          )
            throw Error();
          seen.add(item.productId.toLowerCase());
          restored.push({
            productId: item.productId.toLowerCase(),
            quantity: item.quantity,
          });
        }
        setLines(restored);
      } catch {
        setStorageWarning(
          "Your saved cart could not be restored. You can start a new cart.",
        );
      }
      setHydrated(true);
    });
    fetch(api + "/products", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw Error();
        const data: Product[] = await response.json();
        if (active) setProducts(data);
      })
      .catch(() => {
        if (active)
          setError(
            "The catalog is unavailable. Refresh this page to try again. Your saved cart is kept.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  function save(next: CartLine[]) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setStorageWarning(
        "Browser storage is unavailable. Keep this tab open to retain your cart.",
      );
    }
    setLines(next);
  }
  function change(productId: string, quantity: number) {
    const product = products.find((entry) => entry.id === productId);
    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity < product.minimumOrderQuantity ||
      quantity > 2147483647
    )
      return;
    if (
      !lines.some((line) => line.productId === productId) &&
      lines.length >= 100
    )
      return;
    save(
      lines.some((line) => line.productId === productId)
        ? lines.map((line) =>
            line.productId === productId ? { productId, quantity } : line,
          )
        : [...lines, { productId, quantity }],
    );
  }
  return (
    <CartContext
      value={{
        lines,
        products,
        loading: loading || !hydrated,
        error,
        storageWarning,
        change,
        remove: (id) => save(lines.filter((line) => line.productId !== id)),
        clear: () => save([]),
      }}
    >
      {children}
    </CartContext>
  );
}
export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw Error("CartProvider is required.");
  return cart;
}
