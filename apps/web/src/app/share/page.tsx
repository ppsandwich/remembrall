"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ShareView from "./ShareView";

function ShareContent() {
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
        Invalid share link.
      </div>
    );
  }

  return <ShareView token={token} />;
}

export default function SharePage() {
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
      <ShareContent />
    </Suspense>
  );
}
