import { db } from "@/data/db";
import {
  queryKeys,
  refreshVideoCache,
  useProjectMediaItems,
} from "@/data/queries";
import type { MediaItem, VideoKeyFrame, VideoTrack } from "@/data/schema";
import { cn, resolveDuration, resolveMediaUrl, trackIcons } from "@/lib/utils";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";
import {
  type HTMLAttributes,
  type MouseEventHandler,
  createElement,
  useMemo,
  useRef,
  useState,
} from "react";
import { WithTooltip } from "../ui/tooltip";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { fal } from "@/lib/fal";

type VideoTrackRowProps = {
  data: VideoTrack;
  timelineState?: {
    selectedClips: Set<string>;
    activeTool: string;
  };
  onClipSelect?: (clipId: string, multiSelect: boolean) => void;
  onClipCut?: (clipId: string, position: number) => void;
  onClipDrag?: (clipId: string, deltaX: number) => void;
  onClipResize?: (
    clipId: string,
    handle: "left" | "right",
    deltaX: number,
  ) => void;
  totalDuration: number;
} & HTMLAttributes<HTMLDivElement>;

export function VideoTrackRow({
  data,
  timelineState,
  onClipSelect,
  onClipCut,
  onClipDrag,
  onClipResize,
  totalDuration,
  ...props
}: VideoTrackRowProps) {
  const { data: keyframes = [] } = useQuery({
    queryKey: ["frames", data],
    queryFn: () => db.keyFrames.keyFramesByTrack(data.id),
  });

  const mediaType = useMemo(() => keyframes[0]?.data.type, [keyframes]);

  return (
    <div
      className={cn(
        "relative w-full timeline-container",
        "flex flex-col select-none rounded overflow-hidden shrink-0",
        {
          "min-h-[64px]": mediaType,
          "min-h-[56px]": !mediaType,
        },
      )}
      {...props}
    >
      {keyframes.map((frame) => (
        <VideoTrackView
          key={frame.id}
          className="absolute top-0 bottom-0"
          style={{
            left: `${((frame.timestamp / 1000) / totalDuration) * 100}%`,
            width: `${((frame.duration / 1000) / totalDuration) * 100}%`,
          }}
          track={data}
          frame={frame}
          timelineState={timelineState}
          onClipSelect={onClipSelect}
          onClipCut={onClipCut}
          onClipDrag={onClipDrag}
          onClipResize={onClipResize}
          totalDuration={totalDuration}
        />
      ))}
    </div>
  );
}

type AudioWaveformProps = {
  data: MediaItem;
};

function AudioWaveform({ data }: AudioWaveformProps) {
  const { data: waveform = [] } = useQuery({
    queryKey: ["media", "waveform", data.id],
    queryFn: async () => {
      if (data.metadata?.waveform && Array.isArray(data.metadata.waveform)) {
        return data.metadata.waveform;
      }
      const { data: waveformInfo } = await fal.subscribe(
        "fal-ai/ffmpeg-api/waveform",
        {
          input: {
            media_url: resolveMediaUrl(data),
            points_per_second: 5,
            precision: 3,
          },
        },
      );

      await db.media.update(data.id, {
        ...data,
        metadata: {
          ...data.metadata,
          waveform: waveformInfo.waveform,
        },
      });
      return waveformInfo.waveform as number[];
    },
    placeholderData: keepPreviousData,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const svgWidth = waveform.length * 3;
  const svgHeight = 100;

  return (
    <div className="h-full flex items-center overflow-hidden">
      <div className="min-w-max">
        <svg
          width={`${svgWidth}px`}
          height="80%"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMinYMid meet"
        >
          <title>Audio Waveform</title>
          {waveform.map((v, index) => {
            const amplitude = Math.abs(v);
            const height = Math.max(amplitude * svgHeight, 2);
            const x = index * 3;
            const y = (svgHeight - height) / 2;

            return (
              <rect
                key={index}
                x={x}
                y={y}
                width="2"
                height={height}
                className="fill-black/40"
                rx="4"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

type VideoTrackViewProps = {
  track: VideoTrack;
  frame: VideoKeyFrame;
  timelineState?: {
    selectedClips: Set<string>;
    activeTool: string;
  };
  onClipSelect?: (clipId: string, multiSelect: boolean) => void;
  onClipCut?: (clipId: string, position: number) => void;
  onClipDrag?: (clipId: string, deltaX: number) => void;
  onClipResize?: (
    clipId: string,
    handle: "left" | "right",
    deltaX: number,
  ) => void;
  totalDuration: number;
} & HTMLAttributes<HTMLDivElement>;

export function VideoTrackView({
  className,
  track,
  frame,
  timelineState,
  onClipSelect,
  onClipCut,
  onClipDrag,
  onClipResize,
  totalDuration,
  ...props
}: VideoTrackViewProps) {
  const queryClient = useQueryClient();
  const deleteKeyframe = useMutation({
    mutationFn: () => db.keyFrames.delete(frame.id),
    onSuccess: () => refreshVideoCache(queryClient, track.projectId),
  });
  const handleOnDelete = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    deleteKeyframe.mutate();
  };

  const selectedKeyframes = useVideoProjectStore(
    (state) => state.selectedKeyframes ?? [],
  );
  const selectKeyframe = useVideoProjectStore((state) => state.selectKeyframe);

  const isSelected =
    timelineState?.selectedClips.has(frame.id) ||
    selectedKeyframes.includes(frame.id);

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleOnClick: MouseEventHandler = (e) => {
    if (e.detail > 1) {
      return;
    }

    const isMultiSelect = e.ctrlKey || e.metaKey;

    if (timelineState && onClipSelect) {
      onClipSelect(frame.id, isMultiSelect);
    } else if (selectKeyframe) {
      selectKeyframe(frame.id);
    }
  };

  const projectId = useProjectId();
  const { data: mediaItems = [] } = useProjectMediaItems(projectId);

  const media = mediaItems.find((item) => item.id === frame.data.mediaId);
  // TODO improve missing data
  if (!media) return null;

  const mediaUrl = resolveMediaUrl(media);

  const imageUrl = useMemo(() => {
    if (media.mediaType === "image") {
      return mediaUrl;
    }
    if (media.mediaType === "video") {
      return (
        media.input?.image_url ||
        media.metadata?.start_frame_url ||
        media.metadata?.end_frame_url
      );
    }
    return undefined;
  }, [media, mediaUrl]);

  const label = media.mediaType ?? "unknown";

  const trackRef = useRef<HTMLDivElement>(null);

  const calculateBounds = () => {
    const timelineElement = document.querySelector(".timeline-container");
    const timelineRect = timelineElement?.getBoundingClientRect();
    const trackElement = trackRef.current;
    const trackRect = trackElement?.getBoundingClientRect();

    if (!timelineRect || !trackRect || !trackElement)
      return { left: 0, right: 0 };

    const previousTrack = trackElement?.previousElementSibling;
    const nextTrack = trackElement?.nextElementSibling;

    const leftBound = previousTrack
      ? previousTrack.getBoundingClientRect().right - (timelineRect?.left || 0)
      : 0;
    const rightBound = nextTrack
      ? nextTrack.getBoundingClientRect().left -
        (timelineRect?.left || 0) -
        trackRect.width
      : timelineRect.width - trackRect.width;

    return {
      left: leftBound,
      right: rightBound,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const trackElement = trackRef.current;
    if (!trackElement) return;
    const bounds = calculateBounds();
    const startX = e.clientX;
    const startLeft = trackElement.offsetLeft;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newLeft = startLeft + deltaX;

      if (newLeft < bounds.left) {
        newLeft = bounds.left;
      } else if (newLeft > bounds.right) {
        newLeft = bounds.right;
      }

      const timelineElement = trackElement.closest(".timeline-container");
      const parentWidth = timelineElement
        ? (timelineElement as HTMLElement).offsetWidth
        : 1;
      const newTimestamp = (newLeft / parentWidth) * totalDuration;
      frame.timestamp = (newTimestamp < 0 ? 0 : newTimestamp) * 1000;

      trackElement.style.left = `${((frame.timestamp / 1000) / totalDuration) * 100}%`;
      db.keyFrames.update(frame.id, { timestamp: frame.timestamp });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectPreview(projectId),
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleResize = (
    e: React.MouseEvent<HTMLDivElement>,
    direction: "left" | "right",
  ) => {
    e.stopPropagation();
    const trackElement = trackRef.current;
    if (!trackElement) return;

    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = trackElement.offsetWidth;
    const startLeft = trackElement.offsetLeft;
    const startTimestamp = frame.timestamp;
    const startDuration = frame.duration;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;

      if (direction === "right") {
        // Right handle: adjust duration only
        let newWidth = startWidth + deltaX;
        const minDuration = 1000;
        const mediaDuration = resolveDuration(media) ?? 5000;
        const maxDuration = Math.min(mediaDuration, 30000);

        const timelineElement = trackElement.closest(".timeline-container");
        const parentWidth = timelineElement
          ? (timelineElement as HTMLElement).offsetWidth
          : 1;
        let newDuration = (newWidth / parentWidth) * totalDuration * 1000;

        if (newDuration < minDuration) {
          newWidth = (minDuration / 1000 / totalDuration) * parentWidth;
          newDuration = minDuration;
        } else if (newDuration > maxDuration) {
          newWidth = (maxDuration / 1000 / totalDuration) * parentWidth;
          newDuration = maxDuration;
        }

        frame.duration = newDuration;
        trackElement.style.width = `${((frame.duration / 1000) / totalDuration) * 100}%`;
      } else {
        // Left handle: adjust timestamp and duration (trim in-point)
        let newLeft = startLeft + deltaX;
        const timelineElement = trackElement.closest(".timeline-container");
        const parentWidth = timelineElement
          ? (timelineElement as HTMLElement).offsetWidth
          : 1;

        // Calculate new timestamp
        const newTimestamp = Math.max(0, (newLeft / parentWidth) * totalDuration * 1000);
        const timestampDelta = newTimestamp - startTimestamp;

        // Adjust duration to maintain end point
        const newDuration = Math.max(1000, startDuration - timestampDelta);

        frame.timestamp = newTimestamp;
        frame.duration = newDuration;

        trackElement.style.left = `${((frame.timestamp / 1000) / totalDuration) * 100}%`;
        trackElement.style.width = `${((frame.duration / 1000) / totalDuration) * 100}%`;
      }

      // Call custom resize handler if provided
      if (onClipResize) {
        onClipResize(frame.id, direction, deltaX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      frame.duration = Math.round(frame.duration / 100) * 100;
      frame.timestamp = Math.round(frame.timestamp / 100) * 100;

      trackElement.style.left = `${((frame.timestamp / 1000) / totalDuration) * 100}%`;
      trackElement.style.width = `${((frame.duration / 1000) / totalDuration) * 100}%`;

      db.keyFrames.update(frame.id, {
        duration: frame.duration,
        timestamp: frame.timestamp,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectPreview(projectId),
      });
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleRazorClick = (e: React.MouseEvent) => {
    if (timelineState?.activeTool === "razor") {
      e.stopPropagation();
      const rect = trackRef.current?.getBoundingClientRect();
      if (rect) {
        const relativeX = e.clientX - rect.left;
        const position =
          (relativeX / rect.width) * frame.duration + frame.timestamp;
        if (onClipCut) {
          onClipCut(frame.id, position);
        }
      }
    }
  };

  return (
    <div
      ref={trackRef}
      onMouseDown={
        timelineState?.activeTool === "select" ? handleMouseDown : undefined
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e) => e.preventDefault()}
      onClick={
        timelineState?.activeTool === "razor" ? handleRazorClick : handleOnClick
      }
      aria-checked={isSelected}
      className={cn(
        "flex flex-col border rounded-lg transition-all duration-150 cursor-pointer",
        {
          // Selection state
          "border-blue-400 ring-2 ring-blue-400/50": isSelected,
          "border-white/10": !isSelected,

          // Hover state
          "border-white/30": isHovered && !isSelected,

          // Tool-specific cursors
          "cursor-crosshair": timelineState?.activeTool === "razor",
          "cursor-move": timelineState?.activeTool === "select",

          // Dragging state
          "opacity-80 scale-[1.01] shadow-lg": isDragging,
        },
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex flex-col select-none rounded overflow-hidden group h-full relative",
          {
            "bg-sky-600": track.type === "video",
            "bg-teal-500": track.type === "music",
            "bg-indigo-500": track.type === "voiceover",
          },
        )}
      >
        <div className="p-0.5 pl-1 bg-black/10 flex flex-row items-center">
          <div className="flex flex-row gap-1 text-sm items-center font-semibold text-white/60 w-full">
            <div className="flex flex-row truncate gap-1 items-center">
              {createElement(trackIcons[track.type], {
                className: "w-5 h-5 text-white",
              } as React.ComponentProps<
                (typeof trackIcons)[typeof track.type]
              >)}
              <span className="line-clamp-1 truncate text-sm mb-[2px] w-full ">
                {media.input?.prompt || label}
              </span>
            </div>
            <div className="flex flex-row shrink-0 flex-1 items-center justify-end">
              <WithTooltip tooltip="Remove content">
                <button
                  type="button"
                  className="p-1 rounded hover:bg-red-500/20 group-hover:text-white transition-colors relative z-10 focus:outline-none focus:ring-2 focus:ring-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOnDelete(e);
                  }}
                >
                  <TrashIcon className="w-3 h-3 text-white hover:text-red-400" />
                </button>
              </WithTooltip>
            </div>
          </div>
        </div>
        <div
          className="p-px flex-1 items-center bg-repeat-x h-full max-h-full overflow-hidden relative"
          style={
            imageUrl
              ? {
                  background: `url(${imageUrl})`,
                  backgroundSize: "auto 100%",
                }
              : undefined
          }
        >
          {(media.mediaType === "music" || media.mediaType === "voiceover") && (
            <AudioWaveform data={media} />
          )}

          {/* Left resize handle (trim in-point) */}
          <div
            className={cn(
              "absolute left-0 z-50 top-0 bg-black/20 group-hover:bg-black/40",
              "rounded-md bottom-0 w-2 m-1 p-px cursor-w-resize backdrop-blur-md text-white/40",
              "transition-all duration-150 flex flex-col items-center justify-center text-xs tracking-tighter",
              "opacity-0 group-hover:opacity-100",
              {
                "opacity-100": isHovered || isDragging,
              },
            )}
            onMouseDown={(e) => handleResize(e, "left")}
          >
            <span className="flex gap-[1px]">
              <span className="w-px h-2 rounded bg-white/40" />
              <span className="w-px h-2 rounded bg-white/40" />
            </span>
          </div>

          {/* Right resize handle (trim out-point) */}
          <div
            className={cn(
              "absolute right-0 z-50 top-0 bg-black/20 group-hover:bg-black/40",
              "rounded-md bottom-0 w-2 m-1 p-px cursor-e-resize backdrop-blur-md text-white/40",
              "transition-all duration-150 flex flex-col items-center justify-center text-xs tracking-tighter",
            )}
            onMouseDown={(e) => handleResize(e, "right")}
          >
            <span className="flex gap-[1px]">
              <span className="w-px h-2 rounded bg-white/40" />
              <span className="w-px h-2 rounded bg-white/40" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
