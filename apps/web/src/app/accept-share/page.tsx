"use client";

import { Suspense } from "react";
import AcceptShareContent from "./AcceptShareContent";

export default function AcceptSharePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      </div>
    }>
      <AcceptShareContent />
    </Suspense>
  );
}
