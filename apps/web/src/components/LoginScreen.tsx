"use client";

import { useState } from "react";
import { useAuthStore } from "@/state/useAuthStore";

export default function LoginScreen() {
  const { signIn, signUp, signInWithMagicLink } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "magic">("login");
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

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-xs">
        <h1
          className="text-xl font-semibold tracking-tight mb-1.5"
          style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
        >
          Remembrall
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Sign in to sync your notes.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            id="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg text-sm outline-none"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />

          {mode !== "magic" && (
            <input
              type="password"
              name="password"
              id="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm outline-none"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
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
        </form>

        {error && (
          <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            {message}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-2.5 text-sm" style={{ color: "var(--text-muted)" }}>
          {mode === "login" && (
            <>
              <button onClick={() => { setMode("signup"); setError(null); }} className="text-left hover:underline">
                Create an account
              </button>
              <button onClick={() => { setMode("magic"); setError(null); }} className="text-left hover:underline">
                Use magic link instead
              </button>
            </>
          )}
          {mode === "signup" && (
            <button onClick={() => { setMode("login"); setError(null); }} className="text-left hover:underline">
              Already have an account? Sign in
            </button>
          )}
          {mode === "magic" && (
            <button onClick={() => { setMode("login"); setError(null); }} className="text-left hover:underline">
              Use password instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
