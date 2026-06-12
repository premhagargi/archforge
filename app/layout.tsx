import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_NAME = "ArchForge";
const SITE_DESCRIPTION =
  "Design scalable systems visually. Simulate real traffic with a discrete-event engine, detect architectural bottlenecks with deterministic review rules, and generate production-ready system-design docs — collaboratively, in your browser.";

export const metadata: Metadata = {
  metadataBase: new URL("https://archforge.dev"),
  title: {
    default: "ArchForge — Design systems like an architect.",
    template: "%s · ArchForge",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "system design",
    "architecture diagram",
    "distributed systems",
    "load simulation",
    "discrete-event simulation",
    "queueing theory",
    "real-time collaboration",
    "Yjs",
    "Next.js",
  ],
  authors: [{ name: "ArchForge" }],
  openGraph: {
    type: "website",
    title: "ArchForge — Design systems like an architect.",
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ArchForge — Design systems like an architect.",
    description: SITE_DESCRIPTION,
  },
  // Favicon is provided by the `app/icon.svg` file convention.
};

export const viewport: Viewport = {
  themeColor: "#f8f6f2",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-text antialiased">
        {children}
        <Toaster
          position="bottom-right"
          gap={10}
          toastOptions={{
            classNames: {
              toast:
                "!bg-surface !text-text !border !border-border !shadow-md !rounded-xl",
              description: "!text-text-secondary",
              actionButton: "!bg-accent !text-white",
              cancelButton: "!bg-secondary-bg !text-text-secondary",
              success: "!text-success",
              error: "!text-critical",
              warning: "!text-warning",
            },
          }}
        />
      </body>
    </html>
  );
}
