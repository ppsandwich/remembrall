"use client";

import { useState } from "react";
import { useAuthStore } from "@/state/useAuthStore";
import { useEncryptionStore } from "@/state/useEncryptionStore";

export default function LockScreen() {
  const user = useAuthStore((s) => s.user);
  const { isSetup, setupPassphrase, unlock, error: encError } = useEncryptionStore();
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);
    const result = await unlock(user.id, passphrase);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (passphrase !== confirmPassphrase) {
      setError("Passphrases do not match.");
      return;
    }
    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await setupPassphrase(user.id, passphrase);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  if (!isSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-xs">
          <h1 className="text-lg font-semibold tracking-tight mb-1.5" style={{ color: "var(--text)" }}>
            Set up encryption
          </h1>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Your notes are encrypted before they leave your device. Remembrall cannot recover them if you lose your encryption passphrase.
          </p>

          <form onSubmit={handleSetup} className="flex flex-col gap-3">
            <input
              type="password"
              name="new-password"
              id="new-passphrase"
              autoComplete="new-password"
              placeholder="Create a passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <input
              type="password"
              name="confirm-password"
              id="confirm-passphrase"
              autoComplete="new-password"
              placeholder="Confirm passphrase"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />

            <label className="flex items-start gap-2.5 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span>I understand that if I lose my passphrase, my notes may be unrecoverable.</span>
            </label>

            <button
              type="submit"
              disabled={loading || !acknowledged}
              className="w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-30"
              style={{ background: "var(--accent)", color: "var(--surface)" }}
            >
              {loading ? "Setting up…" : "Set up encryption"}
            </button>
          </form>

          {(error || encError) && (
            <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>
              {error || encError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-xs">
        <h1 className="text-lg font-semibold tracking-tight mb-1.5" style={{ color: "var(--text)" }}>
          Unlock notes
        </h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Notes are locked. Unlock to search, copy, paste, and generally rummage around.
        </p>

        <form onSubmit={handleUnlock} className="flex flex-col gap-3">
          <input
            type="password"
            name="password"
            id="passphrase"
            autoComplete="current-password"
            placeholder="Enter your passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            required
            autoFocus
            className="w-full px-4 py-3 rounded-lg text-sm outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--surface)" }}
          >
            {loading ? "Unlocking…" : "Unlock"}
          </button>
        </form>

        {(error || encError) && (
          <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>
            {error || encError}
          </p>
        )}
      </div>
    </div>
  );
}
