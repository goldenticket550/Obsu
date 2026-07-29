import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "OBSIDIAN RIDES",
  description: "Your Business. Our A.I. — the AI operating assistant for luxury transportation.",
  applicationName: "OBSIDIAN",
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        {/* The shell renders navigation for the signed-in app and gets out of
            the way entirely on /login and /onboarding. It fetches nothing. */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
