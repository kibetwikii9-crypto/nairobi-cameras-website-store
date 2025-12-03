# Quick Fix: Images Not Showing

## Issue
Images are not displaying because:
1. The Supabase Storage bucket `product-images` doesn't exist
2. The code is trying to upload to Supabase but falling back to local storage

## Solution

### Option 1: Use Local Storage (Works Immediately)
The code already falls back to local storage when Supabase fails. Your images should work with local storage paths like `/images/uploads/product-xxx.jpg`.

**To verify:**
1. Check if images exist in `images/uploads/` folder
2. Check if static file serving is working: `http://localhost:5000/images/uploads/product-xxx.jpg`
3. Images should display automatically

### Option 2: Create Supabase Bucket (For Permanent Storage)

If you want to use Supabase Storage for permanent image storage:

1. **Go to your Supabase Dashboard**
   - Navigate to Storage section
   - Click "New bucket"

2. **Create bucket named `product-images`**
   - Name: `product-images`
   - Public: **YES** (must be public for images to be accessible)
   - File size limit: 10MB (or your preference)
   - Allowed MIME types: `image/jpeg, image/png, image/gif, image/webp`

3. **Set up bucket policies**
   - Go to Policies tab
   - Add policy for public read access:
     ```sql
     -- Allow public read access
     CREATE POLICY "Public Access" ON storage.objects
     FOR SELECT USING (bucket_id = 'product-images');
     ```

4. **Restart your server**
   - After creating the bucket, restart the backend server
   - New uploads will go to Supabase Storage
   - Existing local images will continue to work

## Current Status

✅ **Local storage is working** - Images in `images/uploads/` should display
⚠️ **Supabase bucket missing** - But this is OK, local storage is the fallback

## Testing

1. **Check if an image file exists:**
   ```bash
   ls images/uploads/
   ```

2. **Test image URL directly:**
   Open in browser: `http://localhost:5000/images/uploads/product-xxx.jpg`
   (Replace `product-xxx.jpg` with an actual filename)

3. **If image loads directly:**
   - Static file serving is working ✅
   - Images should display on the website ✅

4. **If image doesn't load:**
   - Check server logs for errors
   - Verify static file serving routes are correct
   - Check file permissions

## Notes

- **Local storage is ephemeral** - Images will be lost on server redeploy
- **Supabase storage is permanent** - Images persist across redeploys
- **Both work** - You can use local storage for development, Supabase for production



