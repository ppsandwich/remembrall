"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/state/useAuthStore";
import { useEncryptionStore } from "@/state/useEncryptionStore";
import LoginScreen from "@/components/LoginScreen";
import AppShell from "@/components/AppShell";

export default function Home() {
  const { user, loading, init } = useAuthStore();
  const { isReady, initialize } = useEncryptionStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (user) {
      initialize();
    }
  }, [user, initialize]);

  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.onCreateNote) return;
    electronAPI.onCreateNote((text: string) => {
      if (!user) {
        electronAPI.showNotification("Brall", "Sign in to Brall to create new notes.");
      }
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg)" }}>
        <div style={{ color: "var(--text-muted)" }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg)" }}>
        <div style={{ color: "var(--text-muted)" }}>Loading…</div>
      </div>
    );
  }

  return <AppShell />;
}
