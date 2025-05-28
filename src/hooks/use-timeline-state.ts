import { useState, useCallback } from "react";

export type TimelineTool = "select" | "razor" | "slip" | "slide";

export interface TimelineState {
  // Tools
  activeTool: TimelineTool;

  // Selection
  selectedClips: Set<string>;
  selectionBox: {
    active: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null;

  // Editing
  dragState: {
    clipId: string;
    type: "move" | "resize-left" | "resize-right";
    startX: number;
    startTimestamp: number;
    startDuration: number;
  } | null;

  // Snapping
  snapEnabled: boolean;
  magneticSnap: boolean;
  snapDistance: number; // pixels

  // Cut preview
  cutPreview: {
    active: boolean;
    trackId: string;
    position: number; // timestamp
  } | null;
}

export function useTimelineState() {
  const [state, setState] = useState<TimelineState>({
    activeTool: "select",
    selectedClips: new Set(),
    selectionBox: null,
    dragState: null,
    snapEnabled: true,
    magneticSnap: true,
    snapDistance: 10,
    cutPreview: null,
  });

  // Tool management
  const setActiveTool = useCallback((tool: TimelineTool) => {
    setState((prev) => ({ ...prev, activeTool: tool }));
  }, []);

  // Selection management
  const selectClip = useCallback((clipId: string, multiSelect = false) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedClips);

      if (multiSelect) {
        if (newSelected.has(clipId)) {
          newSelected.delete(clipId);
        } else {
          newSelected.add(clipId);
        }
      } else {
        newSelected.clear();
        newSelected.add(clipId);
      }

      return { ...prev, selectedClips: newSelected };
    });
  }, []);

  const selectMultipleClips = useCallback((clipIds: string[]) => {
    setState((prev) => ({
      ...prev,
      selectedClips: new Set(clipIds),
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedClips: new Set(),
    }));
  }, []);

  // Selection box
  const startSelectionBox = useCallback((x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      selectionBox: {
        active: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      },
    }));
  }, []);

  const updateSelectionBox = useCallback((x: number, y: number) => {
    setState((prev) => {
      if (!prev.selectionBox) return prev;
      return {
        ...prev,
        selectionBox: {
          ...prev.selectionBox,
          currentX: x,
          currentY: y,
        },
      };
    });
  }, []);

  const endSelectionBox = useCallback(() => {
    setState((prev) => ({ ...prev, selectionBox: null }));
  }, []);

  // Drag state
  const startDrag = useCallback(
    (
      clipId: string,
      type: "move" | "resize-left" | "resize-right",
      startX: number,
      startTimestamp: number,
      startDuration: number,
    ) => {
      setState((prev) => ({
        ...prev,
        dragState: {
          clipId,
          type,
          startX,
          startTimestamp,
          startDuration,
        },
      }));
    },
    [],
  );

  const endDrag = useCallback(() => {
    setState((prev) => ({ ...prev, dragState: null }));
  }, []);

  // Cut preview
  const showCutPreview = useCallback((trackId: string, position: number) => {
    setState((prev) => ({
      ...prev,
      cutPreview: { active: true, trackId, position },
    }));
  }, []);

  const hideCutPreview = useCallback(() => {
    setState((prev) => ({ ...prev, cutPreview: null }));
  }, []);

  // Snap settings
  const toggleSnap = useCallback(() => {
    setState((prev) => ({ ...prev, snapEnabled: !prev.snapEnabled }));
  }, []);

  const toggleMagneticSnap = useCallback(() => {
    setState((prev) => ({ ...prev, magneticSnap: !prev.magneticSnap }));
  }, []);

  return {
    state,
    // Tools
    setActiveTool,
    // Selection
    selectClip,
    selectMultipleClips,
    clearSelection,
    // Selection box
    startSelectionBox,
    updateSelectionBox,
    endSelectionBox,
    // Drag
    startDrag,
    endDrag,
    // Cut preview
    showCutPreview,
    hideCutPreview,
    // Snap
    toggleSnap,
    toggleMagneticSnap,
  };
}
