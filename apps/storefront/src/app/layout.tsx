import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "./cart-context";
export const metadata: Metadata = {
  title: "TWENTY9 ELEVEN | Printing Services",
  description:
    "Browse printing products and submit an order request to TWENTY9 ELEVEN.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
