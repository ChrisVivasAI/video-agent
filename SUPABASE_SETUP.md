# Supabase Setup for Media Uploads

This application uses Supabase for media file storage instead of UploadThing. Follow these steps to set up Supabase storage:

## 1. Environment Variables

Add these variables to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 2. Create Storage Buckets

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create a new bucket named `media` for user uploads
4. Create a new bucket named `videos` for exported videos
5. Make both buckets public for easy access to uploaded files

## 3. Database Setup

Run the SQL migration file `supabase-migrations.sql` in your Supabase SQL editor to create:
- `shared_videos` table for storing video metadata
- Storage buckets and policies
- Proper RLS policies

## 4. Storage Policies

The migration file will automatically set up the following RLS policies:

### For Media Bucket (user uploads)
```sql
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'media');

CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'media');
```

### For Videos Bucket (exported videos)
```sql
CREATE POLICY "Allow public uploads to videos bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Allow public downloads from videos bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'videos');
```

## 5. File Structure

Files will be stored in the following structure:
```
media/
  uploads/
    timestamp-randomstring.ext

videos/
  exports/
    timestamp-randomstring.mp4
```

## 6. Supported File Types

The application supports uploading:
- Images: jpg, jpeg, png, gif, webp
- Videos: mp4, mov, avi, webm
- Audio: mp3, wav, m4a, aac

## 7. File Size Limits

Default limits (can be configured in Supabase):
- Images: 16MB
- Videos: 512MB  
- Audio: 64MB

## 8. Usage

### Media Uploads
Users can upload media files through:
- The upload button in the left panel gallery
- The upload option in the right panel when generating content

### Video Export and Sharing
- Export videos through the export dialog
- Videos are automatically uploaded to Supabase storage
- Share videos with generated URLs
- Download videos directly from Supabase

Files are automatically processed and added to the project's media library for use in video compositions. 