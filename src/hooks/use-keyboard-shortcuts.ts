import { useEffect, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface KeyboardShortcutsConfig {
  // Playback controls
  onTogglePlayback?: () => void;
  onGoToStart?: () => void;
  onGoToEnd?: () => void;
  onStepBackward?: () => void;
  onStepForward?: () => void;

  // Editing
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: () => void;

  // Selection
  onSelectAll?: () => void;
  onDeselectAll?: () => void;

  // Timeline
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitToWindow?: () => void;
  onToggleSnap?: () => void;

  // Project
  onSave?: () => void;
  onExport?: () => void;
  onNewProject?: () => void;

  // Tools
  onSelectTool?: () => void;
  onCutTool?: () => void;
  onTextTool?: () => void;

  // Misc
  onToggleFullscreen?: () => void;
  onShowHelp?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onTogglePlayback,
    onGoToStart,
    onGoToEnd,
    onStepBackward,
    onStepForward,
    onCopy,
    onPaste,
    onCut,
    onDelete,
    onUndo,
    onRedo,
    onDuplicate,
    onSelectAll,
    onDeselectAll,
    onZoomIn,
    onZoomOut,
    onFitToWindow,
    onToggleSnap,
    onSave,
    onExport,
    onNewProject,
    onSelectTool,
    onCutTool,
    onTextTool,
    onToggleFullscreen,
    onShowHelp,
  } = config;

  // Playback controls
  useHotkeys(
    "space",
    (e) => {
      e.preventDefault();
      onTogglePlayback?.();
    },
    { enableOnFormTags: false },
  );

  useHotkeys("home", (e) => {
    e.preventDefault();
    onGoToStart?.();
  });

  useHotkeys("end", (e) => {
    e.preventDefault();
    onGoToEnd?.();
  });

  useHotkeys("left", (e) => {
    e.preventDefault();
    onStepBackward?.();
  });

  useHotkeys("right", (e) => {
    e.preventDefault();
    onStepForward?.();
  });

  // Editing shortcuts
  useHotkeys("ctrl+c, cmd+c", (e) => {
    e.preventDefault();
    onCopy?.();
  });

  useHotkeys("ctrl+v, cmd+v", (e) => {
    e.preventDefault();
    onPaste?.();
  });

  useHotkeys("ctrl+x, cmd+x", (e) => {
    e.preventDefault();
    onCut?.();
  });

  useHotkeys("delete, backspace", (e) => {
    e.preventDefault();
    onDelete?.();
  });

  useHotkeys("ctrl+z, cmd+z", (e) => {
    e.preventDefault();
    onUndo?.();
  });

  useHotkeys("ctrl+y, cmd+y, ctrl+shift+z, cmd+shift+z", (e) => {
    e.preventDefault();
    onRedo?.();
  });

  useHotkeys("ctrl+d, cmd+d", (e) => {
    e.preventDefault();
    onDuplicate?.();
  });

  // Selection shortcuts
  useHotkeys("ctrl+a, cmd+a", (e) => {
    e.preventDefault();
    onSelectAll?.();
  });

  useHotkeys("ctrl+shift+a, cmd+shift+a", (e) => {
    e.preventDefault();
    onDeselectAll?.();
  });

  // Timeline shortcuts
  useHotkeys("plus, =", (e) => {
    e.preventDefault();
    onZoomIn?.();
  });

  useHotkeys("minus, -", (e) => {
    e.preventDefault();
    onZoomOut?.();
  });

  useHotkeys("ctrl+0, cmd+0", (e) => {
    e.preventDefault();
    onFitToWindow?.();
  });

  useHotkeys(
    "s",
    (e) => {
      e.preventDefault();
      onToggleSnap?.();
    },
    { enableOnFormTags: false },
  );

  // Project shortcuts
  useHotkeys("ctrl+s, cmd+s", (e) => {
    e.preventDefault();
    onSave?.();
  });

  useHotkeys("ctrl+e, cmd+e", (e) => {
    e.preventDefault();
    onExport?.();
  });

  useHotkeys("ctrl+n, cmd+n", (e) => {
    e.preventDefault();
    onNewProject?.();
  });

  // Tool shortcuts
  useHotkeys(
    "v",
    (e) => {
      e.preventDefault();
      onSelectTool?.();
    },
    { enableOnFormTags: false },
  );

  useHotkeys(
    "c",
    (e) => {
      e.preventDefault();
      onCutTool?.();
    },
    { enableOnFormTags: false },
  );

  useHotkeys(
    "t",
    (e) => {
      e.preventDefault();
      onTextTool?.();
    },
    { enableOnFormTags: false },
  );

  // Misc shortcuts
  useHotkeys("f11", (e) => {
    e.preventDefault();
    onToggleFullscreen?.();
  });

  useHotkeys("f1, ?", (e) => {
    e.preventDefault();
    onShowHelp?.();
  });

  // Return a function to show available shortcuts
  const getShortcutsList = useCallback(() => {
    return [
      {
        category: "Playback",
        shortcuts: [
          { key: "Space", description: "Play/Pause" },
          { key: "Home", description: "Go to start" },
          { key: "End", description: "Go to end" },
          { key: "←/→", description: "Step backward/forward" },
        ],
      },
      {
        category: "Editing",
        shortcuts: [
          { key: "Ctrl+C", description: "Copy" },
          { key: "Ctrl+V", description: "Paste" },
          { key: "Ctrl+X", description: "Cut" },
          { key: "Delete", description: "Delete selection" },
          { key: "Ctrl+Z", description: "Undo" },
          { key: "Ctrl+Y", description: "Redo" },
          { key: "Ctrl+D", description: "Duplicate" },
        ],
      },
      {
        category: "Selection",
        shortcuts: [
          { key: "Ctrl+A", description: "Select all" },
          { key: "Ctrl+Shift+A", description: "Deselect all" },
        ],
      },
      {
        category: "Timeline",
        shortcuts: [
          { key: "+/-", description: "Zoom in/out" },
          { key: "Ctrl+0", description: "Fit to window" },
          { key: "S", description: "Toggle snap" },
        ],
      },
      {
        category: "Project",
        shortcuts: [
          { key: "Ctrl+S", description: "Save project" },
          { key: "Ctrl+E", description: "Export video" },
          { key: "Ctrl+N", description: "New project" },
        ],
      },
      {
        category: "Tools",
        shortcuts: [
          { key: "V", description: "Select tool" },
          { key: "C", description: "Cut tool" },
          { key: "T", description: "Text tool" },
        ],
      },
      {
        category: "Misc",
        shortcuts: [
          { key: "F11", description: "Toggle fullscreen" },
          { key: "F1", description: "Show help" },
        ],
      },
    ];
  }, []);

  return { getShortcutsList };
}
