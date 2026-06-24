import type { Metadata } from "next";
import { Almendra } from "next/font/google";
import "../styles/globals.css";

const almendra = Almendra({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-almendra",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Remembrall",
  description: "Open. Type or paste. Done.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={almendra.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
