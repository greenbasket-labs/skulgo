import type { Metadata } from "next";
import "./globals.css";
import OfflineStatus from "@/components/offline-status";

export const metadata: Metadata = {
  title: "SkulGo",
  description: "Transparent and Secure Records",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}<OfflineStatus /></body></html>;
}
