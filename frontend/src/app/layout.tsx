import "./globals.css";
import type { Metadata } from "next";

import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "Construction ERP",
  description: "لوحة عمليات ERP للمقاولات",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
