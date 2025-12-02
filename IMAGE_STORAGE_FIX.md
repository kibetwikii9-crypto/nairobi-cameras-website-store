# Image Storage Fix - 404 Error Solution

## Problem
When you refresh/redeploy the application, product images get lost but product details remain. This causes 404 errors when trying to load images.

**Root Cause**: Images are stored in the local filesystem (`images/uploads/`), which is ephemeral on hosting platforms like Render, Heroku, etc. When the server redeploys, the filesystem is reset, losing all uploaded images. However, the database still contains references to these images.

## Solution Implemented
Updated the image storage system to use **Supabase Storage** instead of local filesystem storage. Images are now stored permanently in the cloud.

## Changes Made

### 1. Updated `backend/services/fileStorage.js`
- Added Supabase Storage integration
- Images are now uploaded to Supabase Storage bucket `product-images`
- Local files are deleted after successful cloud upload
- Falls back to local storage if Supabase is not configured

### 2. Updated Upload Endpoints
- `backend/server-production.js` - Updated to handle async image uploads
- `backend/server-dev.js` - Updated to handle async image uploads

### 3. Created Setup Guide
- `SUPABASE_STORAGE_SETUP.md` - Complete instructions for setting up Supabase Storage

## Next Steps

### 1. Set Up Supabase Storage Bucket
Follow the instructions in `SUPABASE_STORAGE_SETUP.md`:
1. Create a bucket named `product-images` in your Supabase project
2. Make it public
3. Set up proper policies

### 2. Verify Environment Variables
Ensure these are set in your environment:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Test the Fix
1. Upload a new product image through the admin panel
2. Check that the returned URL is a Supabase Storage URL (not `/images/uploads/...`)
3. Redeploy the application
4. Verify the image still loads correctly

## How It Works Now

**Before (Ephemeral Storage)**:
```
Upload → Local filesystem → Database saves `/images/uploads/file.jpg`
Redeploy → Filesystem reset → 404 error ❌
```

**After (Cloud Storage)**:
```
Upload → Supabase Storage → Database saves `https://...supabase.co/.../file.jpg`
Redeploy → Images still in cloud → Works! ✅
```

## Migration of Existing Products

Products with old local image URLs will need to be updated:
1. Option 1: Re-upload images through admin panel (recommended)
2. Option 2: Create a migration script to upload existing images to Supabase Storage

## Troubleshooting

If images still show 404:
- Check server logs for upload errors
- Verify Supabase Storage bucket exists and is public
- Verify environment variables are set correctly
- Check that Service Role Key (not anon key) is being used

