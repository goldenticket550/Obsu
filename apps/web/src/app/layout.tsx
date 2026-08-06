import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import type { OrganizationVertical } from "@/lib/vertical-routing";

export const metadata: Metadata = { title: "OBSIDIAN", description: "Your Business. Our A.I. � a secure operating assistant for service businesses.", applicationName: "OBSIDIAN" };
export const viewport: Viewport = { themeColor: "#08090b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const vertical: OrganizationVertical = headers().get("x-obsidian-vertical") === "beauty" ? "beauty" : "rides";
  return <html lang="en"><body className="min-h-screen font-sans"><AppShell vertical={vertical}>{children}</AppShell></body></html>;
}
