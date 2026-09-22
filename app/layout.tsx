import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkulGo",
  description: "Transparent and Secure Records",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
