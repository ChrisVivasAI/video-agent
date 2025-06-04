import { db } from "@/data/db";
import { queryKeys, refreshVideoCache } from "@/data/queries";
import type { VideoTrack, VideoKeyFrame } from "@/data/schema";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EnhancedClip } from "./enhanced-clip";

interface EnhancedTrackRowProps {
  track: VideoTrack;
  timelineState: any;
  minTrackWidth: string;
  totalDuration: number;
}

export function EnhancedTrackRow({
  track,
  timelineState,
  minTrackWidth,
  totalDuration,
}: EnhancedTrackRowProps) {
  const queryClient = useQueryClient();
  const [isDragOver, setIsDragOver] = useState(false);

  const { data: keyframes = [] } = useQuery({
    queryKey: ["frames", track.id],
    queryFn: () => db.keyFrames.keyFramesByTrack(track.id),
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent timeline
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation(); // Prevent event from bubbling to parent timeline
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent timeline
    setIsDragOver(false);

    // Handle dropping media onto specific track
    const mediaDataJson = e.dataTransfer.getData("application/json");
    if (!mediaDataJson) return;

    try {
      const media = JSON.parse(mediaDataJson);

      // Calculate drop position based on mouse position
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const timelineWidth = rect.width;
      const timestamp = (x / timelineWidth) * totalDuration * 1000;

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
  };

  return (
    <div
      className={cn(
        "relative w-full h-16 border-b border-border transition-colors",
        {
          "bg-blue-50 dark:bg-blue-950/20": track.type === "video",
          "bg-green-50 dark:bg-green-950/20": track.type === "music",
          "bg-purple-50 dark:bg-purple-950/20": track.type === "voiceover",
          "bg-yellow-50 dark:bg-yellow-950/20": isDragOver,
        },
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ minWidth: minTrackWidth }}
    >
      {/* Track Background Grid */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: Math.ceil(totalDuration) }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-border"
            style={{ left: `${(i / Math.ceil(totalDuration)) * 100}%` }}
          />
        ))}
      </div>

      {/* Clips */}
      {keyframes.map((frame) => (
        <EnhancedClip
          key={frame.id}
          frame={frame}
          track={track}
          timelineState={timelineState}
          totalDuration={totalDuration}
        />
      ))}

      {/* Drop Zone Indicator */}
      {isDragOver && (
        <div className="absolute inset-0 border-2 border-dashed border-primary bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">
            Drop media here
          </span>
        </div>
      )}
    </div>
  );
}
