"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useNotesStore } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";
import { useVoiceRecording } from "@/lib/useVoiceRecording";
import { transcribeAudio } from "@/lib/openrouter";
import { addTag } from "@brall/core";
import { Plus, Square, AudioLines } from "./Icons";

const MAX_RECORDING_SECONDS = 60;

export default function DesktopFab({ right }: { right: number }) {
  const { setShowQuickCapture, showToast } = useUIStore();
  const openrouterKey = useNotesStore((s) => s.openrouterKey);
  const createNote = useNotesStore((s) => s.createNote);
  const pages = useNotesStore((s) => s.pages);
  const activePageId = useNotesStore((s) => s.activePageId);
  const setHighlightNoteId = useNotesStore((s) => s.setHighlightNoteId);

  const { isRecording, start, stop, isSupported, getRecordingDurationMs } = useVoiceRecording();
  const [transcribing, setTranscribing] = useState(false);
  const [remaining, setRemaining] = useState(MAX_RECORDING_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRef = useRef(stop);
  stopRef.current = stop;

  useEffect(() => {
    if (isRecording) {
      setRemaining(MAX_RECORDING_SECONDS);
      timerRef.current = setInterval(() => {
        setRemaining((s) => {
          if (s <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            stopRef.current();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setRemaining(MAX_RECORDING_SECONDS);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const handleVoiceToggle = useCallback(async () => {
    if (transcribing) return;
    if (isRecording) {
      try {
        const blob = await stop();
        if (getRecordingDurationMs() < 2500) {
          showToast("Notes aren't created for voice recordings of less than 3 seconds.");
          return;
        }
        setTranscribing(true);
        const text = await transcribeAudio(openrouterKey!, blob);
        if (text) {
          const tagged = addTag(text, "voice");
          const noteId = await createNote(tagged, "desktop");
          const activePage = pages.find((p) => p.id === activePageId);
          const tabName = activePage?.name || "notes";
          const preview = text.length > 32 ? text.slice(0, 32) + "\u2026" : text;
          showToast(`Pasted to new Brall note in ${tabName}: ${preview}`);
          if (noteId) setHighlightNoteId(noteId);
        }
      } catch {
        showToast("Transcription failed. Your recording was not saved.");
      } finally {
        setTranscribing(false);
      }
    } else {
      try {
        await start();
      } catch {
        showToast("Microphone access denied.");
      }
    }
  }, [isRecording, stop, start, openrouterKey, createNote, pages, activePageId, showToast, setHighlightNoteId, transcribing, getRecordingDurationMs]);

  if (!openrouterKey || !isSupported) {
    return (
      <div className="fixed bottom-6 z-40" style={{ right }}>
        <button
          onClick={() => setShowQuickCapture(true)}
          className="rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ width: "3rem", height: "3rem", color: "#22C55E", background: "transparent", border: "1px solid #22C55E", backdropFilter: "blur(12px)" }}
          title="New note"
          aria-label="New note"
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <Plus size={22} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-6 z-40 flex items-center rounded-full overflow-hidden"
      style={{ right, height: "3rem", backdropFilter: "blur(12px)", background: "color-mix(in srgb, var(--surface) 50%, transparent)" }}
    >
      <button
        onClick={handleVoiceToggle}
        className={`flex items-center justify-center transition-all active:scale-95 relative rounded-l-full ${isRecording ? "voice-throb" : ""}`}
        style={{
          width: isRecording ? "auto" : "2.5rem",
          height: "3rem",
          paddingInline: isRecording ? "0.75rem" : undefined,
          gap: isRecording ? "0.375rem" : 0,
          color: isRecording ? "white" : "#3B82F6",
          background: isRecording ? "#EF4444" : "transparent",
          border: isRecording ? "1px solid #EF4444" : "none",
          opacity: transcribing ? 0.6 : 1,
        }}
        title={isRecording ? "Stop recording" : transcribing ? "Transcribing\u2026" : "New from voice"}
        aria-label={isRecording ? "Stop recording" : transcribing ? "Transcribing" : "New from voice"}
        disabled={transcribing}
        onMouseEnter={(e) => { if (!isRecording) e.currentTarget.style.background = "rgba(59,130,246,0.1)"; }}
        onMouseLeave={(e) => { if (!isRecording) e.currentTarget.style.background = "transparent"; }}
      >
        {isRecording && <div className="voice-highlight-scroll" />}
        {transcribing ? (
          <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : isRecording ? (
          <>
            <Square size={14} />
            <span className="text-xs font-medium tabular-nums">{remaining}s remaining</span>
          </>
        ) : (
          <AudioLines size={20} />
        )}
      </button>
      {!isRecording && !transcribing && (
        <button
          onClick={() => setShowQuickCapture(true)}
          className="flex items-center justify-center transition-all active:scale-95 rounded-r-full"
          style={{ width: "2.5rem", height: "3rem", color: "#22C55E", background: "transparent" }}
          title="New note"
          aria-label="New note"
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <Plus size={22} />
        </button>
      )}
    </div>
  );
}
