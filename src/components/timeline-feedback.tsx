import { cn } from "@/lib/utils";

interface SnapLineProps {
  position: number; // pixels from left
  type: "clip" | "playhead" | "marker" | "grid";
  visible: boolean;
}

export function SnapLine({ position, type, visible }: SnapLineProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 w-px z-50 pointer-events-none transition-opacity duration-150",
        {
          "bg-blue-400 shadow-sm": type === "clip",
          "bg-red-400 shadow-sm": type === "playhead",
          "bg-yellow-400 shadow-sm": type === "marker",
          "bg-gray-400/60": type === "grid",
        },
      )}
      style={{ left: `${position}px` }}
    />
  );
}

interface SelectionBoxProps {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  visible: boolean;
}

export function SelectionBox({
  startX,
  startY,
  currentX,
  currentY,
  visible,
}: SelectionBoxProps) {
  if (!visible) return null;

  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  return (
    <div
      className="absolute border-2 border-blue-400 bg-blue-400/10 pointer-events-none z-40 rounded-sm"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}

interface CutPreviewProps {
  position: number; // pixels from left
  trackId: string;
  visible: boolean;
}

export function CutPreview({ position, visible }: CutPreviewProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute top-0 bottom-0 w-px z-50 pointer-events-none bg-red-500 shadow-lg"
      style={{ left: `${position}px` }}
    >
      {/* Cut indicator line */}
      <div className="absolute inset-0 bg-red-500 animate-pulse" />

      {/* Scissors icon at top */}
      <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
        <div className="w-2 h-2 text-white text-xs">✂</div>
      </div>
    </div>
  );
}

interface ClipHighlightProps {
  clipId: string;
  type: "selected" | "hover" | "cutting" | "dragging";
  children: React.ReactNode;
}

export function ClipHighlight({ type, children }: ClipHighlightProps) {
  return (
    <div
      className={cn("relative transition-all duration-150", {
        // Selected state
        "ring-2 ring-blue-400 ring-offset-1 ring-offset-transparent":
          type === "selected",

        // Hover state
        "ring-1 ring-white/30": type === "hover",

        // Cutting state
        "ring-2 ring-red-400 ring-dashed": type === "cutting",

        // Dragging state
        "opacity-80 scale-[1.02] shadow-lg ring-2 ring-blue-300":
          type === "dragging",
      })}
    >
      {children}
    </div>
  );
}

interface DragGhostProps {
  clipData: {
    width: number;
    height: number;
    content: string;
    type: "video" | "music" | "voiceover";
  };
  position: { x: number; y: number };
  visible: boolean;
}

export function DragGhost({ clipData, position, visible }: DragGhostProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute z-50 pointer-events-none opacity-70 rounded-lg border-2 border-dashed",
        "flex items-center justify-center text-white text-sm font-medium",
        {
          "bg-sky-600/80 border-sky-400": clipData.type === "video",
          "bg-teal-500/80 border-teal-400": clipData.type === "music",
          "bg-indigo-500/80 border-indigo-400": clipData.type === "voiceover",
        },
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${clipData.width}px`,
        height: `${clipData.height}px`,
      }}
    >
      {clipData.content}
    </div>
  );
}

interface TimelineOverlayProps {
  children: React.ReactNode;
}

export function TimelineOverlay({ children }: TimelineOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30">{children}</div>
  );
}
