-- Create shared_videos table for storing video metadata
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shared_videos_created_at ON shared_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_videos_project_id ON shared_videos(project_id);

-- Enable Row Level Security (RLS)
ALTER TABLE shared_videos ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since videos are meant to be shared)
CREATE POLICY "Allow public read access" ON shared_videos
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON shared_videos
  FOR INSERT WITH CHECK (true);

-- Optional: Create policy to allow updates only by the creator
-- CREATE POLICY "Allow update by creator" ON shared_videos
--   FOR UPDATE USING (auth.uid()::text = project_id);

-- Create storage bucket for videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

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
  project_id TEXT REFERENCES enhanced_projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT,
  auto_save BOOLEAN DEFAULT false
);

-- Enhanced tracks table
CREATE TABLE IF NOT EXISTS enhanced_tracks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES enhanced_projects(id) ON DELETE CASCADE,
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

-- Enhanced keyframes table
CREATE TABLE IF NOT EXISTS enhanced_keyframes (
  id TEXT PRIMARY KEY,
  track_id TEXT REFERENCES enhanced_tracks(id) ON DELETE CASCADE,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enhanced_projects_user_id ON enhanced_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_projects_updated_at ON enhanced_projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_enhanced_tracks_project_id ON enhanced_tracks(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_enhanced_keyframes_track_id ON enhanced_keyframes(track_id, timestamp);

-- Enable RLS
ALTER TABLE enhanced_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_keyframes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public access (adjust based on your auth requirements)
CREATE POLICY "Allow public read access to projects" ON enhanced_projects
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to projects" ON enhanced_projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to projects" ON enhanced_projects
  FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to versions" ON project_versions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to versions" ON project_versions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to tracks" ON enhanced_tracks
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to tracks" ON enhanced_tracks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to tracks" ON enhanced_tracks
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to tracks" ON enhanced_tracks
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access to keyframes" ON enhanced_keyframes
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to keyframes" ON enhanced_keyframes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to keyframes" ON enhanced_keyframes
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to keyframes" ON enhanced_keyframes
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access to templates" ON project_templates
  FOR SELECT USING (true); 