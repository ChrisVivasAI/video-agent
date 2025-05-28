"use client";

import ProfessionalTimeline from "@/components/professional-timeline";
import Header from "@/components/header";
import RightPanel from "@/components/right-panel";
import VideoPreview from "@/components/video-preview";
import {
  VideoProjectStoreContext,
  createVideoProjectStore,
} from "@/data/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useStore } from "zustand";
import { ProjectDialog } from "./project-dialog";
import { MediaGallerySheet } from "./media-gallery";
import { ToastProvider } from "./ui/toast";
import { Toaster } from "./ui/toaster";
import { ExportDialog } from "./export-dialog";
import LeftPanel from "./left-panel";
import { KeyDialog } from "./key-dialog";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useProject, useVideoComposition } from "@/data/queries";
import type { EnhancedVideoProject } from "@/lib/supabase";

type AppProps = {
  projectId: string;
};

// Enhanced features component that uses QueryClient hooks
function EnhancedFeatures({
  projectId,
  projectStore,
}: {
  projectId: string;
  projectStore: ReturnType<typeof createVideoProjectStore>;
}) {
  // Get project data for auto-save (now inside QueryClientProvider)
  const { data: project } = useProject(projectId);
  const { data: composition } = useVideoComposition(projectId);

  // Enhanced project data for auto-save
  const enhancedProjectData: Partial<EnhancedVideoProject> | null = project
    ? {
        id: project.id,
        title: project.title,
        description: project.description,
        aspectRatio: project.aspectRatio,
        updatedAt: Date.now(),
        // Add other enhanced fields as needed
        duration: 30, // Default 30 seconds
        frameRate: 30,
        width: 1920,
        height: 1080,
        isPublic: false,
        settings: {},
      }
    : null;

  // Auto-save integration
  const autoSave = useAutoSave(projectId, enhancedProjectData, {
    enabled: !!project,
    onError: (error) => {
      console.error("Auto-save failed:", error);
    },
  });

  // Store references for keyboard shortcuts
  const setProjectDialogOpen = useStore(
    projectStore,
    (s) => s.setProjectDialogOpen,
  );
  const playerState = useStore(projectStore, (s) => s.playerState);
  const setPlayerState = useStore(projectStore, (s) => s.setPlayerState);
  const playerCurrentTimestamp = useStore(
    projectStore,
    (s) => s.playerCurrentTimestamp,
  );
  const setPlayerCurrentTimestamp = useStore(
    projectStore,
    (s) => s.setPlayerCurrentTimestamp,
  );

  // Keyboard shortcuts integration
  useKeyboardShortcuts({
    // Playback controls
    onTogglePlayback: () =>
      setPlayerState(playerState === "playing" ? "paused" : "playing"),
    onGoToStart: () => setPlayerCurrentTimestamp(0),
    onGoToEnd: () => setPlayerCurrentTimestamp(30),
    onStepBackward: () =>
      setPlayerCurrentTimestamp(Math.max(0, playerCurrentTimestamp - 0.1)),
    onStepForward: () =>
      setPlayerCurrentTimestamp(Math.min(30, playerCurrentTimestamp + 0.1)),

    // Project management
    onSave: autoSave.saveNow,
    onNewProject: () => setProjectDialogOpen(true),

    // Misc
    onShowHelp: () => {
      // This will be handled by the parent component
    },
  });

  return null; // This component only handles side effects
}

export function App({ projectId }: AppProps) {
  const [keyDialog, setKeyDialog] = useState(false);

  const queryClient = useRef(new QueryClient()).current;
  const projectStore = useRef(
    createVideoProjectStore({
      projectId,
    }),
  ).current;

  const projectDialogOpen = useStore(projectStore, (s) => s.projectDialogOpen);
  const selectedMediaId = useStore(projectStore, (s) => s.selectedMediaId);
  const setSelectedMediaId = useStore(
    projectStore,
    (s) => s.setSelectedMediaId,
  );
  const handleOnSheetOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedMediaId(null);
    }
  };
  const isExportDialogOpen = useStore(projectStore, (s) => s.exportDialogOpen);
  const setExportDialogOpen = useStore(
    projectStore,
    (s) => s.setExportDialogOpen,
  );

  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <VideoProjectStoreContext.Provider value={projectStore}>
          {/* Enhanced features component that uses QueryClient hooks */}
          <EnhancedFeatures projectId={projectId} projectStore={projectStore} />

          <div className="flex flex-col relative overflow-x-hidden h-screen bg-background">
            <Header openKeyDialog={() => setKeyDialog(true)} />
            <main className="flex overflow-hidden h-full w-screen">
              <LeftPanel />
              <div className="flex flex-col flex-1">
                <VideoPreview />
                <ProfessionalTimeline />
              </div>
            </main>
            <RightPanel />
          </div>
          <Toaster />
          <ProjectDialog open={projectDialogOpen} />
          <ExportDialog
            open={isExportDialogOpen}
            onOpenChange={setExportDialogOpen}
          />
          <KeyDialog
            open={keyDialog}
            onOpenChange={(open) => setKeyDialog(open)}
          />
          <MediaGallerySheet
            open={selectedMediaId !== null}
            onOpenChange={handleOnSheetOpenChange}
            selectedMediaId={selectedMediaId ?? ""}
          />
        </VideoProjectStoreContext.Provider>
      </QueryClientProvider>
    </ToastProvider>
  );
}
