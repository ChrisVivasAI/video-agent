import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

export async function uploadFile(
  file: File,
  bucket: string = "media",
): Promise<UploadedFile> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    url: publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

export async function deleteFile(
  filePath: string,
  bucket: string = "media",
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([filePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

// Upload video from URL (for exported videos)
export async function uploadVideoFromUrl(
  videoUrl: string,
  fileName: string,
  bucket: string = "videos",
): Promise<UploadedFile> {
  // Download the video from the URL
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.statusText}`);
  }

  const blob = await response.blob();
  const file = new File([blob], fileName, { type: "video/mp4" });

  const fileExt = fileName.split(".").pop() || "mp4";
  const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `exports/${uniqueFileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    url: publicUrl,
    name: fileName,
    size: file.size,
    type: file.type,
  };
}

// Shared video metadata interface
export interface SharedVideo {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  createdAt: number;
  width: number;
  height: number;
  projectId?: string;
}

// Store shared video metadata in Supabase
export async function storeSharedVideo(
  params: Omit<SharedVideo, "id">,
): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

  const { error } = await supabase.from("shared_videos").insert({
    id,
    ...params,
    created_at: new Date(params.createdAt).toISOString(),
  });

  if (error) {
    throw new Error(`Failed to store shared video: ${error.message}`);
  }

  return id;
}

// Fetch shared video metadata from Supabase
export async function fetchSharedVideo(
  id: string,
): Promise<SharedVideo | null> {
  const { data, error } = await supabase
    .from("shared_videos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch shared video: ${error.message}`);
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    videoUrl: data.video_url,
    thumbnailUrl: data.thumbnail_url,
    createdAt: new Date(data.created_at).getTime(),
    width: data.width,
    height: data.height,
    projectId: data.project_id,
  };
}

// Enhanced project management interfaces
export interface EnhancedVideoProject {
  id: string;
  title: string;
  description: string;
  aspectRatio: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  tags: string[];
  thumbnailUrl?: string;
  duration: number;
  frameRate: number;
  width: number;
  height: number;
  isPublic: boolean;
  templateId?: string;
  userId?: string;
  settings: Record<string, any>;
  lastSavedAt: number;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  version: number;
  data: any;
  createdAt: number;
  description?: string;
  autoSave: boolean;
}

export interface EnhancedVideoTrack {
  id: string;
  projectId: string;
  type: "video" | "music" | "voiceover";
  label: string;
  locked: boolean;
  muted: boolean;
  solo: boolean;
  volume: number;
  color: string;
  groupId?: string;
  orderIndex: number;
  effects: any[];
  createdAt: number;
}

export interface EnhancedVideoKeyFrame {
  id: string;
  trackId: string;
  timestamp: number;
  duration: number;
  mediaId: string;
  effects: any[];
  transitions: Record<string, any>;
  volume: number;
  opacity: number;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  cropArea?: Record<string, any>;
  createdAt: number;
}

// Enhanced project management functions
export async function saveProjectToSupabase(
  projectId: string,
  projectData: Partial<EnhancedVideoProject>,
  autoSave: boolean = false,
): Promise<void> {
  const now = new Date().toISOString();

  // Update project
  const { error: projectError } = await supabase
    .from("enhanced_projects")
    .upsert({
      id: projectId,
      ...projectData,
      updated_at: now,
      last_saved_at: now,
    });

  if (projectError) {
    throw new Error(`Failed to save project: ${projectError.message}`);
  }

  // Create version snapshot if not auto-save
  if (!autoSave) {
    const { data: currentProject } = await supabase
      .from("enhanced_projects")
      .select("version")
      .eq("id", projectId)
      .single();

    const newVersion = (currentProject?.version || 0) + 1;

    const { error: versionError } = await supabase
      .from("project_versions")
      .insert({
        project_id: projectId,
        version: newVersion,
        data: projectData,
        auto_save: autoSave,
        description: autoSave ? "Auto-save" : "Manual save",
      });

    if (versionError) {
      console.warn("Failed to create version:", versionError.message);
    }

    // Update project version
    await supabase
      .from("enhanced_projects")
      .update({ version: newVersion })
      .eq("id", projectId);
  }
}

export async function loadProjectFromSupabase(projectId: string): Promise<{
  project: EnhancedVideoProject | null;
  tracks: EnhancedVideoTrack[];
  keyframes: EnhancedVideoKeyFrame[];
}> {
  // Load project
  const { data: project, error: projectError } = await supabase
    .from("enhanced_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError) {
    throw new Error(`Failed to load project: ${projectError.message}`);
  }

  // Load tracks
  const { data: tracks, error: tracksError } = await supabase
    .from("enhanced_tracks")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index");

  if (tracksError) {
    throw new Error(`Failed to load tracks: ${tracksError.message}`);
  }

  // Load keyframes
  const { data: keyframes, error: keyframesError } = await supabase
    .from("enhanced_keyframes")
    .select("*")
    .in("track_id", tracks?.map((t) => t.id) || [])
    .order("timestamp");

  if (keyframesError) {
    throw new Error(`Failed to load keyframes: ${keyframesError.message}`);
  }

  return {
    project: project
      ? {
          id: project.id,
          title: project.title,
          description: project.description,
          aspectRatio: project.aspect_ratio,
          createdAt: new Date(project.created_at).getTime(),
          updatedAt: new Date(project.updated_at).getTime(),
          version: project.version,
          tags: project.tags || [],
          thumbnailUrl: project.thumbnail_url,
          duration: project.duration,
          frameRate: project.frame_rate,
          width: project.width,
          height: project.height,
          isPublic: project.is_public,
          templateId: project.template_id,
          userId: project.user_id,
          settings: project.settings || {},
          lastSavedAt: new Date(project.last_saved_at).getTime(),
        }
      : null,
    tracks:
      tracks?.map((track) => ({
        id: track.id,
        projectId: track.project_id,
        type: track.type as "video" | "music" | "voiceover",
        label: track.label,
        locked: track.locked,
        muted: track.muted,
        solo: track.solo,
        volume: track.volume,
        color: track.color,
        groupId: track.group_id,
        orderIndex: track.order_index,
        effects: track.effects || [],
        createdAt: new Date(track.created_at).getTime(),
      })) || [],
    keyframes:
      keyframes?.map((keyframe) => ({
        id: keyframe.id,
        trackId: keyframe.track_id,
        timestamp: keyframe.timestamp,
        duration: keyframe.duration,
        mediaId: keyframe.media_id,
        effects: keyframe.effects || [],
        transitions: keyframe.transitions || {},
        volume: keyframe.volume,
        opacity: keyframe.opacity,
        transform: keyframe.transform || { x: 0, y: 0, scale: 1, rotation: 0 },
        cropArea: keyframe.crop_area,
        createdAt: new Date(keyframe.created_at).getTime(),
      })) || [],
  };
}

export async function getProjectVersions(
  projectId: string,
): Promise<ProjectVersion[]> {
  const { data, error } = await supabase
    .from("project_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("version", { ascending: false });

  if (error) {
    throw new Error(`Failed to load versions: ${error.message}`);
  }

  return (
    data?.map((version) => ({
      id: version.id,
      projectId: version.project_id,
      version: version.version,
      data: version.data,
      createdAt: new Date(version.created_at).getTime(),
      description: version.description,
      autoSave: version.auto_save,
    })) || []
  );
}

export async function restoreProjectVersion(
  projectId: string,
  versionId: string,
): Promise<void> {
  const { data: version, error } = await supabase
    .from("project_versions")
    .select("*")
    .eq("id", versionId)
    .single();

  if (error) {
    throw new Error(`Failed to load version: ${error.message}`);
  }

  await saveProjectToSupabase(projectId, version.data, false);
}

export async function duplicateProject(
  projectId: string,
  newTitle: string,
): Promise<string> {
  const { project, tracks, keyframes } =
    await loadProjectFromSupabase(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  const newProjectId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

  // Create new project
  await saveProjectToSupabase(newProjectId, {
    ...project,
    id: newProjectId,
    title: newTitle,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  });

  // Duplicate tracks and keyframes
  for (const track of tracks) {
    const newTrackId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

    const { error: trackError } = await supabase
      .from("enhanced_tracks")
      .insert({
        ...track,
        id: newTrackId,
        project_id: newProjectId,
      });

    if (trackError) {
      throw new Error(`Failed to duplicate track: ${trackError.message}`);
    }

    // Duplicate keyframes for this track
    const trackKeyframes = keyframes.filter((kf) => kf.trackId === track.id);
    for (const keyframe of trackKeyframes) {
      const { error: keyframeError } = await supabase
        .from("enhanced_keyframes")
        .insert({
          ...keyframe,
          id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
          track_id: newTrackId,
        });

      if (keyframeError) {
        throw new Error(
          `Failed to duplicate keyframe: ${keyframeError.message}`,
        );
      }
    }
  }

  return newProjectId;
}

// Hook for uploading files with React
export function useSupabaseUpload() {
  const uploadFiles = async (files: File[]): Promise<UploadedFile[]> => {
    const uploadPromises = files.map((file) => uploadFile(file));
    return Promise.all(uploadPromises);
  };

  return { uploadFiles };
}
