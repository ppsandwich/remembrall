"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import EmbedView from "./[token]/EmbedView";

function EmbedContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token || token.length > 128) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: "#FAFAF8",
          color: "#999",
          fontSize: 14,
        }}
      >
        Invalid embed token.
      </div>
    );
  }

  return <EmbedView token={token} />;
}

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            background: "#FAFAF8",
            color: "#999",
            fontSize: 14,
          }}
        >
          Loading…
        </div>
      }
    >
      <EmbedContent />
    </Suspense>
  );
}
