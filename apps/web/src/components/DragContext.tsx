"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

interface DragState {
  draggedId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  sourceIndex: number;
  targetIndex: number;
  isDragging: boolean;
}

interface DragContextValue {
  dragState: DragState;
  startDrag: (id: string, index: number, e: React.MouseEvent, cardWidth: number, cardHeight: number) => void;
  updateDrag: (e: React.MouseEvent) => void;
  setTargetIndex: (index: number) => void;
  endDrag: () => void;
  getCardStyle: (id: string, index: number) => React.CSSProperties;
  getCardClassName: (id: string) => string;
}

const DragContext = createContext<DragContextValue | null>(null);

export function useDragContext() {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error("useDragContext must be used within DragProvider");
  return ctx;
}

const initialDragState: DragState = {
  draggedId: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  sourceIndex: -1,
  targetIndex: -1,
  isDragging: false,
};

export function DragProvider({ children, onReorder }: { children: ReactNode; onReorder: (id: string, targetIndex: number) => void }) {
  const [dragState, setDragState] = useState<DragState>(initialDragState);
  const dragRef = useRef<DragState>(initialDragState);
  const animFrameRef = useRef<number>(0);
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const cardSizeRef = useRef({ width: 0, height: 0, gap: 12 });

  const startDrag = useCallback((id: string, index: number, e: React.MouseEvent, cardWidth: number, cardHeight: number) => {
    cardSizeRef.current = { width: cardWidth, height: cardHeight, gap: 12 };
    const newState: DragState = {
      draggedId: id,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      sourceIndex: index,
      targetIndex: index,
      isDragging: true,
    };
    dragRef.current = newState;
    setDragState(newState);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }, []);

  const updateDrag = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.isDragging) return;

    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      const state = dragRef.current;
      const newState = {
        ...state,
        currentX: e.clientX,
        currentY: e.clientY,
      };
      dragRef.current = newState;
      setDragState(newState);
    });
  }, []);

  const setTargetIndex = useCallback((index: number) => {
    if (dragRef.current.targetIndex !== index) {
      const newState = {
        ...dragRef.current,
        targetIndex: index,
      };
      dragRef.current = newState;
      setDragState(newState);
    }
  }, []);

  const endDrag = useCallback(() => {
    const state = dragRef.current;
    if (state.draggedId && state.sourceIndex !== state.targetIndex) {
      onReorderRef.current(state.draggedId, state.targetIndex);
    }
    dragRef.current = initialDragState;
    setDragState(initialDragState);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const getCardStyle = useCallback((id: string, index: number): React.CSSProperties => {
    const state = dragState;
    if (!state.isDragging || !state.draggedId) return {};

    if (id === state.draggedId) {
      const dx = state.currentX - state.startX;
      const dy = state.currentY - state.startY;
      return {
        transform: `translate(${dx}px, ${dy}px) scale(1.02)`,
        zIndex: 1000,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
        transition: "box-shadow 0.2s",
        opacity: 0.95,
      };
    }

    return {};
  }, [dragState]);

  const getCardClassName = useCallback((id: string): string => {
    return "";
  }, [dragState]);

  return (
    <DragContext.Provider value={{ dragState, startDrag, updateDrag, setTargetIndex, endDrag, getCardStyle, getCardClassName }}>
      {children}
    </DragContext.Provider>
  );
}
