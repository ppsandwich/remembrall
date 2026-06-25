"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { acceptShare } from "@/lib/shareApi";

export default function AcceptShareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No share token provided.");
      return;
    }

    acceptShare(token).then((result) => {
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        setStatus("success");
        setMessage("You now have access to this section.");
        setTimeout(() => router.push("/"), 2000);
      }
    });
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-xs text-center">
        {status === "loading" && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Accepting share…</p>
        )}
        {status === "success" && (
          <>
            <p className="text-sm mb-2" style={{ color: "var(--text)" }}>{message}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Redirecting…</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-sm mb-4" style={{ color: "var(--danger)" }}>{message}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-xs rounded-md transition-colors"
              style={{ background: "var(--accent)", color: "var(--surface)" }}
            >
              Go to app
            </button>
          </>
        )}
      </div>
    </div>
  );
}
