import type { Metadata, Viewport } from "next";
import "@fontsource-variable/libre-franklin";
import "./globals.css";
import { themeBootScript } from "@/utils/theme";
export const metadata: Metadata = {
  title: "Munchy",
  description: "A fast, private food diary that works offline. Nutrition facts for every day, stored on your device.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Munchy", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f4" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1917" },
  ],
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
