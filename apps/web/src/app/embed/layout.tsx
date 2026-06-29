import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Embed - Brall",
  robots: "noindex, nofollow",
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
