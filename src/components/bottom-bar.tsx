import { db } from "@/data/db";
import {
  TRACK_TYPE_ORDER,
  type MediaItem,
  type VideoTrack,
} from "@/data/schema";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { cn, resolveDuration } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type DragEventHandler, useMemo, useState, useEffect } from "react";
import { VideoControls } from "./video-controls";
import { TimelineRuler } from "./video/timeline";
import { VideoTrackRow } from "./video/track";
import { queryKeys, refreshVideoCache } from "@/data/queries";
import { TimelineControls } from "./timeline-controls";
import { TimelineToolbar } from "./timeline-toolbar";
import { useTimelineState } from "@/hooks/use-timeline-state";
import { useTimelineShortcuts } from "@/hooks/use-timeline-shortcuts";

export default function BottomBar() {
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

  // Professional timeline state
  const timelineState = useTimelineState();

  // Enhanced timeline state (keeping existing for compatibility)
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [magneticSnap, setMagneticSnap] = useState(true);
  const [selectedKeyframes, setSelectedKeyframes] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState<any[]>([]);

  const limitAllKeyframesToThirtySeconds = useMutation({
    mutationFn: async () => {
      const tracks = await db.tracks.tracksByProject(projectId);

      let updatedCount = 0;

      for (const track of tracks) {
        const keyframes = await db.keyFrames.keyFramesByTrack(track.id);

        for (const frame of keyframes) {
          if (frame.duration > 30000) {
            await db.keyFrames.update(frame.id, {
              duration: 30000,
            });
            updatedCount++;
          }
        }
      }

      return updatedCount;
    },
    onSuccess: (updatedCount) => {
      if (updatedCount > 0) {
        refreshVideoCache(queryClient, projectId);
      }
    },
  });

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

  const trackObj = useMemo(() => {
    const obj: Record<string, VideoTrack | null> = {};
    const sortedTracks = [...tracks].sort(
      (a, b) => TRACK_TYPE_ORDER[a.type] - TRACK_TYPE_ORDER[b.type],
    );

    for (const track of sortedTracks) {
      obj[track.type] = track;
    }

    for (const trackType of Object.keys(TRACK_TYPE_ORDER)) {
      if (!obj[trackType]) {
        obj[trackType] = null;
      }
    }

    return obj;
  }, [tracks]);

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

  // Timeline handlers
  const handleClipSelect = (clipId: string, multiSelect: boolean) => {
    timelineState.selectClip(clipId, multiSelect);
  };

  const handleClipCut = async (clipId: string, position: number) => {
    // Find the keyframe
    const keyframe = await db.keyFrames.find(clipId);
    if (!keyframe) return;

    // Calculate the split point
    const splitPoint = position - keyframe.timestamp;
    if (splitPoint <= 0 || splitPoint >= keyframe.duration) return;

    // Create new keyframe for the second part
    const secondPart = {
      timestamp: position,
      duration: keyframe.duration - splitPoint,
      trackId: keyframe.trackId,
      data: keyframe.data,
    };

    // Update first part
    await db.keyFrames.update(clipId, {
      duration: splitPoint,
    });

    // Create second part
    await db.keyFrames.create(secondPart);

    // Refresh cache
    refreshVideoCache(queryClient, projectId);
  };

  const handleClipDrag = (clipId: string, deltaX: number) => {
    // Handle clip dragging with snapping
    console.log("Clip drag:", clipId, deltaX);
  };

  const handleClipResize = (
    clipId: string,
    handle: "left" | "right",
    deltaX: number,
  ) => {
    // Handle clip resizing with snapping
    console.log("Clip resize:", clipId, handle, deltaX);
  };

  // Playback handlers
  const handleTogglePlay = () => {
    if (!player) return;
    if (player.isPlaying()) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleStepForward = () => {
    if (!player) return;
    player.seekTo(player.getCurrentFrame() + 30); // 1 second at 30fps
  };

  const handleStepBackward = () => {
    if (!player) return;
    player.seekTo(Math.max(0, player.getCurrentFrame() - 30));
  };

  const handleGoToStart = () => {
    if (!player) return;
    player.seekTo(0);
  };

  const handleGoToEnd = () => {
    if (!player) return;
    // player.seekTo(player.getDuration());
  };

  // Selection handlers
  const handleSelectAll = async () => {
    const allKeyframes: string[] = [];
    for (const track of tracks) {
      const keyframes = await db.keyFrames.keyFramesByTrack(track.id);
      allKeyframes.push(...keyframes.map((k) => k.id));
    }
    timelineState.selectMultipleClips(allKeyframes);
  };

  const handleClearSelection = () => {
    timelineState.clearSelection();
  };

  const handleDeleteSelected = async () => {
    const selectedIds = Array.from(timelineState.state.selectedClips);
    for (const id of selectedIds) {
      await db.keyFrames.delete(id);
    }
    timelineState.clearSelection();
    refreshVideoCache(queryClient, projectId);
  };

  // Clipboard handlers
  const handleCopy = async () => {
    const selectedIds = Array.from(timelineState.state.selectedClips);
    const keyframes = await Promise.all(
      selectedIds.map((id) => db.keyFrames.find(id)),
    );
    setClipboard(keyframes.filter(Boolean));
  };

  const handlePaste = async () => {
    if (clipboard.length === 0) return;

    const currentTime = playerCurrentTimestamp * 1000;
    for (const keyframe of clipboard) {
      if (keyframe) {
        await db.keyFrames.create({
          ...keyframe,
          id: crypto.randomUUID(),
          timestamp: currentTime,
        });
      }
    }
    refreshVideoCache(queryClient, projectId);
  };

  const handleCut = async () => {
    await handleCopy();
    await handleDeleteSelected();
  };

  const handleDuplicate = async () => {
    const selectedIds = Array.from(timelineState.state.selectedClips);
    for (const id of selectedIds) {
      const keyframe = await db.keyFrames.find(id);
      if (keyframe) {
        await db.keyFrames.create({
          timestamp: keyframe.timestamp + keyframe.duration,
          duration: keyframe.duration,
          trackId: keyframe.trackId,
          data: keyframe.data,
        });
      }
    }
    refreshVideoCache(queryClient, projectId);
  };

  const handleUndo = () => {
    // TODO: Implement undo
    console.log("Undo");
  };

  const handleRedo = () => {
    // TODO: Implement redo
    console.log("Redo");
  };

  const handleCutAtPlayhead = async () => {
    const currentTime = playerCurrentTimestamp * 1000;
    // Find clips at current playhead position and cut them
    for (const track of tracks) {
      const keyframes = await db.keyFrames.keyFramesByTrack(track.id);
      for (const keyframe of keyframes) {
        if (
          currentTime >= keyframe.timestamp &&
          currentTime <= keyframe.timestamp + keyframe.duration
        ) {
          await handleClipCut(keyframe.id, currentTime);
        }
      }
    }
  };

  // Keyboard shortcuts
  useTimelineShortcuts({
    onToolChange: timelineState.setActiveTool,
    onTogglePlay: handleTogglePlay,
    onStepForward: handleStepForward,
    onStepBackward: handleStepBackward,
    onGoToStart: handleGoToStart,
    onGoToEnd: handleGoToEnd,
    onSelectAll: handleSelectAll,
    onClearSelection: handleClearSelection,
    onDeleteSelected: handleDeleteSelected,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onCut: handleCut,
    onDuplicate: handleDuplicate,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onZoomIn: () => setTimelineZoom((prev) => Math.min(prev * 1.2, 5)),
    onZoomOut: () => setTimelineZoom((prev) => Math.max(prev / 1.2, 0.1)),
    onFitToWindow: () => setTimelineZoom(1),
    onToggleSnap: timelineState.toggleSnap,
    onCutAtPlayhead: handleCutAtPlayhead,
  });

  // Timeline control handlers
  const handleZoomChange = (zoom: number) => {
    setTimelineZoom(zoom);
  };

  const handleFitToWindow = () => {
    setTimelineZoom(1);
  };

  const handleZoomToSelection = () => {
    if (selectedKeyframes.length > 0) {
      // Logic to zoom to selected keyframes
      setTimelineZoom(2);
    }
  };

  const handleSnapToggle = () => {
    setSnapToGrid(!snapToGrid);
  };

  const handleMagneticSnapToggle = () => {
    setMagneticSnap(!magneticSnap);
  };

  const handleSave = () => {
    // Manual save logic will be handled by auto-save hook
    console.log("Manual save triggered");
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

    const trackType = media.mediaType === "image" ? "video" : media.mediaType;
    let track = tracks.find((t) => t.type === trackType);

    if (!track) {
      const trackId = await db.tracks.create({
        projectId,
        type: trackType,
        label: `${trackType.charAt(0).toUpperCase() + trackType.slice(1)} Track`,
        locked: false,
      });

      // Refresh tracks to get the newly created track
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectTracks(projectId),
      });

      // Find the newly created track
      const updatedTracks = await db.tracks.tracksByProject(projectId);
      track = updatedTracks.find((t) => t.type === trackType);
    }

    if (!track) return; // Safety check

    const duration = resolveDuration(media) ?? 5000;
    await db.keyFrames.create({
      trackId: track.id,
      timestamp: playerCurrentTimestamp * 1000,
      duration: Math.min(duration, 30000),
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
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        selectedCount={timelineState.state.selectedClips.size}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onDuplicate={handleDuplicate}
      />

      {/* Timeline Controls */}
      <TimelineControls
        zoom={timelineZoom}
        onZoomChange={handleZoomChange}
        onFitToWindow={handleFitToWindow}
        onZoomToSelection={handleZoomToSelection}
        snapToGrid={snapToGrid}
        onSnapToggle={handleSnapToggle}
        magneticSnap={magneticSnap}
        onMagneticSnapToggle={handleMagneticSnapToggle}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        selectedCount={selectedKeyframes.length}
        totalDuration={totalDuration}
        onSave={handleSave}
      />

      {/* Video Controls */}
      <div className="flex flex-row items-center justify-between px-4 py-2 border-b border-border">
        <VideoControls />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formattedTimestamp}s
          </span>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => limitAllKeyframesToThirtySeconds.mutate()}
            disabled={limitAllKeyframesToThirtySeconds.isPending}
          >
            {limitAllKeyframesToThirtySeconds.isPending
              ? "Limiting..."
              : "Limit to 30s"}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div
        className={cn(
          "min-h-64 max-h-72 h-full flex flex-row overflow-y-scroll transition-colors",
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
        <div className="flex flex-col justify-start w-full h-full relative">
          <div
            className="absolute z-[32] top-6 bottom-0 w-[2px] bg-white/30 ms-4"
            style={{
              left: `${((playerCurrentTimestamp / totalDuration) * 100).toFixed(2)}%`,
            }}
          />
          <TimelineRuler duration={totalDuration} className="z-30 pointer-events-none" />
          <div className="flex timeline-container flex-col h-full mx-4 mt-10 gap-2 z-[31] pb-2">
            {Object.values(trackObj).map((track, index) =>
              track ? (
                <VideoTrackRow
                  key={track.id}
                  data={track}
                  timelineState={{
                    selectedClips: timelineState.state.selectedClips,
                    activeTool: timelineState.state.activeTool,
                  }}
                  onClipSelect={handleClipSelect}
                  onClipCut={handleClipCut}
                  onClipDrag={handleClipDrag}
                  onClipResize={handleClipResize}
                  totalDuration={totalDuration}
                  style={{
                    minWidth: minTrackWidth,
                  }}
                />
              ) : (
                <div
                  key={`empty-track-${index}`}
                  className="flex flex-row relative w-full h-full timeline-container"
                />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
