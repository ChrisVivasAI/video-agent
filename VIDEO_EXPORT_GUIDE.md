# Video Export and Sharing with Supabase

This guide explains how the video export and sharing system works with Supabase storage and database.

## Overview

The video export system has been completely redesigned to use Supabase instead of Upstash/Vercel KV. Here's how it works:

### Export Process
1. **Video Composition**: FAL AI's ffmpeg-api composes the video from your timeline
2. **Download**: The system downloads the video from FAL AI's temporary URL
3. **Upload to Supabase**: The video is uploaded to your Supabase `videos` bucket
4. **Metadata Storage**: Video metadata is stored in the `shared_videos` table
5. **Ready for Sharing**: The video is now permanently stored and shareable

## Features

### ✅ Fixed Issues
- **Download Works**: Videos can now be properly downloaded
- **Permanent Storage**: Videos are stored permanently in Supabase (not temporary URLs)
- **No CORS Issues**: Direct downloads from your Supabase storage
- **Better Performance**: Videos load faster from your CDN

### ✅ New Capabilities
- **Persistent Sharing**: Share links never expire (unless you delete them)
- **Better SEO**: Proper Open Graph metadata for social sharing
- **Analytics Ready**: Track video views and shares through Supabase
- **Cost Control**: You control storage costs through your Supabase plan

## Technical Implementation

### Database Schema
```sql
CREATE TABLE shared_videos (
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
```

### Storage Structure
```
videos/
  exports/
    1703123456789-abc123.mp4
    1703123567890-def456.mp4
```

### API Endpoints
- `POST /api/share` - Store video metadata in Supabase
- `GET /share/[id]` - View shared video page

## Setup Requirements

### 1. Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup
Run the `supabase-migrations.sql` file in your Supabase SQL editor to create:
- `shared_videos` table
- Storage buckets (`media` and `videos`)
- RLS policies for public access

### 3. Storage Configuration
- Create `videos` bucket for exported videos
- Enable public access for sharing
- Configure appropriate file size limits

## Usage

### For Users
1. **Export**: Click the Export button in the video editor
2. **Wait**: The system composes and uploads your video
3. **Download**: Click Download to save the video locally
4. **Share**: Click Share to get a permanent sharing link

### For Developers
```typescript
// Export and upload video
const exportedVideo = await exportVideo.mutateAsync();
// Returns: { originalUrl, supabaseUrl, thumbnailUrl }

// Store sharing metadata
const shareId = await storeSharedVideo({
  title: "My Video",
  videoUrl: exportedVideo.supabaseUrl,
  // ... other metadata
});

// Fetch shared video
const sharedVideo = await fetchSharedVideo(shareId);
```

## Benefits Over Previous System

### Before (Upstash)
- ❌ Temporary video URLs from FAL AI
- ❌ Download issues due to CORS
- ❌ Limited to 6-month expiration
- ❌ Dependent on Vercel KV pricing
- ❌ No permanent video storage

### After (Supabase)
- ✅ Permanent video storage
- ✅ Reliable downloads
- ✅ No expiration (unless you delete)
- ✅ Predictable pricing
- ✅ Full control over your data
- ✅ Better performance with CDN
- ✅ Analytics and monitoring capabilities

## Monitoring and Maintenance

### Storage Usage
Monitor your Supabase storage usage in the dashboard:
- Check `videos` bucket size
- Set up alerts for storage limits
- Implement cleanup policies if needed

### Database Queries
Track shared video analytics:
```sql
-- Most shared videos
SELECT title, created_at, video_url 
FROM shared_videos 
ORDER BY created_at DESC;

-- Storage usage by date
SELECT DATE(created_at) as date, COUNT(*) as videos_created
FROM shared_videos 
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Troubleshooting

### Common Issues

1. **Upload Fails**
   - Check Supabase storage policies
   - Verify bucket exists and is public
   - Check file size limits

2. **Download Doesn't Work**
   - Verify video URL is accessible
   - Check browser CORS settings
   - Ensure bucket is public

3. **Share Link Broken**
   - Check if video exists in database
   - Verify video file exists in storage
   - Check RLS policies

### Debug Steps
1. Check browser console for errors
2. Verify Supabase connection in Network tab
3. Test storage upload manually in Supabase dashboard
4. Check database entries in Supabase table editor

## Future Enhancements

Possible improvements:
- Video compression before upload
- Multiple quality options
- Batch export functionality
- Video analytics dashboard
- Automatic cleanup of old videos
- Video thumbnails generation
- Social media optimized formats 