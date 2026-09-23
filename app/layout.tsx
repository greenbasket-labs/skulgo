import type { Metadata } from "next";
import "./globals.css";
import OfflineStatus from "@/components/offline-status";
import ServiceWorkerRegister from "@/components/service-worker-register";

export const metadata: Metadata = {
  title: "SkulGo",
  description: "Transparent and Secure Records",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <OfflineStatus />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
