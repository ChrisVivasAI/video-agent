import { useState, useEffect, useCallback, useRef } from "react";
import {
  saveProjectToSupabase,
  type EnhancedVideoProject,
} from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface UseAutoSaveOptions {
  interval?: number; // Auto-save interval in milliseconds (default: 30 seconds)
  enabled?: boolean; // Whether auto-save is enabled
  onSave?: () => void; // Callback when save completes
  onError?: (error: Error) => void; // Callback when save fails
}

interface UseAutoSaveReturn {
  lastSaved: Date | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  saveNow: () => Promise<void>;
  enableAutoSave: () => void;
  disableAutoSave: () => void;
}

export function useAutoSave(
  projectId: string,
  projectData: Partial<EnhancedVideoProject> | null,
  options: UseAutoSaveOptions = {},
): UseAutoSaveReturn {
  const {
    interval = 30000, // 30 seconds
    enabled = true,
    onSave,
    onError,
  } = options;

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(enabled);

  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>("");

  // Check if data has changed
  useEffect(() => {
    if (projectData) {
      const currentDataString = JSON.stringify(projectData);
      if (currentDataString !== lastDataRef.current) {
        setHasUnsavedChanges(true);
        lastDataRef.current = currentDataString;
      }
    }
  }, [projectData]);

  // Save function
  const saveNow = useCallback(async () => {
    if (!projectData || !projectId || isSaving) return;

    setIsSaving(true);
    try {
      await saveProjectToSupabase(projectId, projectData, true);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      onSave?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Auto-save failed:", errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));

      toast({
        title: "Auto-save failed",
        description:
          "Your changes couldn't be saved automatically. Please save manually.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [projectId, projectData, isSaving, onSave, onError, toast]);

  // Auto-save interval
  useEffect(() => {
    if (!autoSaveEnabled || !projectData || !hasUnsavedChanges) {
      return;
    }

    intervalRef.current = setInterval(() => {
      if (hasUnsavedChanges && !isSaving) {
        saveNow();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    autoSaveEnabled,
    projectData,
    hasUnsavedChanges,
    isSaving,
    saveNow,
    interval,
  ]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const enableAutoSave = useCallback(() => {
    setAutoSaveEnabled(true);
  }, []);

  const disableAutoSave = useCallback(() => {
    setAutoSaveEnabled(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  return {
    lastSaved,
    isSaving,
    hasUnsavedChanges,
    saveNow,
    enableAutoSave,
    disableAutoSave,
  };
}
