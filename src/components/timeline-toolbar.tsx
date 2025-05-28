import {
  MousePointer2,
  Scissors,
  Move,
  ArrowUpDown,
  Magnet,
  Grid3X3,
  Copy,
  Clipboard,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { WithTooltip } from "./ui/tooltip";
import { cn } from "@/lib/utils";
import { type TimelineTool } from "@/hooks/use-timeline-state";

interface TimelineToolbarProps {
  activeTool: TimelineTool;
  onToolChange: (tool: TimelineTool) => void;
  snapEnabled: boolean;
  onSnapToggle: () => void;
  magneticSnap: boolean;
  onMagneticSnapToggle: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  selectedCount: number;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
}

const tools = [
  {
    id: "select" as const,
    icon: MousePointer2,
    label: "Select Tool",
    shortcut: "V",
    description: "Select and move clips",
  },
  {
    id: "razor" as const,
    icon: Scissors,
    label: "Razor Tool",
    shortcut: "C",
    description: "Cut clips at cursor position",
  },
  {
    id: "slip" as const,
    icon: Move,
    label: "Slip Tool",
    shortcut: "Y",
    description: "Change clip content without moving position",
  },
  {
    id: "slide" as const,
    icon: ArrowUpDown,
    label: "Slide Tool",
    shortcut: "U",
    description: "Move clip and adjust adjacent clips",
  },
];

export function TimelineToolbar({
  activeTool,
  onToolChange,
  snapEnabled,
  onSnapToggle,
  magneticSnap,
  onMagneticSnapToggle,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selectedCount,
  onCopy,
  onPaste,
  onDuplicate,
}: TimelineToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-background">
      {/* Tools */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <WithTooltip
              key={tool.id}
              tooltip={`${tool.label} (${tool.shortcut})`}
            >
              <Button
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  isActive && "bg-primary text-primary-foreground",
                )}
                onClick={() => onToolChange(tool.id)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </WithTooltip>
          );
        })}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Snap Controls */}
      <div className="flex items-center gap-1">
        <WithTooltip tooltip="Snap to Grid">
          <Button
            variant={snapEnabled ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onSnapToggle}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </WithTooltip>

        <WithTooltip tooltip="Magnetic Snap">
          <Button
            variant={magneticSnap ? "default" : "ghost"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onMagneticSnapToggle}
          >
            <Magnet className="h-4 w-4" />
          </Button>
        </WithTooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Edit Actions */}
      <div className="flex items-center gap-1">
        <WithTooltip tooltip="Undo (Ctrl+Z)">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </WithTooltip>

        <WithTooltip tooltip="Redo (Ctrl+Y)">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </WithTooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Clipboard Actions */}
      <div className="flex items-center gap-1">
        <WithTooltip tooltip="Copy (Ctrl+C)">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onCopy}
            disabled={selectedCount === 0}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </WithTooltip>

        <WithTooltip tooltip="Paste (Ctrl+V)">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onPaste}
          >
            <Clipboard className="h-4 w-4" />
          </Button>
        </WithTooltip>
      </div>

      {/* Selection Info */}
      {selectedCount > 0 && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="text-sm text-muted-foreground px-2">
            {selectedCount} clip{selectedCount !== 1 ? "s" : ""} selected
          </div>
        </>
      )}
    </div>
  );
}
