import { db } from "@/data/db";
import {
  queryKeys,
  refreshVideoCache,
  useProjectMediaItems,
} from "@/data/queries";
import type { VideoTrack, VideoKeyFrame, MediaItem } from "@/data/schema";
import { cn, resolveMediaUrl, trackIcons } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, createElement } from "react";
import { TrashIcon, GripHorizontalIcon } from "lucide-react";
import { useProjectId } from "@/data/store";

interface EnhancedClipProps {
  frame: VideoKeyFrame;
  track: VideoTrack;
  timelineState: any;
}

export function EnhancedClip({
  frame,
  track,
  timelineState,
}: EnhancedClipProps) {
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [isSelected, setIsSelected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const clipRef = useRef<HTMLDivElement>(null);

  const { data: mediaItems = [] } = useProjectMediaItems(projectId);

  const media = mediaItems.find(
    (item: MediaItem) => item.id === frame.data.mediaId,
  );

  const deleteKeyframe = useMutation({
    mutationFn: () => db.keyFrames.delete(frame.id),
    onSuccess: () => refreshVideoCache(queryClient, track.projectId),
  });

  const updateKeyframe = useMutation({
    mutationFn: (updates: Partial<VideoKeyFrame>) =>
      db.keyFrames.update(frame.id, { ...frame, ...updates }),
    onSuccess: () => refreshVideoCache(queryClient, track.projectId),
  });

  const handleDelete = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    deleteKeyframe.mutate();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSelected(!isSelected);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      // Add drag logic here
    }
  };

  const handleResizeStart = (
    e: React.MouseEvent,
    direction: "left" | "right",
  ) => {
    e.stopPropagation();
    setIsResizing(true);
    // Add resize logic here
  };

  // Calculate clip position and size
  const clipLeft = (frame.timestamp / 1000 / 30) * 100; // Convert to percentage
  const clipWidth = (frame.duration / 1000 / 30) * 100; // Convert to percentage

  const coverImage =
    media?.mediaType === "video"
      ? media.metadata?.start_frame_url || media?.metadata?.end_frame_url
      : resolveMediaUrl(media);

  return (
    <div
      ref={clipRef}
      className={cn(
        "absolute top-1 bottom-1 rounded-md overflow-hidden cursor-pointer transition-all",
        "border-2 border-transparent hover:border-white/30",
        {
          "border-blue-400 shadow-lg": isSelected,
          "opacity-80": isDragging,
          "bg-blue-600": track.type === "video",
          "bg-green-600": track.type === "music",
          "bg-purple-600": track.type === "voiceover",
        },
      )}
      style={{
        left: `${clipLeft}%`,
        width: `${clipWidth}%`,
        minWidth: "20px",
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

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(e);
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity relative z-10 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <TrashIcon className="w-3 h-3 text-white/80 hover:text-red-400" />
        </button>
      </div>

      {/* Resize Handles */}
      {isSelected && (
        <>
          {/* Left Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize bg-white/20 hover:bg-white/40"
            onMouseDown={(e) => handleResizeStart(e, "left")}
          >
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white rounded-r" />
          </div>

          {/* Right Handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize bg-white/20 hover:bg-white/40"
            onMouseDown={(e) => handleResizeStart(e, "right")}
          >
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white rounded-l" />
          </div>
        </>
      )}

      {/* Drag Handle */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        <GripHorizontalIcon className="w-4 h-4 text-white/60" />
      </div>

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
    </div>
  );
}
