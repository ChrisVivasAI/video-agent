import { useHotkeys } from "react-hotkeys-hook";
import { type TimelineTool } from "./use-timeline-state";

interface TimelineShortcutsProps {
  // Tools
  onToolChange: (tool: TimelineTool) => void;

  // Playback
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onGoToStart: () => void;
  onGoToEnd: () => void;

  // Selection
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;

  // Editing
  onCopy: () => void;
  onPaste: () => void;
  onCut: () => void;
  onDuplicate: () => void;
  onUndo: () => void;
  onRedo: () => void;

  // Timeline
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToWindow: () => void;
  onToggleSnap: () => void;

  // Razor tool specific
  onCutAtPlayhead: () => void;
}

export function useTimelineShortcuts({
  onToolChange,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  onGoToStart,
  onGoToEnd,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onCopy,
  onPaste,
  onCut,
  onDuplicate,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitToWindow,
  onToggleSnap,
  onCutAtPlayhead,
}: TimelineShortcutsProps) {
  // Tool shortcuts
  useHotkeys("v", () => onToolChange("select"), { preventDefault: true });
  useHotkeys("c", () => onToolChange("razor"), { preventDefault: true });
  useHotkeys("y", () => onToolChange("slip"), { preventDefault: true });
  useHotkeys("u", () => onToolChange("slide"), { preventDefault: true });

  // Playback shortcuts
  useHotkeys("space", onTogglePlay, { preventDefault: true });
  useHotkeys("left", onStepBackward, { preventDefault: true });
  useHotkeys("right", onStepForward, { preventDefault: true });
  useHotkeys("home", onGoToStart, { preventDefault: true });
  useHotkeys("end", onGoToEnd, { preventDefault: true });

  // Selection shortcuts
  useHotkeys("ctrl+a", onSelectAll, { preventDefault: true });
  useHotkeys("ctrl+d", onClearSelection, { preventDefault: true });
  useHotkeys("delete", onDeleteSelected, { preventDefault: true });
  useHotkeys("backspace", onDeleteSelected, { preventDefault: true });

  // Editing shortcuts
  useHotkeys("ctrl+c", onCopy, { preventDefault: true });
  useHotkeys("ctrl+v", onPaste, { preventDefault: true });
  useHotkeys("ctrl+x", onCut, { preventDefault: true });
  useHotkeys("ctrl+shift+d", onDuplicate, { preventDefault: true });
  useHotkeys("ctrl+z", onUndo, { preventDefault: true });
  useHotkeys("ctrl+y", onRedo, { preventDefault: true });
  useHotkeys("ctrl+shift+z", onRedo, { preventDefault: true }); // Alternative redo

  // Timeline shortcuts
  useHotkeys("plus", onZoomIn, { preventDefault: true });
  useHotkeys("equals", onZoomIn, { preventDefault: true }); // + without shift
  useHotkeys("minus", onZoomOut, { preventDefault: true });
  useHotkeys("ctrl+0", onFitToWindow, { preventDefault: true });
  useHotkeys("s", onToggleSnap, { preventDefault: true });

  // Razor tool specific
  useHotkeys("ctrl+k", onCutAtPlayhead, { preventDefault: true });

  // Additional professional shortcuts
  useHotkeys("j", onStepBackward, { preventDefault: true }); // J-K-L editing
  useHotkeys("k", onTogglePlay, { preventDefault: true });
  useHotkeys("l", onStepForward, { preventDefault: true });

  // Frame-by-frame navigation
  useHotkeys(
    "shift+left",
    () => {
      // Step backward by frame (implement frame-accurate stepping)
      onStepBackward();
    },
    { preventDefault: true },
  );

  useHotkeys(
    "shift+right",
    () => {
      // Step forward by frame (implement frame-accurate stepping)
      onStepForward();
    },
    { preventDefault: true },
  );

  // Mark in/out points (for future implementation)
  useHotkeys(
    "i",
    () => {
      // Mark in point (for future implementation)
      console.log("Mark in point");
    },
    { preventDefault: true },
  );

  useHotkeys(
    "o",
    () => {
      // Mark out point (for future implementation)
      console.log("Mark out point");
    },
    { preventDefault: true },
  );

  // Ripple delete
  useHotkeys(
    "shift+delete",
    () => {
      // Ripple delete (for future implementation)
      onDeleteSelected();
    },
    { preventDefault: true },
  );
}
