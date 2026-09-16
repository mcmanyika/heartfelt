import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PRODUCT_NAME } from "@/lib/tenant/config";
import { getTenant } from "@/lib/tenant/get-tenant";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  if (tenant) {
    return {
      title: tenant.name,
      description: `Church management for ${tenant.name}.`,
    };
  }

  return {
    title: PRODUCT_NAME,
    description: "Multi-campus church management for every congregation.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
