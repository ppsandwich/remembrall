"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { NOTE_COLORS, DARK_NOTE_COLORS } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";

interface Props {
  centerX: number;
  centerY: number;
  currentColor: string;
  onSelect: (color: string) => void;
  onCancel: () => void;
}

const RADIUS = 80;
const SWATCH_SIZE = 28;

export default function RadialColorPicker({ centerX, centerY, currentColor, onSelect, onCancel }: Props) {
  const { resolvedTheme } = useUIStore();
  const colors = resolvedTheme === "dark" ? DARK_NOTE_COLORS : NOTE_COLORS;
  const pickerColors = colors.filter((c) => c.name !== "none");

  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const onReleaseRef = useRef(onSelect);
  onReleaseRef.current = onSelect;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const getHoveredColor = useCallback(
    (clientX: number, clientY: number): string | null => {
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < SWATCH_SIZE / 2) return null;

      const angle = Math.atan2(dy, dx);
      const step = (2 * Math.PI) / pickerColors.length;

      for (let i = 0; i < pickerColors.length; i++) {
        const colorAngle = -Math.PI / 2 + i * step;
        let diff = angle - colorAngle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        if (Math.abs(diff) < step / 2) {
          return pickerColors[i].name;
        }
      }
      return null;
    },
    [centerX, centerY, pickerColors],
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const color = getHoveredColor(e.clientX, e.clientY);
      if (color !== hoveredRef.current) {
        hoveredRef.current = color;
        setHoveredColor(color);
      }
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      if (hoveredRef.current) {
        onReleaseRef.current(hoveredRef.current);
      } else {
        onCancelRef.current();
      }
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [getHoveredColor]);

  const step = (2 * Math.PI) / pickerColors.length;

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 10000,
      }}
    >
      {pickerColors.map((color, i) => {
        const angle = -Math.PI / 2 + i * step;
        const x = centerX + Math.cos(angle) * RADIUS - SWATCH_SIZE / 2;
        const y = centerY + Math.sin(angle) * RADIUS - SWATCH_SIZE / 2;
        const isHovered = hoveredColor === color.name;
        const isCurrent = currentColor === color.name;

        return (
          <div
            key={color.name}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: SWATCH_SIZE,
              height: SWATCH_SIZE,
              borderRadius: "50%",
              background: color.hex,
              transform: isHovered ? "scale(1.4)" : isCurrent ? "scale(1.15)" : "scale(1)",
              boxShadow: isHovered
                ? `0 0 0 3px var(--accent), 0 4px 12px rgba(0,0,0,0.3)`
                : isCurrent
                  ? `0 0 0 2px var(--accent)`
                  : `0 2px 8px rgba(0,0,0,0.2)`,
              transition: "transform 100ms ease-out, box-shadow 100ms ease-out",
              pointerEvents: "none",
            }}
          />
        );
      })}
    </div>,
    document.body,
  );
}
