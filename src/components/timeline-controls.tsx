import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import { WithTooltip } from "./ui/tooltip";
import {
  ZoomInIcon,
  ZoomOutIcon,
  FullscreenIcon,
  GridIcon,
  MagnetIcon,
  UndoIcon,
  RedoIcon,
  SaveIcon,
  ClockIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineControlsProps {
  // Zoom controls
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitToWindow: () => void;
  onZoomToSelection: () => void;

  // Timeline features
  snapToGrid: boolean;
  onSnapToggle: () => void;
  magneticSnap: boolean;
  onMagneticSnapToggle: () => void;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  // Save status
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  lastSaved?: Date | null;
  onSave?: () => void;

  // Selection info
  selectedCount?: number;
  totalDuration?: number;
}

export function TimelineControls({
  zoom,
  onZoomChange,
  onFitToWindow,
  onZoomToSelection,
  snapToGrid,
  onSnapToggle,
  magneticSnap,
  onMagneticSnapToggle,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isSaving = false,
  hasUnsavedChanges = false,
  lastSaved,
  onSave,
  selectedCount = 0,
  totalDuration = 0,
}: TimelineControlsProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatLastSaved = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <WithTooltip tooltip="Undo (Ctrl+Z)">
          <Button
            size="sm"
            variant="ghost"
            onClick={onUndo}
            disabled={!canUndo}
            className="h-8 w-8 p-0"
          >
            <UndoIcon className="h-4 w-4" />
          </Button>
        </WithTooltip>
        <WithTooltip tooltip="Redo (Ctrl+Y)">
          <Button
            size="sm"
            variant="ghost"
            onClick={onRedo}
            disabled={!canRedo}
            className="h-8 w-8 p-0"
          >
            <RedoIcon className="h-4 w-4" />
          </Button>
        </WithTooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <WithTooltip tooltip="Zoom Out">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
            className="h-8 w-8 p-0"
          >
            <ZoomOutIcon className="h-4 w-4" />
          </Button>
        </WithTooltip>

        <div className="flex items-center gap-2 min-w-[120px]">
          <Slider
            value={[zoom]}
            onValueChange={([value]) => onZoomChange(value)}
            min={0.1}
            max={5}
            step={0.1}
            className="w-20"
          />
          <span className="text-xs text-muted-foreground min-w-[35px]">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <WithTooltip tooltip="Zoom In">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onZoomChange(Math.min(5, zoom + 0.1))}
            className="h-8 w-8 p-0"
          >
            <ZoomInIcon className="h-4 w-4" />
          </Button>
        </WithTooltip>

        <WithTooltip tooltip="Fit to Window">
          <Button
            size="sm"
            variant="ghost"
            onClick={onFitToWindow}
            className="h-8 w-8 p-0"
          >
            <FullscreenIcon className="h-4 w-4" />
          </Button>
        </WithTooltip>

        {selectedCount > 0 && (
          <WithTooltip tooltip="Zoom to Selection">
            <Button
              size="sm"
              variant="ghost"
              onClick={onZoomToSelection}
              className="text-xs px-2 h-8"
            >
              Zoom to Selection
            </Button>
          </WithTooltip>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Timeline Features */}
      <div className="flex items-center gap-1">
        <WithTooltip tooltip="Snap to Grid">
          <Button
            size="sm"
            variant={snapToGrid ? "default" : "ghost"}
            onClick={onSnapToggle}
            className="h-8 w-8 p-0"
          >
            <GridIcon className="h-4 w-4" />
          </Button>
        </WithTooltip>

        <WithTooltip tooltip="Magnetic Snap">
          <Button
            size="sm"
            variant={magneticSnap ? "default" : "ghost"}
            onClick={onMagneticSnapToggle}
            className="h-8 w-8 p-0"
          >
            <MagnetIcon className="h-4 w-4" />
          </Button>
        </WithTooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Project Info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          <span>{formatDuration(totalDuration)}</span>
        </div>

        {selectedCount > 0 && <span>{selectedCount} selected</span>}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save Status */}
      <div className="flex items-center gap-2">
        {onSave && (
          <WithTooltip tooltip="Save Project (Ctrl+S)">
            <Button
              size="sm"
              variant="ghost"
              onClick={onSave}
              disabled={isSaving}
              className={cn(
                "h-8 px-3 text-xs",
                hasUnsavedChanges && "text-orange-500",
              )}
            >
              <SaveIcon
                className={cn("h-3 w-3 mr-1", isSaving && "animate-spin")}
              />
              {isSaving ? "Saving..." : hasUnsavedChanges ? "Save" : "Saved"}
            </Button>
          </WithTooltip>
        )}

        <div className="text-xs text-muted-foreground">
          Last saved: {formatLastSaved(lastSaved || null)}
        </div>
      </div>
    </div>
  );
}
