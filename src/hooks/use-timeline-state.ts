import { useState, useCallback } from "react";
import { db } from "@/data/db";
import type { VideoKeyFrame } from "@/data/schema";

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

interface StateHistoryEntry {
  kind: "state";
  state: TimelineState;
}

interface KeyframeHistoryEntry {
  kind: "keyframe";
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
}

type HistoryEntry = StateHistoryEntry | KeyframeHistoryEntry;

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

  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

  const updateState = useCallback(
    (updater: (prev: TimelineState) => TimelineState) => {
      setState((prev) => {
        const newState = updater(prev);
        setUndoStack((u) => [...u, { kind: "state", state: prev }]);
        setRedoStack([]);
        return newState;
      });
    },
    [],
  );

  // Tool management
  const setActiveTool = useCallback(
    (tool: TimelineTool) => {
      updateState((prev) => ({ ...prev, activeTool: tool }));
    },
    [updateState],
  );

  // Selection management
  const selectClip = useCallback(
    (clipId: string, multiSelect = false) => {
      updateState((prev) => {
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
    },
    [updateState],
  );

  const selectMultipleClips = useCallback(
    (clipIds: string[]) => {
      updateState((prev) => ({
        ...prev,
        selectedClips: new Set(clipIds),
      }));
    },
    [updateState],
  );

  const clearSelection = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      selectedClips: new Set(),
    }));
  }, [updateState]);

  // Selection box
  const startSelectionBox = useCallback(
    (x: number, y: number) => {
      updateState((prev) => ({
        ...prev,
        selectionBox: {
          active: true,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
        },
      }));
    },
    [updateState],
  );

  const updateSelectionBox = useCallback(
    (x: number, y: number) => {
      updateState((prev) => {
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
    },
    [updateState],
  );

  const endSelectionBox = useCallback(() => {
    updateState((prev) => ({ ...prev, selectionBox: null }));
  }, [updateState]);

  // Drag state
  const startDrag = useCallback(
    (
      clipId: string,
      type: "move" | "resize-left" | "resize-right",
      startX: number,
      startTimestamp: number,
      startDuration: number,
    ) => {
      updateState((prev) => ({
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
    [updateState],
  );

  const endDrag = useCallback(() => {
    updateState((prev) => ({ ...prev, dragState: null }));
  }, [updateState]);

  // Cut preview
  const showCutPreview = useCallback(
    (trackId: string, position: number) => {
      updateState((prev) => ({
        ...prev,
        cutPreview: { active: true, trackId, position },
      }));
    },
    [updateState],
  );

  const hideCutPreview = useCallback(() => {
    updateState((prev) => ({ ...prev, cutPreview: null }));
  }, [updateState]);

  // Snap settings
  const toggleSnap = useCallback(() => {
    updateState((prev) => ({ ...prev, snapEnabled: !prev.snapEnabled }));
  }, [updateState]);

  const toggleMagneticSnap = useCallback(() => {
    updateState((prev) => ({ ...prev, magneticSnap: !prev.magneticSnap }));
  }, [updateState]);

  const recordAction = useCallback((entry: KeyframeHistoryEntry) => {
    setUndoStack((u) => [...u, entry]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(async () => {
    let entry: HistoryEntry | undefined;
    setUndoStack((hist) => {
      if (hist.length === 0) return hist;
      entry = hist[hist.length - 1];
      return hist.slice(0, -1);
    });
    if (!entry) return;
    if (entry.kind === "state") {
      setRedoStack((r) => [{ kind: "state", state }, ...r]);
      setState(entry.state);
    } else {
      await entry.undo();
      setRedoStack((r) => [entry as KeyframeHistoryEntry, ...r]);
    }
  }, [state]);

  const redo = useCallback(async () => {
    let entry: HistoryEntry | undefined;
    setRedoStack((r) => {
      if (r.length === 0) return r;
      entry = r[0];
      return r.slice(1);
    });
    if (!entry) return;
    if (entry.kind === "state") {
      setUndoStack((hist) => [...hist, { kind: "state", state }]);
      setState(entry.state);
    } else {
      await entry.redo();
      setUndoStack((hist) => [...hist, entry as KeyframeHistoryEntry]);
    }
  }, [state]);

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
    recordAction,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
