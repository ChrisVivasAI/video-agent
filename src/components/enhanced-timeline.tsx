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
import { type DragEventHandler, useMemo, useState, useEffect } from "react";
import { VideoControls } from "./video-controls";
import { TimelineRuler } from "./video/timeline";
import { queryKeys, refreshVideoCache } from "@/data/queries";
import { TimelineControls } from "./timeline-controls";
import { TimelineToolbar } from "./timeline-toolbar";
import { useTimelineState } from "@/hooks/use-timeline-state";
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
} from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { EnhancedTrackRow } from "./enhanced-track-row";

interface TrackGroup {
  type: string;
  label: string;
  tracks: VideoTrack[];
  collapsed: boolean;
  color: string;
}

export default function EnhancedTimeline() {
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const playerCurrentTimestamp = useVideoProjectStore(
    (s) => s.playerCurrentTimestamp,
  );
  const player = useVideoProjectStore((s) => s.player);
  const formattedTimestamp =
    (playerCurrentTimestamp < 10 ? "0" : "") +
    playerCurrentTimestamp.toFixed(2);
  const [dragOverTracks, setDragOverTracks] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  // Professional timeline state
  const timelineState = useTimelineState();

  // Enhanced timeline state
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [magneticSnap, setMagneticSnap] = useState(true);
  const [selectedKeyframes, setSelectedKeyframes] = useState<string[]>([]);

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
    queryKey: queryKeys.allKeyframes(projectId),
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

    // Initialize groups
    const trackTypes = [
      { type: "video", label: "Video Tracks", color: "bg-blue-600" },
      { type: "music", label: "Audio Tracks", color: "bg-green-600" },
      { type: "voiceover", label: "Voiceover Tracks", color: "bg-purple-600" },
    ];

    trackTypes.forEach(({ type, label, color }) => {
      groups[type] = {
        type,
        label,
        tracks: [],
        collapsed: collapsedGroups.has(type),
        color,
      };
    });

    // Sort tracks by creation order within each type
    tracks.forEach((track) => {
      if (groups[track.type]) {
        groups[track.type].tracks.push(track);
      }
    });

    return Object.values(groups).filter((group) => group.tracks.length > 0);
  }, [tracks, collapsedGroups]);

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

  const minTrackWidth = useMemo(
    () => `${((2 / totalDuration) * 100).toFixed(2)}%`,
    [totalDuration],
  );

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

  return (
    <div className="flex flex-col border-t border-border">
      {/* Professional Timeline Toolbar */}
      <TimelineToolbar
        activeTool={timelineState.state.activeTool}
        onToolChange={timelineState.setActiveTool}
        snapEnabled={timelineState.state.snapEnabled}
        onSnapToggle={timelineState.toggleSnap}
        magneticSnap={timelineState.state.magneticSnap}
        onMagneticSnapToggle={timelineState.toggleMagneticSnap}
        canUndo={false}
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
        selectedCount={timelineState.state.selectedClips.size}
        onCopy={() => {}}
        onPaste={() => {}}
        onDuplicate={() => {}}
      />

      {/* Timeline Controls */}
      <TimelineControls
        zoom={timelineZoom}
        onZoomChange={setTimelineZoom}
        onFitToWindow={() => setTimelineZoom(1)}
        onZoomToSelection={() => setTimelineZoom(2)}
        snapToGrid={snapToGrid}
        onSnapToggle={() => setSnapToGrid(!snapToGrid)}
        magneticSnap={magneticSnap}
        onMagneticSnapToggle={() => setMagneticSnap(!magneticSnap)}
        canUndo={false}
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
        selectedCount={selectedKeyframes.length}
        totalDuration={totalDuration}
        onSave={() => {}}
      />

      {/* Video Controls */}
      <div className="flex flex-row items-center justify-between px-4 py-2 border-b border-border">
        <VideoControls />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formattedTimestamp}s
          </span>
        </div>
      </div>

      {/* Enhanced Timeline */}
      <div className="flex flex-row h-96 overflow-hidden">
        {/* Track Headers */}
        <div className="w-64 border-r border-border bg-muted/30 overflow-y-auto">
          <div className="h-8 border-b border-border" /> {/* Ruler space */}
          {trackGroups.map((group) => (
            <div key={group.type} className="border-b border-border">
              {/* Group Header */}
              <div className="flex items-center justify-between p-2 bg-muted/50 border-b border-border">
                <button
                  onClick={() => toggleGroupCollapse(group.type)}
                  className="flex items-center gap-2 text-sm font-medium hover:bg-muted/50 px-2 py-1 rounded"
                >
                  <div className={cn("w-3 h-3 rounded", group.color)} />
                  <span>{group.label}</span>
                  <span className="text-xs text-muted-foreground">
                    ({group.tracks.length})
                  </span>
                </button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => addTrackMutation.mutate(group.type)}
                  className="h-6 w-6 p-0"
                >
                  <PlusIcon className="w-3 h-3" />
                </Button>
              </div>

              {/* Track Headers */}
              {!group.collapsed &&
                group.tracks.map((track) => (
                  <TrackHeader key={track.id} track={track} />
                ))}
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
          />

          {/* Timeline Ruler */}
          <TimelineRuler
            duration={totalDuration}
            className="z-30 pointer-events-none h-8 border-b border-border"
          />

          {/* Track Rows */}
          <div className="flex flex-col">
            {trackGroups.map((group) => (
              <div key={group.type}>
                {/* Group Spacer */}
                <div className="h-8 bg-muted/20 border-b border-border" />

                {/* Track Rows */}
                {!group.collapsed &&
                  group.tracks.map((track) => (
                    <EnhancedTrackRow
                      key={track.id}
                      track={track}
                      timelineState={timelineState}
                      minTrackWidth={minTrackWidth}
                      totalDuration={totalDuration}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TrackHeaderProps {
  track: VideoTrack;
}

function TrackHeader({ track }: TrackHeaderProps) {
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [solo, setSolo] = useState(false);
  const [locked, setLocked] = useState(track.locked);

  return (
    <div className="flex flex-col p-2 border-b border-border bg-background min-h-[64px]">
      {/* Track Name and Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <GripVerticalIcon className="w-3 h-3 text-muted-foreground cursor-grab" />
          <span className="text-sm font-medium truncate">{track.label}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <MoreHorizontalIcon className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Rename Track</DropdownMenuItem>
            <DropdownMenuItem>Duplicate Track</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Delete Track
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Track Controls */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={muted ? "destructive" : "ghost"}
          onClick={() => setMuted(!muted)}
          className="h-6 w-6 p-0"
        >
          {muted ? (
            <VolumeXIcon className="w-3 h-3" />
          ) : (
            <Volume2Icon className="w-3 h-3" />
          )}
        </Button>

        <Button
          size="sm"
          variant={solo ? "default" : "ghost"}
          onClick={() => setSolo(!solo)}
          className="h-6 w-6 p-0 text-xs"
        >
          S
        </Button>

        <Button
          size="sm"
          variant={locked ? "secondary" : "ghost"}
          onClick={() => setLocked(!locked)}
          className="h-6 w-6 p-0"
        >
          {locked ? (
            <LockIcon className="w-3 h-3" />
          ) : (
            <UnlockIcon className="w-3 h-3" />
          )}
        </Button>
      </div>

      {/* Volume Slider */}
      {track.type !== "video" && (
        <div className="mt-2">
          <Slider
            value={[volume]}
            onValueChange={(value) => setVolume(value[0])}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
