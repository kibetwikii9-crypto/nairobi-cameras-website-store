# Supabase Storage Setup Guide

## Problem
When you redeploy your application, uploaded product images are lost because they're stored in the local filesystem (ephemeral storage). The database still has references to these images, causing 404 errors.

## Solution
Use Supabase Storage to store images permanently in the cloud.

## Setup Steps

### 1. Create Storage Bucket in Supabase

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `product-images`
   - **Public bucket**: ✅ **Enable** (so images can be accessed via public URLs)
   - **File size limit**: 5MB (or your preferred limit)
   - **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`
5. Click **"Create bucket"**

### 2. Set Up Bucket Policies (Make it Public)

1. In the Storage section, click on the `product-images` bucket
2. Go to **"Policies"** tab
3. Click **"New Policy"**
4. Create a policy for **SELECT** (read access):
   - **Policy name**: `Public read access`
   - **Allowed operation**: `SELECT`
   - **Policy definition**: 
     ```sql
     (bucket_id = 'product-images')
     ```
   - **Target roles**: `public` (or `anon` if you prefer)
5. Click **"Save policy"**

### 3. Verify Environment Variables

Make sure your `.env` or `env.production` file has:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important**: Use the **Service Role Key** (not the anon key) for backend operations. This gives full access to Storage.

### 4. Test the Setup

After deploying, upload a product image through the admin panel. The image should:
- Upload to Supabase Storage
- Return a public URL (e.g., `https://your-project.supabase.co/storage/v1/object/public/product-images/product-123456.jpg`)
- Persist even after server redeployment

## How It Works

1. When an image is uploaded:
   - File is temporarily saved to local filesystem
   - File is uploaded to Supabase Storage bucket `product-images`
   - Local file is deleted
   - Public URL is returned and saved to database

2. If Supabase is not configured:
   - System falls back to local storage (ephemeral)
   - Images will be lost on redeploy

## Troubleshooting

### Images still showing 404 after setup
- Verify the bucket name is exactly `product-images`
- Check that the bucket is set to **Public**
- Verify your `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check server logs for upload errors

### "Supabase is not configured" error
- Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in environment variables
- Restart the server after adding environment variables

### Permission denied errors
- Make sure the bucket policy allows public read access
- Verify you're using the Service Role Key (not anon key)

## Migration of Existing Images

Existing products with local image URLs (`/images/uploads/...`) will need to be migrated:
1. Download existing images
2. Re-upload them through the admin panel
3. Or create a migration script to upload existing images to Supabase Storage

