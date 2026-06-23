import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Remembrall",
  description: "Open. Type or paste. Done.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
