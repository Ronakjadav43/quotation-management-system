import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Quotation Management System",
  description: "Electrical Services Quotation Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full bg-gray-50 font-sans">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
