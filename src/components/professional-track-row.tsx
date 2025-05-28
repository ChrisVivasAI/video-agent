"use client";

import { db } from "@/data/db";
import { queryKeys, refreshVideoCache } from "@/data/queries";
import type { VideoTrack, VideoKeyFrame } from "@/data/schema";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { ProfessionalClip } from "./professional-clip";

interface ProfessionalTrackRowProps {
  track: VideoTrack;
  timelineState: any;
  activeTool: "select" | "razor" | "hand" | "zoom";
  snapToGrid: boolean;
  magneticSnap: boolean;
  totalDuration: number;
  playerCurrentTimestamp: number;
}

export function ProfessionalTrackRow({
  track,
  timelineState,
  activeTool,
  snapToGrid,
  magneticSnap,
  totalDuration,
  playerCurrentTimestamp,
}: ProfessionalTrackRowProps) {
  const queryClient = useQueryClient();
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDropIndicator, setShowDropIndicator] = useState(false);
  const [dropPosition, setDropPosition] = useState(0);

  const { data: keyframes = [] } = useQuery({
    queryKey: ["frames", track.id],
    queryFn: () => db.keyFrames.keyFramesByTrack(track.id),
  });

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling to parent timeline
      setIsDragOver(true);

      // Calculate drop position for visual feedback
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const timelineWidth = rect.width;
      const position = (x / timelineWidth) * totalDuration;

      setDropPosition(position);
      setShowDropIndicator(true);
    },
    [totalDuration],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.stopPropagation(); // Prevent event from bubbling to parent timeline
    setIsDragOver(false);
    setShowDropIndicator(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling to parent timeline
      setIsDragOver(false);
      setShowDropIndicator(false);

      // Handle dropping media onto specific track
      const mediaDataJson = e.dataTransfer.getData("application/json");
      if (!mediaDataJson) return;

      try {
        const media = JSON.parse(mediaDataJson);

        // Calculate precise drop position
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const timelineWidth = rect.width;
        let timestamp = (x / timelineWidth) * totalDuration * 1000; // Convert to milliseconds

        // Apply snapping if enabled
        if (snapToGrid) {
          const gridSize = 1000; // 1 second grid
          timestamp = Math.round(timestamp / gridSize) * gridSize;
        }

        if (magneticSnap) {
          // Snap to nearby clips
          const snapDistance = 500; // 0.5 seconds
          for (const frame of keyframes) {
            const frameStart = frame.timestamp;
            const frameEnd = frame.timestamp + frame.duration;

            if (Math.abs(timestamp - frameStart) < snapDistance) {
              timestamp = frameStart;
              break;
            }
            if (Math.abs(timestamp - frameEnd) < snapDistance) {
              timestamp = frameEnd;
              break;
            }
          }
        }

        // Create keyframe at drop position
        await db.keyFrames.create({
          trackId: track.id,
          timestamp: Math.max(0, timestamp),
          duration: 5000, // Default 5 seconds
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

        refreshVideoCache(queryClient, track.projectId);
      } catch (error) {
        console.warn("Failed to drop media:", error);
      }
    },
    [
      track.id,
      track.projectId,
      totalDuration,
      snapToGrid,
      magneticSnap,
      keyframes,
      queryClient,
    ],
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === "razor") {
        // Handle razor tool click
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const timelineWidth = rect.width;
        const clickTime = (x / timelineWidth) * totalDuration * 1000;

        // Find clips at this position and split them
        keyframes.forEach(async (frame) => {
          if (
            clickTime >= frame.timestamp &&
            clickTime <= frame.timestamp + frame.duration
          ) {
            // Split the clip
            const splitPoint = clickTime - frame.timestamp;
            if (splitPoint > 100 && splitPoint < frame.duration - 100) {
              // Minimum 100ms clips
              // Create second part
              await db.keyFrames.create({
                trackId: track.id,
                timestamp: clickTime,
                duration: frame.duration - splitPoint,
                data: frame.data,
              });

              // Update first part
              await db.keyFrames.update(frame.id, {
                duration: splitPoint,
              });

              refreshVideoCache(queryClient, track.projectId);
            }
          }
        });
      }
    },
    [
      activeTool,
      totalDuration,
      keyframes,
      track.id,
      track.projectId,
      queryClient,
    ],
  );

  // Generate grid lines for visual reference
  const gridLines = [];
  const gridInterval = totalDuration / 30; // 30 grid lines
  for (let i = 0; i <= 30; i++) {
    gridLines.push(
      <div
        key={i}
        className="absolute top-0 bottom-0 w-px bg-border opacity-20"
        style={{ left: `${(i / 30) * 100}%` }}
      />,
    );
  }

  return (
    <div
      className={cn(
        "relative w-full h-16 border-b border-border transition-all cursor-pointer",
        {
          "bg-blue-50 dark:bg-blue-950/20": track.type === "video",
          "bg-green-50 dark:bg-green-950/20": track.type === "music",
          "bg-purple-50 dark:bg-purple-950/20": track.type === "voiceover",
          "bg-yellow-50 dark:bg-yellow-950/20": isDragOver,
          "cursor-crosshair": activeTool === "razor",
          "cursor-grab": activeTool === "hand",
        },
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleTrackClick}
    >
      {/* Grid Lines */}
      <div className="absolute inset-0 pointer-events-none">{gridLines}</div>

      {/* Clips */}
      {keyframes.map((frame) => (
        <ProfessionalClip
          key={frame.id}
          frame={frame}
          track={track}
          timelineState={timelineState}
          activeTool={activeTool}
          snapToGrid={snapToGrid}
          magneticSnap={magneticSnap}
          totalDuration={totalDuration}
          allKeyframes={keyframes}
        />
      ))}

      {/* Drop Position Indicator */}
      {showDropIndicator && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
          style={{
            left: `${(dropPosition / totalDuration) * 100}%`,
          }}
        >
          <div className="absolute top-0 left-[-4px] w-2 h-2 bg-primary rounded-full" />
          <div className="absolute bottom-0 left-[-4px] w-2 h-2 bg-primary rounded-full" />
        </div>
      )}

      {/* Drop Zone Indicator */}
      {isDragOver && (
        <div className="absolute inset-0 border-2 border-dashed border-primary bg-primary/10 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-medium text-primary">
            Drop media here
          </span>
        </div>
      )}

      {/* Razor Cut Line Preview */}
      {activeTool === "razor" && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 bottom-0 w-px bg-red-500 opacity-0 hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}
