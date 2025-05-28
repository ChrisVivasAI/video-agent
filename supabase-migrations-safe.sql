-- Safe Supabase Migration Script
-- This script handles existing data and policies gracefully

-- First, let's handle the storage bucket and policies safely
-- Create videos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Allow public uploads to videos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads from videos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from videos bucket" ON storage.objects;

-- Create storage policies for videos bucket
CREATE POLICY "Allow public uploads to videos bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Allow public downloads from videos bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "Allow public deletes from videos bucket" ON storage.objects
  FOR DELETE USING (bucket_id = 'videos');

-- Enhanced project management tables
CREATE TABLE IF NOT EXISTS enhanced_projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  frame_rate INTEGER DEFAULT 30,
  width INTEGER DEFAULT 1920,
  height INTEGER DEFAULT 1080,
  is_public BOOLEAN DEFAULT false,
  template_id TEXT,
  user_id TEXT,
  settings JSONB DEFAULT '{}',
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project versions for history
CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT,
  auto_save BOOLEAN DEFAULT false
);

-- Add foreign key constraint only if table was just created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_versions_project_id_fkey'
  ) THEN
    ALTER TABLE project_versions 
    ADD CONSTRAINT project_versions_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES enhanced_projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enhanced tracks table
CREATE TABLE IF NOT EXISTS enhanced_tracks (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('video', 'music', 'voiceover')),
  label TEXT NOT NULL,
  locked BOOLEAN DEFAULT false,
  muted BOOLEAN DEFAULT false,
  solo BOOLEAN DEFAULT false,
  volume REAL DEFAULT 1.0,
  color TEXT DEFAULT '#3b82f6',
  group_id TEXT,
  order_index INTEGER DEFAULT 0,
  effects JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint only if table was just created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'enhanced_tracks_project_id_fkey'
  ) THEN
    ALTER TABLE enhanced_tracks 
    ADD CONSTRAINT enhanced_tracks_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES enhanced_projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enhanced keyframes table
CREATE TABLE IF NOT EXISTS enhanced_keyframes (
  id TEXT PRIMARY KEY,
  track_id TEXT,
  timestamp INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  media_id TEXT NOT NULL,
  effects JSONB DEFAULT '[]',
  transitions JSONB DEFAULT '{}',
  volume REAL DEFAULT 1.0,
  opacity REAL DEFAULT 1.0,
  transform JSONB DEFAULT '{"x": 0, "y": 0, "scale": 1, "rotation": 0}',
  crop_area JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint only if table was just created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'enhanced_keyframes_track_id_fkey'
  ) THEN
    ALTER TABLE enhanced_keyframes 
    ADD CONSTRAINT enhanced_keyframes_track_id_fkey 
    FOREIGN KEY (track_id) REFERENCES enhanced_tracks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Project templates
CREATE TABLE IF NOT EXISTS project_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT,
  data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_enhanced_projects_user_id ON enhanced_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_projects_updated_at ON enhanced_projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_enhanced_tracks_project_id ON enhanced_tracks(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_enhanced_keyframes_track_id ON enhanced_keyframes(track_id, timestamp);

-- Enable RLS (safe to run multiple times)
ALTER TABLE enhanced_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_keyframes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
-- Enhanced Projects Policies
DROP POLICY IF EXISTS "Allow public read access to projects" ON enhanced_projects;
DROP POLICY IF EXISTS "Allow public insert to projects" ON enhanced_projects;
DROP POLICY IF EXISTS "Allow public update to projects" ON enhanced_projects;
DROP POLICY IF EXISTS "Allow public delete to projects" ON enhanced_projects;

CREATE POLICY "Allow public read access to projects" ON enhanced_projects
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to projects" ON enhanced_projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to projects" ON enhanced_projects
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to projects" ON enhanced_projects
  FOR DELETE USING (true);

-- Project Versions Policies
DROP POLICY IF EXISTS "Allow public read access to versions" ON project_versions;
DROP POLICY IF EXISTS "Allow public insert to versions" ON project_versions;
DROP POLICY IF EXISTS "Allow public update to versions" ON project_versions;
DROP POLICY IF EXISTS "Allow public delete to versions" ON project_versions;

CREATE POLICY "Allow public read access to versions" ON project_versions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to versions" ON project_versions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to versions" ON project_versions
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to versions" ON project_versions
  FOR DELETE USING (true);

-- Enhanced Tracks Policies
DROP POLICY IF EXISTS "Allow public read access to tracks" ON enhanced_tracks;
DROP POLICY IF EXISTS "Allow public insert to tracks" ON enhanced_tracks;
DROP POLICY IF EXISTS "Allow public update to tracks" ON enhanced_tracks;
DROP POLICY IF EXISTS "Allow public delete to tracks" ON enhanced_tracks;

CREATE POLICY "Allow public read access to tracks" ON enhanced_tracks
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to tracks" ON enhanced_tracks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to tracks" ON enhanced_tracks
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to tracks" ON enhanced_tracks
  FOR DELETE USING (true);

-- Enhanced Keyframes Policies
DROP POLICY IF EXISTS "Allow public read access to keyframes" ON enhanced_keyframes;
DROP POLICY IF EXISTS "Allow public insert to keyframes" ON enhanced_keyframes;
DROP POLICY IF EXISTS "Allow public update to keyframes" ON enhanced_keyframes;
DROP POLICY IF EXISTS "Allow public delete to keyframes" ON enhanced_keyframes;

CREATE POLICY "Allow public read access to keyframes" ON enhanced_keyframes
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to keyframes" ON enhanced_keyframes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to keyframes" ON enhanced_keyframes
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to keyframes" ON enhanced_keyframes
  FOR DELETE USING (true);

-- Project Templates Policies
DROP POLICY IF EXISTS "Allow public read access to templates" ON project_templates;
DROP POLICY IF EXISTS "Allow public insert to templates" ON project_templates;
DROP POLICY IF EXISTS "Allow public update to templates" ON project_templates;
DROP POLICY IF EXISTS "Allow public delete to templates" ON project_templates;

CREATE POLICY "Allow public read access to templates" ON project_templates
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to templates" ON project_templates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to templates" ON project_templates
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to templates" ON project_templates
  FOR DELETE USING (true);

-- Ensure shared_videos table exists (from previous setup)
CREATE TABLE IF NOT EXISTS shared_videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  project_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for shared_videos if they don't exist
CREATE INDEX IF NOT EXISTS idx_shared_videos_created_at ON shared_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_videos_project_id ON shared_videos(project_id);

-- Enable RLS for shared_videos
ALTER TABLE shared_videos ENABLE ROW LEVEL SECURITY;

-- Shared Videos Policies
DROP POLICY IF EXISTS "Allow public read access" ON shared_videos;
DROP POLICY IF EXISTS "Allow public insert" ON shared_videos;
DROP POLICY IF EXISTS "Allow public update" ON shared_videos;
DROP POLICY IF EXISTS "Allow public delete" ON shared_videos;

CREATE POLICY "Allow public read access" ON shared_videos
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON shared_videos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON shared_videos
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON shared_videos
  FOR DELETE USING (true); 