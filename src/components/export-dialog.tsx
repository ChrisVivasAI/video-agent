import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn, resolveMediaUrl } from "@/lib/utils";
import {
  EMPTY_VIDEO_COMPOSITION,
  useProject,
  useVideoComposition,
} from "@/data/queries";
import { fal } from "@/lib/fal";
import { Button } from "./ui/button";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { LoadingIcon } from "./ui/icons";
import {
  CopyIcon,
  DownloadIcon,
  Share2Icon as ShareIcon,
  FilmIcon,
} from "lucide-react";
import { Input } from "./ui/input";
import {
  uploadVideoFromUrl,
  storeSharedVideo,
  type SharedVideo,
} from "@/lib/supabase";
import { PROJECT_PLACEHOLDER } from "@/data/schema";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

type ExportDialogProps = {} & Parameters<typeof Dialog>[0];

type ShareResult = {
  video_url: string;
  thumbnail_url: string;
};

type ExportedVideo = {
  originalUrl: string;
  supabaseUrl: string;
  thumbnailUrl: string;
};

export function ExportDialog({ onOpenChange, ...props }: ExportDialogProps) {
  const projectId = useProjectId();
  const { data: composition = EMPTY_VIDEO_COMPOSITION } =
    useVideoComposition(projectId);
  const router = useRouter();
  const { toast } = useToast();

  const exportVideo = useMutation({
    mutationFn: async (): Promise<ExportedVideo> => {
      const mediaItems = composition.mediaItems;
      const videoData = composition.tracks.map((track) => ({
        id: track.id,
        type: track.type === "video" ? "video" : "audio",
        keyframes: composition.frames[track.id].map((frame) => ({
          timestamp: frame.timestamp,
          duration: frame.duration,
          url: resolveMediaUrl(mediaItems[frame.data.mediaId]),
        })),
      }));
      if (videoData.length === 0) {
        throw new Error("No tracks to export");
      }

      // Step 1: Generate video with FAL AI
      const { data } = await fal.subscribe("fal-ai/ffmpeg-api/compose", {
        input: {
          tracks: videoData,
        },
        mode: "polling",
        pollInterval: 3000,
      });

      const falResult = data as ShareResult;

      // Step 2: Upload video to Supabase
      const fileName = `${project.title || "video"}-${Date.now()}.mp4`;
      const uploadedVideo = await uploadVideoFromUrl(
        falResult.video_url,
        fileName,
        "videos",
      );

      return {
        originalUrl: falResult.video_url,
        supabaseUrl: uploadedVideo.url,
        thumbnailUrl: falResult.thumbnail_url,
      };
    },
    onError: (error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const setExportDialogOpen = useVideoProjectStore(
    (s) => s.setExportDialogOpen,
  );
  const handleOnOpenChange = (open: boolean) => {
    setExportDialogOpen(open);
    onOpenChange?.(open);
  };

  const { data: project = PROJECT_PLACEHOLDER } = useProject(projectId);
  const share = useMutation({
    mutationFn: async () => {
      if (!exportVideo.data) {
        throw new Error("No video to share");
      }
      const videoInfo = exportVideo.data;

      // Store video metadata in Supabase
      const shareId = await storeSharedVideo({
        title: project.title,
        description: project.description ?? "",
        videoUrl: videoInfo.supabaseUrl,
        thumbnailUrl: videoInfo.thumbnailUrl,
        createdAt: Date.now(),
        width: 1920,
        height: 1080,
        projectId: projectId,
      });

      return { id: shareId };
    },
    onError: (error) => {
      toast({
        title: "Share failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOnShare = async () => {
    const { id } = await share.mutateAsync();
    router.push(`/share/${id}`);
  };

  const actionsDisabled = exportVideo.isPending || share.isPending;

  return (
    <Dialog onOpenChange={handleOnOpenChange} {...props}>
      <DialogContent className="sm:max-w-4xl max-w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilmIcon className="w-6 h-6 opacity-50" />
            Export video
          </DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <div className="text-muted-foreground">
          <p>This may take a while, sit back and relax.</p>
        </div>
        <div
          className={cn(
            "w-full max-h-[500px] mx-auto max-w-full",
            project?.aspectRatio === "16:9" ? "aspect-[16/9]" : "aspect-[9/16]",
          )}
        >
          {exportVideo.isPending || exportVideo.data === undefined ? (
            <div
              className={cn(
                "bg-accent/30 flex flex-col items-center justify-center w-full h-full",
              )}
            >
              {exportVideo.isPending ? (
                <LoadingIcon className="w-24 h-24" />
              ) : (
                <FilmIcon className="w-24 h-24 opacity-50" />
              )}
            </div>
          ) : (
            <video
              src={exportVideo.data.supabaseUrl}
              controls
              className="w-full h-full"
            />
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-2 items-center">
            <Input
              value={exportVideo.data?.supabaseUrl ?? ""}
              placeholder="Video URL..."
              readOnly
              className="text-muted-foreground"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() =>
                navigator.clipboard.writeText(
                  exportVideo.data?.supabaseUrl ?? "",
                )
              }
              disabled={exportVideo.data === undefined}
            >
              <CopyIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleOnShare}
            variant="secondary"
            disabled={actionsDisabled || !exportVideo.data}
          >
            <ShareIcon className="w-4 h-4 opacity-50" />
            Share
          </Button>
          <Button
            variant="secondary"
            disabled={actionsDisabled || !exportVideo.data}
            aria-disabled={actionsDisabled || !exportVideo.data}
            asChild
          >
            <a href={exportVideo.data?.supabaseUrl ?? "#"} download>
              <DownloadIcon className="w-4 h-4" />
              Download
            </a>
          </Button>
          <Button
            onClick={() => exportVideo.mutate()}
            disabled={actionsDisabled}
          >
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
