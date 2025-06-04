"use client";

import { db } from "@/data/db";
import {
  TRACK_TYPE_ORDER,
  type MediaItem,
  type VideoTrack,
  type VideoKeyFrame,
} from "@/data/schema";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { cn, resolveDuration } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type DragEventHandler,
  useMemo,
  useState,
  useEffect,
  useCallback,
  createElement,
} from "react";
import { VideoControls } from "./video-controls";
import { TimelineRuler } from "./video/timeline";
import { queryKeys, refreshVideoCache } from "@/data/queries";
import { TimelineControls } from "./timeline-controls";
import { TimelineToolbar } from "./timeline-toolbar";
import { useTimelineState } from "@/hooks/use-timeline-state";
import { useProfessionalShortcuts } from "@/hooks/use-professional-shortcuts";
import {
  PlusIcon,
  LockIcon,
  UnlockIcon,
  VolumeXIcon,
  Volume2Icon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ScissorsIcon,
  MousePointerIcon,
  MoveIcon,
  ZoomInIcon,
  ZoomOutIcon,
  MaximizeIcon,
  SkipBackIcon,
  SkipForwardIcon,
  PlayIcon,
  PauseIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { ProfessionalTrackRow } from "./professional-track-row";
import { Separator } from "./ui/separator";

interface TrackGroup {
  type: string;
  label: string;
  tracks: VideoTrack[];
  collapsed: boolean;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

type Tool = "select" | "razor" | "hand" | "zoom";

export default function ProfessionalTimeline() {
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const playerCurrentTimestamp = useVideoProjectStore(
    (s) => s.playerCurrentTimestamp,
  );
  const setPlayerCurrentTimestamp = useVideoProjectStore(
    (s) => s.setPlayerCurrentTimestamp,
  );
  const player = useVideoProjectStore((s) => s.player);
  const playerState = useVideoProjectStore((s) => s.playerState);
  const setPlayerState = useVideoProjectStore((s) => s.setPlayerState);

  const formattedTimestamp =
    (playerCurrentTimestamp < 10 ? "0" : "") +
    playerCurrentTimestamp.toFixed(2);

  const [dragOverTracks, setDragOverTracks] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [timelineHeight, setTimelineHeight] = useState(400);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);

  // Professional timeline state
  const timelineState = useTimelineState();

  // Enhanced timeline state
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [magneticSnap, setMagneticSnap] = useState(true);
  const [selectedKeyframes, setSelectedKeyframes] = useState<string[]>([]);
  const [playheadPosition, setPlayheadPosition] = useState(0);

  const { data: tracks = [] } = useQuery({
    queryKey: queryKeys.projectTracks(projectId),
    queryFn: () => db.tracks.tracksByProject(projectId),
  });

  const { data: mediaItems = [] } = useQuery({
    queryKey: queryKeys.projectMediaItems(projectId),
    queryFn: () => db.media.mediaByProject(projectId),
  });

  // Get all keyframes for duration calculation
  const { data: allKeyframes = [] } = useQuery({
    queryKey: ["all-keyframes", projectId],
    queryFn: async () => {
      const allFrames: any[] = [];
      for (const track of tracks) {
        const keyframes = await db.keyFrames.keyFramesByTrack(track.id);
        allFrames.push(...keyframes);
      }
      return allFrames;
    },
    enabled: tracks.length > 0,
  });

  // Group tracks by type for better organization
  const trackGroups = useMemo((): TrackGroup[] => {
    const groups: Record<string, TrackGroup> = {};

    // Initialize groups with icons in specific order
    const trackTypes = [
      {
        type: "video",
        label: "Video Tracks",
        color: "bg-blue-600",
        icon: EyeIcon,
      },
      {
        type: "music",
        label: "Audio Tracks",
        color: "bg-green-600",
        icon: Volume2Icon,
      },
      {
        type: "voiceover",
        label: "Voiceover Tracks",
        color: "bg-purple-600",
        icon: VolumeXIcon,
      },
    ];

    trackTypes.forEach(({ type, label, color, icon }) => {
      groups[type] = {
        type,
        label,
        tracks: [],
        collapsed: collapsedGroups.has(type),
        color,
        icon,
      };
    });

    // Sort tracks by creation order within each type
    tracks.forEach((track) => {
      if (groups[track.type]) {
        groups[track.type].tracks.push(track);
      }
    });

    // Return groups in the same order as trackTypes to ensure consistency
    return trackTypes.map(({ type }) => groups[type]).filter((group) => group);
  }, [tracks, collapsedGroups]);

  // Create a flat list of all visible tracks in the correct order for alignment
  const flatTrackList = useMemo(() => {
    const flatList: Array<{
      type: "group" | "track";
      data: TrackGroup | VideoTrack;
      groupType?: string;
    }> = [];

    trackGroups.forEach((group) => {
      // Add group header
      flatList.push({ type: "group", data: group });

      // Add individual tracks if not collapsed
      if (!group.collapsed) {
        group.tracks.forEach((track) => {
          flatList.push({ type: "track", data: track, groupType: group.type });
        });
      }
    });

    return flatList;
  }, [trackGroups]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    let maxDuration = 0;

    allKeyframes.forEach((frame) => {
      const endTime = (frame.timestamp + frame.duration) / 1000;
      if (endTime > maxDuration) {
        maxDuration = endTime;
      }
    });

    return Math.max(maxDuration, 5);
  }, [allKeyframes]);

  // Add new track mutation
  const addTrackMutation = useMutation({
    mutationFn: async (trackType: string) => {
      const existingTracks = tracks.filter((t) => t.type === trackType);
      const trackNumber = existingTracks.length + 1;

      return await db.tracks.create({
        projectId,
        type: trackType as any,
        label: `${trackType.charAt(0).toUpperCase() + trackType.slice(1)} ${trackNumber}`,
        locked: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectTracks(projectId),
      });
    },
  });

  const toggleGroupCollapse = (groupType: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupType)) {
      newCollapsed.delete(groupType);
    } else {
      newCollapsed.add(groupType);
    }
    setCollapsedGroups(newCollapsed);
  };

  // Playback controls
  const handleTogglePlay = useCallback(() => {
    if (playerState === "playing") {
      setPlayerState("paused");
      player?.pause();
    } else {
      setPlayerState("playing");
      player?.play();
    }
  }, [playerState, setPlayerState, player]);

  const handleStepForward = useCallback(() => {
    const newTime = Math.min(totalDuration, playerCurrentTimestamp + 0.1);
    setPlayerCurrentTimestamp(newTime);
    player?.seekTo(newTime * 30); // Convert to frames
  }, [
    playerCurrentTimestamp,
    totalDuration,
    setPlayerCurrentTimestamp,
    player,
  ]);

  const handleStepBackward = useCallback(() => {
    const newTime = Math.max(0, playerCurrentTimestamp - 0.1);
    setPlayerCurrentTimestamp(newTime);
    player?.seekTo(newTime * 30); // Convert to frames
  }, [playerCurrentTimestamp, setPlayerCurrentTimestamp, player]);

  const handleGoToStart = useCallback(() => {
    setPlayerCurrentTimestamp(0);
    player?.seekTo(0);
  }, [setPlayerCurrentTimestamp, player]);

  const handleGoToEnd = useCallback(() => {
    setPlayerCurrentTimestamp(totalDuration);
    player?.seekTo(totalDuration * 30);
  }, [totalDuration, setPlayerCurrentTimestamp, player]);

  // Timeline controls
  const handleZoomIn = () => setTimelineZoom((prev) => Math.min(prev * 1.2, 5));
  const handleZoomOut = () =>
    setTimelineZoom((prev) => Math.max(prev / 1.2, 0.1));
  const handleFitToWindow = () => setTimelineZoom(1);

  // Professional keyboard shortcuts
  useProfessionalShortcuts({
    // Tool shortcuts
    onSelectTool: () => setActiveTool("select"),
    onRazorTool: () => setActiveTool("razor"),
    onHandTool: () => setActiveTool("hand"),

    // Playback shortcuts
    onTogglePlay: handleTogglePlay,
    onStepForward: handleStepForward,
    onStepBackward: handleStepBackward,
    onGoToStart: handleGoToStart,
    onGoToEnd: handleGoToEnd,
    onJumpForward: () => {
      const newTime = Math.min(totalDuration, playerCurrentTimestamp + 5);
      setPlayerCurrentTimestamp(newTime);
      player?.seekTo(newTime * 30);
    },
    onJumpBackward: () => {
      const newTime = Math.max(0, playerCurrentTimestamp - 5);
      setPlayerCurrentTimestamp(newTime);
      player?.seekTo(newTime * 30);
    },

    // Timeline shortcuts
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onFitToWindow: handleFitToWindow,
    onToggleSnap: () => setSnapToGrid(!snapToGrid),
    onToggleMagneticSnap: () => setMagneticSnap(!magneticSnap),

    // Editing shortcuts
    onCut: () => console.log("Cut"),
    onCopy: () => console.log("Copy"),
    onPaste: () => console.log("Paste"),
    onDelete: () => console.log("Delete"),
    onDuplicate: () => console.log("Duplicate"),
    onSelectAll: () => console.log("Select All"),
    onDeselectAll: () => console.log("Deselect All"),

    // Timeline navigation
    onCutAtPlayhead: () => console.log("Cut at playhead"),
    onSplitClip: () => console.log("Split clip"),
    onRippleDelete: () => console.log("Ripple delete"),

    // Track shortcuts
    onAddVideoTrack: () => addTrackMutation.mutate("video"),
    onAddAudioTrack: () => addTrackMutation.mutate("music"),
    onAddVoiceoverTrack: () => addTrackMutation.mutate("voiceover"),

    // Project shortcuts
    onSave: () => console.log("Save"),
    onUndo: () => console.log("Undo"),
    onRedo: () => console.log("Redo"),
    onExport: () => console.log("Export"),

    // View shortcuts
    onToggleTimeline: () => console.log("Toggle timeline"),
    onToggleMediaPanel: () => console.log("Toggle media panel"),
    onToggleProperties: () => console.log("Toggle properties"),
  });

  // Timeline resize handling
  const handleTimelineResize = useCallback(
    (e: React.MouseEvent) => {
      setIsResizingTimeline(true);
      const startY = e.clientY;
      const startHeight = timelineHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = startY - moveEvent.clientY;
        const newHeight = Math.max(200, Math.min(800, startHeight + deltaY));
        setTimelineHeight(newHeight);
      };

      const handleMouseUp = () => {
        setIsResizingTimeline(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [timelineHeight],
  );

  const handleOnDragOver: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setDragOverTracks(true);
  };

  const handleOnDrop: DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    setDragOverTracks(false);

    // Try to get media data from drag event
    let media: MediaItem | undefined;

    // First try to get the full media object
    const mediaDataJson = e.dataTransfer.getData("application/json");
    if (mediaDataJson) {
      try {
        media = JSON.parse(mediaDataJson);
      } catch (error) {
        console.warn("Failed to parse media data:", error);
      }
    }

    // Fallback to finding by ID
    if (!media) {
      const mediaId = e.dataTransfer.getData("text/plain");
      if (!mediaId) return;
      media = mediaItems.find((item: MediaItem) => item.id === mediaId);
    }

    if (!media) return;

    // Determine track type and find or create appropriate track
    const trackType = media.mediaType === "image" ? "video" : media.mediaType;
    let targetTrack = tracks.find((t) => t.type === trackType && !t.locked);

    // If no available track, create a new one
    if (!targetTrack) {
      const trackId = await addTrackMutation.mutateAsync(trackType);
      const updatedTracks = await db.tracks.tracksByProject(projectId);
      targetTrack = updatedTracks.find((t) => t.id === trackId);
    }

    if (!targetTrack) return;

    const duration = resolveDuration(media) ?? 5000;
    await db.keyFrames.create({
      trackId: targetTrack.id,
      timestamp: playerCurrentTimestamp * 1000,
      duration,
      data: {
        type:
          media.mediaType === "image"
            ? "image"
            : media.mediaType === "video"
              ? "video"
              : "prompt",
        mediaId: media.id,
        prompt: media.input?.prompt || "",
        url: media.url || "",
      },
    });

    refreshVideoCache(queryClient, projectId);
  };

  // Timeline click to seek
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== "select") return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const timelineWidth = rect.width;
      const clickTime = (x / timelineWidth) * totalDuration;

      setPlayerCurrentTimestamp(
        Math.max(0, Math.min(totalDuration, clickTime)),
      );
      player?.seekTo(clickTime * 30);
    },
    [activeTool, totalDuration, setPlayerCurrentTimestamp, player],
  );

  return (
    <div className="flex flex-col border-t border-border bg-background">
      {/* Professional Timeline Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        {/* Tool Selection */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={activeTool === "select" ? "default" : "ghost"}
            onClick={() => setActiveTool("select")}
            className="h-8 w-8 p-0"
          >
            <MousePointerIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={activeTool === "razor" ? "default" : "ghost"}
            onClick={() => setActiveTool("razor")}
            className="h-8 w-8 p-0"
          >
            <ScissorsIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={activeTool === "hand" ? "default" : "ghost"}
            onClick={() => setActiveTool("hand")}
            className="h-8 w-8 p-0"
          >
            <MoveIcon className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Snap Controls */}
          <Button
            size="sm"
            variant={snapToGrid ? "default" : "ghost"}
            onClick={() => setSnapToGrid(!snapToGrid)}
            className="h-8 px-3"
          >
            Snap
          </Button>
          <Button
            size="sm"
            variant={magneticSnap ? "default" : "ghost"}
            onClick={() => setMagneticSnap(!magneticSnap)}
            className="h-8 px-3"
          >
            Magnetic
          </Button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleGoToStart}
            className="h-8 w-8 p-0"
          >
            <SkipBackIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStepBackward}
            className="h-8 w-8 p-0"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleTogglePlay}
            className="h-8 w-8 p-0"
          >
            {playerState === "playing" ? (
              <PauseIcon className="w-4 h-4" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStepForward}
            className="h-8 w-8 p-0"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleGoToEnd}
            className="h-8 w-8 p-0"
          >
            <SkipForwardIcon className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-2" />

          <span className="text-sm font-mono text-muted-foreground min-w-[60px]">
            {formattedTimestamp}s
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomOut}
            className="h-8 w-8 p-0"
          >
            <ZoomOutIcon className="w-4 h-4" />
          </Button>
          <div className="w-20">
            <Slider
              value={[timelineZoom * 100]}
              onValueChange={(value) => setTimelineZoom(value[0] / 100)}
              min={10}
              max={500}
              step={10}
              className="w-full"
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomIn}
            className="h-8 w-8 p-0"
          >
            <ZoomInIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFitToWindow}
            className="h-8 w-8 p-0"
          >
            <MaximizeIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Timeline Resize Handle */}
      <div
        className={cn(
          "h-1 bg-border hover:bg-primary cursor-row-resize transition-colors",
          { "bg-primary": isResizingTimeline },
        )}
        onMouseDown={handleTimelineResize}
      />

      {/* Enhanced Timeline */}
      <div
        className="flex flex-row overflow-hidden"
        style={{ height: `${timelineHeight}px` }}
      >
        {/* Track Headers */}
        <div className="w-64 border-r border-border bg-muted/30 overflow-y-auto">
          <div className="h-8 border-b border-border bg-muted/50 flex items-center px-2">
            <span className="text-xs font-medium text-muted-foreground">
              TRACKS
            </span>
          </div>

          {flatTrackList.map((item, index) => (
            <div key={`header-${item.type}-${index}`}>
              {item.type === "group" ? (
                /* Group Header */
                <div className="flex items-center justify-between px-2 bg-muted/50 border-b border-border h-8">
                  <button
                    onClick={() =>
                      toggleGroupCollapse((item.data as TrackGroup).type)
                    }
                    className="flex items-center gap-2 text-sm font-medium hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                  >
                    {(item.data as TrackGroup).collapsed ? (
                      <ChevronRightIcon className="w-3 h-3" />
                    ) : (
                      <ChevronDownIcon className="w-3 h-3" />
                    )}
                    {createElement((item.data as TrackGroup).icon, {
                      className: "w-3 h-3",
                    })}
                    <span>{(item.data as TrackGroup).label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(item.data as TrackGroup).tracks.length})
                    </span>
                  </button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      addTrackMutation.mutate((item.data as TrackGroup).type)
                    }
                    className="h-6 w-6 p-0"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                /* Track Header */
                <ProfessionalTrackHeader
                  key={(item.data as VideoTrack).id}
                  track={item.data as VideoTrack}
                />
              )}
            </div>
          ))}
        </div>

        {/* Timeline Area */}
        <div
          className={cn(
            "flex-1 flex flex-col overflow-auto transition-colors relative",
            {
              "bg-white/5": dragOverTracks,
            },
          )}
          onDragOver={handleOnDragOver}
          onDragLeave={() => setDragOverTracks(false)}
          onDrop={handleOnDrop}
          onClick={handleTimelineClick}
          style={{
            transform: `scaleX(${timelineZoom})`,
            transformOrigin: "left center",
          }}
        >
          {/* Playhead */}
          <div
            className="absolute z-[32] top-0 bottom-0 w-[2px] bg-red-500 pointer-events-none"
            style={{
              left: `${((playerCurrentTimestamp / totalDuration) * 100).toFixed(2)}%`,
            }}
          >
            <div className="absolute top-0 left-[-6px] w-3 h-3 bg-red-500 transform rotate-45" />
          </div>

          {/* Timeline Ruler */}
          <div className="h-8 border-b border-border bg-muted/50 relative">
            <TimelineRuler
              duration={totalDuration}
              className="z-30 pointer-events-none h-full"
            />
          </div>

          {/* Track Rows */}
          <div className="flex flex-col">
            {flatTrackList.map((item, index) => (
              <div key={`${item.type}-${index}`}>
                {item.type === "group" ? (
                  /* Group Spacer */
                  <div className="h-8 bg-muted/20 border-b border-border flex items-center px-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {(item.data as TrackGroup).label.toUpperCase()}
                    </span>
                  </div>
                ) : (
                  /* Track Row */
                  <ProfessionalTrackRow
                    key={(item.data as VideoTrack).id}
                    track={item.data as VideoTrack}
                    timelineState={timelineState}
                    activeTool={activeTool}
                    snapToGrid={snapToGrid}
                    magneticSnap={magneticSnap}
                    totalDuration={totalDuration}
                    playerCurrentTimestamp={playerCurrentTimestamp}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProfessionalTrackHeaderProps {
  track: VideoTrack;
}

function ProfessionalTrackHeader({ track }: ProfessionalTrackHeaderProps) {
  const queryClient = useQueryClient();
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [solo, setSolo] = useState(false);
  const [locked, setLocked] = useState(track.locked);

  const deleteTrackMutation = useMutation({
    mutationFn: async () => {
      // First delete all keyframes on this track
      const keyframes = await db.keyFrames.keyFramesByTrack(track.id);
      await Promise.all(
        keyframes.map((frame) => db.keyFrames.delete(frame.id)),
      );

      // Then delete the track
      return await db.tracks.delete(track.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectTracks(track.projectId),
      });
      refreshVideoCache(queryClient, track.projectId);
    },
  });

  return (
    <div className="flex flex-col border-b border-border bg-background h-16 px-2 py-1">
      {/* Track Name and Menu */}
      <div className="flex items-center justify-between h-6 mb-1">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <GripVerticalIcon className="w-3 h-3 text-muted-foreground cursor-grab flex-shrink-0" />
          <span className="text-xs font-medium truncate">{track.label}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 flex-shrink-0"
            >
              <MoreHorizontalIcon className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Rename Track</DropdownMenuItem>
            <DropdownMenuItem>Duplicate Track</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteTrackMutation.mutate()}
            >
              Delete Track
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Track Controls Row */}
      <div className="flex items-center gap-1 h-5 mb-1">
        <Button
          size="sm"
          variant={muted ? "destructive" : "ghost"}
          onClick={() => setMuted(!muted)}
          className="h-5 w-5 p-0"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <VolumeXIcon className="w-2.5 h-2.5" />
          ) : (
            <Volume2Icon className="w-2.5 h-2.5" />
          )}
        </Button>

        <Button
          size="sm"
          variant={solo ? "default" : "ghost"}
          onClick={() => setSolo(!solo)}
          className="h-5 w-5 p-0 text-[10px] font-bold"
          title={solo ? "Unsolo" : "Solo"}
        >
          S
        </Button>

        <Button
          size="sm"
          variant={locked ? "secondary" : "ghost"}
          onClick={() => setLocked(!locked)}
          className="h-5 w-5 p-0"
          title={locked ? "Unlock" : "Lock"}
        >
          {locked ? (
            <LockIcon className="w-2.5 h-2.5" />
          ) : (
            <UnlockIcon className="w-2.5 h-2.5" />
          )}
        </Button>

        {/* Volume Level Indicator */}
        <div className="flex-1 flex items-center gap-1 min-w-0">
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            Vol:
          </span>
          <span className="text-[10px] font-mono text-muted-foreground min-w-[24px]">
            {volume}
          </span>
        </div>
      </div>

      {/* Compact Volume Slider - Always show for all tracks */}
      <div className="flex items-center gap-1 h-4">
        <div className="flex-1">
          <Slider
            value={[volume]}
            onValueChange={(value) => setVolume(value[0])}
            max={100}
            step={1}
            className="w-full h-3"
          />
        </div>
        <span className="text-[9px] text-muted-foreground w-6 text-right">
          {volume}%
        </span>
      </div>
    </div>
  );
}
