"use client";

import { db } from "@/data/db";
import {
  queryKeys,
  refreshVideoCache,
  useProjectMediaItems,
} from "@/data/queries";
import type { VideoTrack, VideoKeyFrame, MediaItem } from "@/data/schema";
import { cn, resolveMediaUrl, trackIcons } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, createElement, useCallback, useEffect } from "react";
import {
  TrashIcon,
  GripHorizontalIcon,
  CopyIcon,
  ScissorsIcon,
  LoaderIcon,
} from "lucide-react";
import { useProjectId } from "@/data/store";

interface ProfessionalClipProps {
  frame: VideoKeyFrame;
  track: VideoTrack;
  timelineState: any;
  activeTool: "select" | "razor" | "hand" | "zoom";
  snapToGrid: boolean;
  magneticSnap: boolean;
  totalDuration: number;
  allKeyframes: VideoKeyFrame[];
}

export function ProfessionalClip({
  frame,
  track,
  timelineState,
  activeTool,
  snapToGrid,
  magneticSnap,
  totalDuration,
  allKeyframes,
}: ProfessionalClipProps) {
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [isSelected, setIsSelected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const clipRef = useRef<HTMLDivElement>(null);

  const { data: mediaItems = [] } = useProjectMediaItems(projectId);

  const media = mediaItems.find(
    (item: MediaItem) => item.id === frame.data.mediaId,
  );

  const deleteKeyframe = useMutation({
    mutationFn: () => db.keyFrames.delete(frame.id),
    onMutate: () => setIsDeleting(true),
    onSuccess: () => {
      setIsDeleting(false);
      refreshVideoCache(queryClient, track.projectId);
      timelineState.recordAction({
        kind: "keyframe",
        undo: async () => {
          await db.keyFrames.create(frame);
          refreshVideoCache(queryClient, track.projectId);
        },
        redo: async () => {
          await db.keyFrames.delete(frame.id);
          refreshVideoCache(queryClient, track.projectId);
        },
      });
    },
    onError: (error) => {
      setIsDeleting(false);
      console.error("Failed to delete clip:", error);
    },
  });

  const updateKeyframe = useMutation({
    mutationFn: (updates: Partial<VideoKeyFrame>) =>
      db.keyFrames.update(frame.id, { ...frame, ...updates }),
    onSuccess: () => refreshVideoCache(queryClient, track.projectId),
  });

  const duplicateKeyframe = useMutation({
    mutationFn: async () => {
      const newTimestamp = frame.timestamp + frame.duration;
      const data = {
        id: crypto.randomUUID(),
        trackId: frame.trackId,
        timestamp: newTimestamp,
        duration: frame.duration,
        data: frame.data,
      } as VideoKeyFrame;
      await db.keyFrames.create(data);
      return data;
    },
    onSuccess: (created: VideoKeyFrame) => {
      refreshVideoCache(queryClient, track.projectId);
      timelineState.recordAction({
        kind: "keyframe",
        undo: async () => {
          await db.keyFrames.delete(created.id);
          refreshVideoCache(queryClient, track.projectId);
        },
        redo: async () => {
          await db.keyFrames.create(created);
          refreshVideoCache(queryClient, track.projectId);
        },
      });
    },
  });

  const handleDelete = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (isDeleting) return; // Prevent double-deletion

      deleteKeyframe.mutate();
    },
    [deleteKeyframe, isDeleting],
  );

  const handleDuplicate = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      duplicateKeyframe.mutate();
    },
    [duplicateKeyframe],
  );

  // Add keyboard shortcut support for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSelected && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        handleDelete();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, handleDelete]);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (activeTool === "razor") {
        // Handle razor tool - split clip at click position
        const rect = clipRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const clipWidth = rect.width;
        const clickPosition = (x / clipWidth) * frame.duration;

        if (clickPosition > 100 && clickPosition < frame.duration - 100) {
          const before = { ...frame };
          const newFrame = {
            id: crypto.randomUUID(),
            trackId: frame.trackId,
            timestamp: frame.timestamp + clickPosition,
            duration: frame.duration - clickPosition,
            data: frame.data,
          } as VideoKeyFrame;
          await db.keyFrames.create(newFrame);

          updateKeyframe.mutate(
            { duration: clickPosition },
            {
              onSuccess: () => {
                refreshVideoCache(queryClient, track.projectId);
                timelineState.recordAction({
                  kind: "keyframe",
                  undo: async () => {
                    await db.keyFrames.delete(newFrame.id);
                    await db.keyFrames.update(frame.id, before);
                    refreshVideoCache(queryClient, track.projectId);
                  },
                  redo: async () => {
                    await db.keyFrames.update(frame.id, { duration: clickPosition });
                    await db.keyFrames.create(newFrame);
                    refreshVideoCache(queryClient, track.projectId);
                  },
                });
              },
            },
          );
        }
        return;
      }

      if (activeTool === "select") {
        setIsSelected(!isSelected);
      }
    },
    [activeTool, frame, updateKeyframe],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "select") return;

      e.stopPropagation();
      setIsDragging(true);

      const rect = clipRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!clipRef.current) return;

        const timelineRect =
          clipRef.current.parentElement?.getBoundingClientRect();
        if (!timelineRect) return;

        const x = moveEvent.clientX - timelineRect.left - dragOffset.x;
        const timelineWidth = timelineRect.width;
        let newTimestamp = (x / timelineWidth) * totalDuration * 1000;

        // Apply snapping
        if (snapToGrid) {
          const gridSize = 1000; // 1 second
          newTimestamp = Math.round(newTimestamp / gridSize) * gridSize;
        }

        if (magneticSnap) {
          const snapDistance = 500; // 0.5 seconds
          for (const otherFrame of allKeyframes) {
            if (otherFrame.id === frame.id) continue;

            const otherStart = otherFrame.timestamp;
            const otherEnd = otherFrame.timestamp + otherFrame.duration;

            if (Math.abs(newTimestamp - otherStart) < snapDistance) {
              newTimestamp = otherStart;
              break;
            }
            if (Math.abs(newTimestamp - otherEnd) < snapDistance) {
              newTimestamp = otherEnd;
              break;
            }
            if (
              Math.abs(newTimestamp + frame.duration - otherStart) <
              snapDistance
            ) {
              newTimestamp = otherStart - frame.duration;
              break;
            }
          }
        }

        // Constrain to timeline bounds
        newTimestamp = Math.max(
          0,
          Math.min(newTimestamp, totalDuration * 1000 - frame.duration),
        );

        // Update position visually (optimistic update)
        if (clipRef.current) {
          const newLeft = (newTimestamp / 1000 / totalDuration) * 100;
          clipRef.current.style.left = `${newLeft}%`;
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);

        // Get final position and update database
        if (clipRef.current) {
          const timelineRect =
            clipRef.current.parentElement?.getBoundingClientRect();
          if (timelineRect) {
            const rect = clipRef.current.getBoundingClientRect();
            const x = rect.left - timelineRect.left;
            const timelineWidth = timelineRect.width;
            const finalTimestamp = (x / timelineWidth) * totalDuration * 1000;
            const newTimestamp = Math.max(
              0,
              Math.min(finalTimestamp, totalDuration * 1000 - frame.duration),
            );
            const before = { ...frame };
            updateKeyframe.mutate(
              { timestamp: newTimestamp },
              {
                onSuccess: () => {
                  refreshVideoCache(queryClient, track.projectId);
                  timelineState.recordAction({
                    kind: "keyframe",
                    undo: async () => {
                      await db.keyFrames.update(frame.id, {
                        timestamp: before.timestamp,
                      });
                      refreshVideoCache(queryClient, track.projectId);
                    },
                    redo: async () => {
                      await db.keyFrames.update(frame.id, { timestamp: newTimestamp });
                      refreshVideoCache(queryClient, track.projectId);
                    },
                  });
                },
              },
            );
          }
        }

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [
      activeTool,
      frame,
      totalDuration,
      snapToGrid,
      magneticSnap,
      allKeyframes,
      dragOffset,
      updateKeyframe,
    ],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: "left" | "right") => {
      e.stopPropagation();
      setIsResizing(true);

      const startX = e.clientX;
      const startTimestamp = frame.timestamp;
      const startDuration = frame.duration;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const timelineRect =
          clipRef.current?.parentElement?.getBoundingClientRect();
        if (!timelineRect) return;

        const deltaTime = (deltaX / timelineRect.width) * totalDuration * 1000;

        let newTimestamp = startTimestamp;
        let newDuration = startDuration;

        if (direction === "left") {
          // Resize from left (trim start)
          newTimestamp = Math.max(0, startTimestamp + deltaTime);
          newDuration = startDuration - (newTimestamp - startTimestamp);
        } else {
          // Resize from right (trim end)
          newDuration = Math.max(100, startDuration + deltaTime); // Minimum 100ms
        }

        // Constrain to timeline bounds
        if (newTimestamp + newDuration > totalDuration * 1000) {
          newDuration = totalDuration * 1000 - newTimestamp;
        }

        // Apply snapping
        if (snapToGrid) {
          const gridSize = 1000; // 1 second
          if (direction === "left") {
            newTimestamp = Math.round(newTimestamp / gridSize) * gridSize;
            newDuration = startTimestamp + startDuration - newTimestamp;
          } else {
            const endTime = newTimestamp + newDuration;
            const snappedEndTime = Math.round(endTime / gridSize) * gridSize;
            newDuration = snappedEndTime - newTimestamp;
          }
        }

        // Update visually
        if (clipRef.current) {
          const left = (newTimestamp / 1000 / totalDuration) * 100;
          const width = (newDuration / 1000 / totalDuration) * 100;
          clipRef.current.style.left = `${left}%`;
          clipRef.current.style.width = `${width}%`;
        }
      };

      const handleMouseUp = () => {
        setIsResizing(false);

        // Get final values and update database
        if (clipRef.current) {
          const timelineRect =
            clipRef.current.parentElement?.getBoundingClientRect();
          const rect = clipRef.current.getBoundingClientRect();

          if (timelineRect) {
            const left = rect.left - timelineRect.left;
            const width = rect.width;
            const timelineWidth = timelineRect.width;

            const finalTimestamp =
              (left / timelineWidth) * totalDuration * 1000;
            const finalDuration =
              (width / timelineWidth) * totalDuration * 1000;

            const newTimestamp = Math.max(0, finalTimestamp);
            const newDuration = Math.max(100, finalDuration);
            const before = { ...frame };
            updateKeyframe.mutate(
              { timestamp: newTimestamp, duration: newDuration },
              {
                onSuccess: () => {
                  refreshVideoCache(queryClient, track.projectId);
                  timelineState.recordAction({
                    kind: "keyframe",
                    undo: async () => {
                      await db.keyFrames.update(frame.id, {
                        timestamp: before.timestamp,
                        duration: before.duration,
                      });
                      refreshVideoCache(queryClient, track.projectId);
                    },
                    redo: async () => {
                      await db.keyFrames.update(frame.id, {
                        timestamp: newTimestamp,
                        duration: newDuration,
                      });
                      refreshVideoCache(queryClient, track.projectId);
                    },
                  });
                },
              },
            );
          }
        }

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [frame, totalDuration, snapToGrid, updateKeyframe],
  );

  // Calculate clip position and size
  const clipLeft = (frame.timestamp / 1000 / totalDuration) * 100;
  const clipWidth = (frame.duration / 1000 / totalDuration) * 100;

  const coverImage =
    media?.mediaType === "video"
      ? media.metadata?.start_frame_url || media?.metadata?.end_frame_url
      : resolveMediaUrl(media);

  return (
    <div
      ref={clipRef}
      className={cn(
        "absolute top-1 bottom-1 rounded-md overflow-hidden transition-all group",
        "border-2 border-transparent hover:border-white/30",
        {
          "border-blue-400 shadow-lg ring-2 ring-blue-400/50": isSelected,
          "opacity-80 scale-105": isDragging,
          "bg-blue-600": track.type === "video",
          "bg-green-600": track.type === "music",
          "bg-purple-600": track.type === "voiceover",
          "cursor-pointer": activeTool === "select",
          "cursor-crosshair": activeTool === "razor",
          "cursor-grab": activeTool === "hand",
          "cursor-grabbing": isDragging,
        },
      )}
      style={{
        left: `${clipLeft}%`,
        width: `${clipWidth}%`,
        minWidth: "20px",
        zIndex: isSelected ? 10 : 1,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      {/* Clip Content */}
      <div className="flex items-center h-full px-2 relative">
        {/* Media Preview */}
        <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-black/20 mr-2">
          {media?.status === "completed" && (
            <>
              {(media.mediaType === "image" || media.mediaType === "video") &&
              coverImage ? (
                <img
                  src={coverImage}
                  alt="Media preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {createElement(trackIcons[track.type], {
                    className: "w-4 h-4 text-white/60",
                  } as any)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Clip Label */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white truncate">
            {media?.input?.prompt || `${track.type} clip`}
          </div>
          <div className="text-xs text-white/60 truncate">
            {(frame.duration / 1000).toFixed(1)}s
          </div>
        </div>

        {/* Clip Actions */}
        <div
          className={cn(
            "flex-shrink-0 flex items-center gap-1 transition-opacity",
            {
              "opacity-100": isSelected,
              "opacity-0 group-hover:opacity-100": !isSelected,
            },
          )}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicate(e);
            }}
            className="p-1 rounded hover:bg-blue-500/20 transition-colors relative z-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
            title="Duplicate clip"
          >
            <CopyIcon className="w-3 h-3 text-white/80 hover:text-blue-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(e);
            }}
            disabled={isDeleting}
            className={cn(
              "p-1 rounded hover:bg-red-500/20 transition-colors relative z-10",
              "focus:outline-none focus:ring-2 focus:ring-red-400",
              {
                "opacity-50 cursor-not-allowed": isDeleting,
              },
            )}
            title="Delete clip"
          >
            {isDeleting ? (
              <LoaderIcon className="w-3 h-3 text-white/80 animate-spin" />
            ) : (
              <TrashIcon className="w-3 h-3 text-white/80 hover:text-red-400" />
            )}
          </button>
        </div>
      </div>

      {/* Resize Handles */}
      {isSelected && activeTool === "select" && (
        <>
          {/* Left Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize bg-white/20 hover:bg-white/40 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "left")}
          >
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white rounded-r" />
          </div>

          {/* Right Handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize bg-white/20 hover:bg-white/40 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "right")}
          >
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white rounded-l" />
          </div>
        </>
      )}

      {/* Drag Handle */}
      {activeTool === "select" && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <GripHorizontalIcon className="w-4 h-4 text-white/60" />
        </div>
      )}

      {/* Audio Waveform for audio tracks */}
      {(track.type === "music" || track.type === "voiceover") &&
        media?.metadata?.waveform && (
          <div className="absolute bottom-0 left-0 right-0 h-6 opacity-30">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 24"
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              {media.metadata.waveform
                .slice(0, 100)
                .map((amplitude: number, index: number) => (
                  <rect
                    key={index}
                    x={index}
                    y={12 - Math.abs(amplitude) * 12}
                    width="1"
                    height={Math.abs(amplitude) * 24}
                    fill="white"
                    opacity="0.6"
                  />
                ))}
            </svg>
          </div>
        )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-400 rounded-md pointer-events-none">
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-400 rounded-full" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-400 rounded-full" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-400 rounded-full" />
        </div>
      )}
    </div>
  );
}
