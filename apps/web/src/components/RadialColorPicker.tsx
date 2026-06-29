"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNotesStore, getColorDisplayName } from "@/state/useNotesStore";

interface Props {
  centerX: number;
  centerY: number;
  currentColor: string;
  mouseX: number;
  mouseY: number;
  onSelect: (color: string) => void;
  onCancel: () => void;
  pages: { id: string; name: string }[];
  activePageId: string | null;
}

const RADIUS = 80;
const SWATCH_SIZE = 28;
const FADE_RADIUS = 250;

export default function RadialColorPicker({ centerX, centerY, currentColor, mouseX, mouseY, onSelect, onCancel, pages, activePageId }: Props) {
  const colorNames = useNotesStore((s) => s.colorNames);
  const storeColorOrder = useNotesStore((s) => s.colorOrder);
  const PICKER_COLORS: Record<string, string> = useMemo(() => ({
    red: "#F87171",
    orange: "#FB923C",
    teal: "#2DD4BF",
    blue: "#60A5FA",
    green: "#4ADE80",
    purple: "#C084FC",
    pink: "#F472B6",
  }), []);
  const pickerColors = useMemo(() => [
    { name: "none", hex: "" },
    ...storeColorOrder
      .filter((name) => name !== "none")
      .map((name) => ({ name, hex: PICKER_COLORS[name] || "" })),
  ], [storeColorOrder, PICKER_COLORS]);

  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [hoveredMoveToPageId, setHoveredMoveToPageId] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const onReleaseRef = useRef(onSelect);
  onReleaseRef.current = onSelect;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const dx = mouseX - centerX;
  const dy = mouseY - centerY;
  const distFromCenter = Math.sqrt(dx * dx + dy * dy);
  const isOutOfRange = !hoveredMoveToPageId && distFromCenter > FADE_RADIUS;

  const getHoveredColor = useCallback(
    (clientX: number, clientY: number): string | null => {
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 25) {
        return null;
      }

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

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const color = getHoveredColor(t.clientX, t.clientY);
      if (color !== hoveredRef.current) {
        hoveredRef.current = color;
        setHoveredColor(color);
      }
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleUp);
      document.removeEventListener("touchcancel", handleCancel);
      if (hoveredRef.current) {
        onReleaseRef.current(hoveredRef.current);
      } else {
        onCancelRef.current();
      }
    };

    const handleCancel = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleUp);
      document.removeEventListener("touchcancel", handleCancel);
      onCancelRef.current();
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleUp);
    document.addEventListener("touchcancel", handleCancel);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleUp);
      document.removeEventListener("touchcancel", handleCancel);
    };
  }, [getHoveredColor]);

  const step = (2 * Math.PI) / pickerColors.length;
  const swatchOpacity = isOutOfRange ? 0 : 1;

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
      <div
        style={{
          position: "absolute",
          left: centerX - RADIUS - SWATCH_SIZE,
          top: centerY - RADIUS - SWATCH_SIZE,
          width: (RADIUS + SWATCH_SIZE) * 2,
          height: (RADIUS + SWATCH_SIZE) * 2,
          borderRadius: "50%",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          background: "color-mix(in srgb, var(--surface) 30%, transparent)",
          opacity: swatchOpacity,
          transition: "opacity 150ms ease-out",
        }}
      />
      {pickerColors.map((color, i) => {
        const angle = -Math.PI / 2 + i * step;
        const x = centerX + Math.cos(angle) * RADIUS - SWATCH_SIZE / 2;
        const y = centerY + Math.sin(angle) * RADIUS - SWATCH_SIZE / 2;
        const isHovered = hoveredColor === color.name;
        const isCurrent = color.name === "none" ? !currentColor : currentColor === color.name;
        const isNone = color.name === "none";

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
              background: isNone ? "var(--surface-subtle)" : color.hex,
              border: isNone ? "2px dashed var(--text-muted)" : undefined,
              transform: isHovered ? "scale(1.4)" : isCurrent ? "scale(1.15)" : "scale(1)",
              boxShadow: isHovered
                ? `0 0 0 3px var(--accent), 0 4px 12px rgba(0,0,0,0.3)`
                : isCurrent
                  ? `0 0 0 2px var(--accent)`
                  : `0 2px 8px rgba(0,0,0,0.2)`,
              transition: "transform 100ms ease-out, box-shadow 100ms ease-out, opacity 150ms ease-out",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: swatchOpacity,
            }}
          >
            {isNone && (
              <div
                style={{
                  width: 14,
                  height: 2,
                  background: "var(--text-muted)",
                  transform: "rotate(-45deg)",
                  position: "absolute",
                }}
              />
            )}
          </div>
        );
      })}
      {hoveredColor && !isOutOfRange && (
        <div
          style={{
            position: "absolute",
            left: centerX,
            top: centerY,
            transform: "translate(-50%, -50%)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {hoveredColor === "none" ? "None" : getColorDisplayName(hoveredColor, colorNames)}
        </div>
      )}
      {pages.filter((p) => p.id !== activePageId).map((page, i) => {
        const itemY = centerY + RADIUS + SWATCH_SIZE + 16 + i * 32;
        const isHovered = hoveredMoveToPageId === page.id;
        return (
          <div
            key={page.id}
            data-tab-id={page.id}
            data-tab-name={page.name}
            data-move-to-item
            onMouseEnter={() => setHoveredMoveToPageId(page.id)}
            onMouseLeave={() => setHoveredMoveToPageId(null)}
            style={{
              position: "absolute",
              left: centerX,
              top: itemY,
              transform: "translateX(-50%)",
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 500,
              color: isHovered ? "var(--text)" : "var(--text-secondary)",
              background: isHovered ? "var(--surface-subtle)" : "var(--surface)",
              border: isHovered ? "1px solid var(--accent)" : "1px solid var(--border)",
              borderRadius: 6,
              whiteSpace: "nowrap",
              pointerEvents: "auto",
              opacity: swatchOpacity,
              transition: "opacity 150ms ease-out, background 100ms, color 100ms, border-color 100ms",
              cursor: "pointer",
            }}
          >
            Move to {page.name}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
