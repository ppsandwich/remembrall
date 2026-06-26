"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/state/useAuthStore";
import { X, Volleyball } from "./Icons";

interface Props {
  onClose: () => void;
  defaultMode?: "login" | "signup";
}

export default function LoginPopover({ onClose, defaultMode = "login" }: Props) {
  const { signIn, signUp, signInWithMagicLink } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "magic">(defaultMode);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === "magic") {
      const result = await signInWithMagicLink(email);
      setLoading(false);
      if (result.error) setError(result.error);
      else setMessage("Check your email for a sign-in link.");
    } else if (mode === "signup") {
      const result = await signUp(email, password);
      setLoading(false);
      if (result.error) setError(result.error);
      else setMessage("Check your email to confirm your account.");
    } else {
      const result = await signIn(email, password);
      setLoading(false);
      if (result.error) setError(result.error);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2.5">
            <svg width="0" height="0" style={{ position: "absolute" }}>
              <defs>
                <linearGradient id="login-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#D4AF37" />
                  <stop offset="50%" stopColor="#B8860B" />
                  <stop offset="100%" stopColor="#996515" />
                </linearGradient>
              </defs>
            </svg>
            <Volleyball size={22} strokeWidth={1.5} style={{ stroke: "url(#login-gold)", fill: "none" }} />
            <span
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-almendra), serif", color: "var(--text)", letterSpacing: "-0.01em" }}
            >
              Brall
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-6 pt-4 pb-6">
          <div className="mb-2">
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
            >
              {mode === "login" ? "Welcome back" : mode === "signup" ? "Create an account" : "Sign in with email"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {mode === "login"
                ? "Sign in to sync your notes."
                : mode === "signup"
                ? "Start capturing thoughts instantly."
                : "We'll send you a magic link."}
            </p>
          </div>

          <input
            type="email"
            name="email"
            id="login-email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg text-sm outline-none"
            style={{
              background: "var(--surface-subtle)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />

          {mode !== "magic" && (
            <input
              type="password"
              name="password"
              id="login-password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm outline-none"
              style={{
                background: "var(--surface-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--surface)" }}
          >
            {loading
              ? "Loading…"
              : mode === "login"
              ? "Sign in"
              : mode === "signup"
              ? "Sign up"
              : "Send magic link"}
          </button>

          {error && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          {message && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {message}
            </p>
          )}

          <div className="flex flex-col gap-2 text-xs pt-2" style={{ color: "var(--text-muted)" }}>
            {mode === "login" && (
              <>
                <button type="button" onClick={() => { setMode("signup"); setError(null); setMessage(null); }} className="text-left hover:underline">
                  Create an account
                </button>
                <button type="button" onClick={() => { setMode("magic"); setError(null); setMessage(null); }} className="text-left hover:underline">
                  Use magic link instead
                </button>
              </>
            )}
            {mode === "signup" && (
              <button type="button" onClick={() => { setMode("login"); setError(null); setMessage(null); }} className="text-left hover:underline">
                Already have an account? Sign in
              </button>
            )}
            {mode === "magic" && (
              <button type="button" onClick={() => { setMode("login"); setError(null); setMessage(null); }} className="text-left hover:underline">
                Use password instead
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
