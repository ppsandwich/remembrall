"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/state/useAuthStore";
import { useEncryptionStore } from "@/state/useEncryptionStore";
import LoginScreen from "@/components/LoginScreen";
import LockScreen from "@/components/LockScreen";
import AppShell from "@/components/AppShell";

export default function Home() {
  const { user, loading, init } = useAuthStore();
  const { isSetup, isUnlocked, checkSetup } = useEncryptionStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (user) {
      checkSetup(user.id);
    }
  }, [user, checkSetup]);

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

  if (!isSetup || !isUnlocked) {
    return <LockScreen />;
  }

  return <AppShell />;
}
