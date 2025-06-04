import { useEffect } from "react";

interface ProfessionalShortcutsProps {
  // Tool shortcuts
  onSelectTool: () => void;
  onRazorTool: () => void;
  onHandTool: () => void;

  // Playback shortcuts
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onGoToStart: () => void;
  onGoToEnd: () => void;
  onJumpForward: () => void;
  onJumpBackward: () => void;

  // Timeline shortcuts
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToWindow: () => void;
  onToggleSnap: () => void;
  onToggleMagneticSnap: () => void;

  // Editing shortcuts
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;

  // Timeline navigation
  onCutAtPlayhead: () => void;
  onSplitClip: () => void;
  onRippleDelete: () => void;

  // Track shortcuts
  onAddVideoTrack: () => void;
  onAddAudioTrack: () => void;
  onAddVoiceoverTrack: () => void;

  // Project shortcuts
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;

  // View shortcuts
  onToggleTimeline: () => void;
  onToggleMediaPanel: () => void;
  onToggleProperties: () => void;
}

export function useProfessionalShortcuts(handlers: ProfessionalShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
      const isCmd = ctrlKey || metaKey;

      // Ignore shortcuts when a form element or contenteditable element is active
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.isContentEditable)
      ) {
        return;
      }

      // Prevent default for handled shortcuts
      const preventDefault = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      // Tool shortcuts
      if (key === "v" && !isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onSelectTool();
        return;
      }

      if (key === "c" && !isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onRazorTool();
        return;
      }

      if (key === "h" && !isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onHandTool();
        return;
      }

      // Playback shortcuts
      if (key === " " && !isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onTogglePlay();
        return;
      }

      if (key === "ArrowRight" && !isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onStepForward();
        return;
      }

      if (key === "ArrowLeft" && !isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onStepBackward();
        return;
      }

      if (key === "Home" && !isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onGoToStart();
        return;
      }

      if (key === "End" && !isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onGoToEnd();
        return;
      }

      if (key === "ArrowRight" && shiftKey && !isCmd && !altKey) {
        preventDefault();
        handlers.onJumpForward();
        return;
      }

      if (key === "ArrowLeft" && shiftKey && !isCmd && !altKey) {
        preventDefault();
        handlers.onJumpBackward();
        return;
      }

      // Timeline shortcuts
      if (key === "=" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onZoomIn();
        return;
      }

      if (key === "-" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onZoomOut();
        return;
      }

      if (key === "0" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onFitToWindow();
        return;
      }

      if (key === "s" && !isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onToggleSnap();
        return;
      }

      if (key === "m" && !isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onToggleMagneticSnap();
        return;
      }

      // Editing shortcuts
      if (key === "x" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onCut();
        return;
      }

      if (key === "c" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onCopy();
        return;
      }

      if (key === "v" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onPaste();
        return;
      }

      if (
        (key === "Delete" || key === "Backspace") &&
        !isCmd &&
        !shiftKey &&
        !altKey
      ) {
        preventDefault();
        handlers.onDelete();
        return;
      }

      if (key === "d" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onDuplicate();
        return;
      }

      if (key === "a" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onSelectAll();
        return;
      }

      if (key === "d" && isCmd && shiftKey && !altKey) {
        preventDefault();
        handlers.onDeselectAll();
        return;
      }

      // Timeline navigation
      if (key === "k" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onCutAtPlayhead();
        return;
      }

      if (key === "r" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onSplitClip();
        return;
      }

      if (
        (key === "Delete" || key === "Backspace") &&
        shiftKey &&
        !isCmd &&
        !altKey
      ) {
        preventDefault();
        handlers.onRippleDelete();
        return;
      }

      // Track shortcuts
      if (key === "t" && isCmd && shiftKey && !altKey) {
        preventDefault();
        handlers.onAddVideoTrack();
        return;
      }

      if (key === "a" && isCmd && shiftKey && !altKey) {
        preventDefault();
        handlers.onAddAudioTrack();
        return;
      }

      if (key === "v" && isCmd && shiftKey && !altKey) {
        preventDefault();
        handlers.onAddVoiceoverTrack();
        return;
      }

      // Project shortcuts
      if (key === "s" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onSave();
        return;
      }

      if (key === "z" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onUndo();
        return;
      }

      if (key === "z" && isCmd && shiftKey && !altKey) {
        preventDefault();
        handlers.onRedo();
        return;
      }

      if (key === "e" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onExport();
        return;
      }

      // View shortcuts
      if (key === "1" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onToggleTimeline();
        return;
      }

      if (key === "2" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onToggleMediaPanel();
        return;
      }

      if (key === "3" && isCmd && !shiftKey && !altKey) {
        preventDefault();
        handlers.onToggleProperties();
        return;
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlers]);
}

// Helper hook for common timeline operations
export function useTimelineOperations() {
  return {
    // Frame-based navigation (30fps)
    framesToSeconds: (frames: number) => frames / 30,
    secondsToFrames: (seconds: number) => Math.round(seconds * 30),

    // Time formatting
    formatTimecode: (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      const frames = Math.floor((seconds % 1) * 30);
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
    },

    // Snapping utilities
    snapToGrid: (time: number, gridSize: number = 1) => {
      return Math.round(time / gridSize) * gridSize;
    },

    snapToNearestClip: (
      time: number,
      clips: any[],
      snapDistance: number = 0.5,
    ) => {
      let snappedTime = time;
      let minDistance = snapDistance;

      clips.forEach((clip) => {
        const clipStart = clip.timestamp / 1000;
        const clipEnd = (clip.timestamp + clip.duration) / 1000;

        const startDistance = Math.abs(time - clipStart);
        const endDistance = Math.abs(time - clipEnd);

        if (startDistance < minDistance) {
          snappedTime = clipStart;
          minDistance = startDistance;
        }

        if (endDistance < minDistance) {
          snappedTime = clipEnd;
          minDistance = endDistance;
        }
      });

      return snappedTime;
    },
  };
}
