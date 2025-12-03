# Supabase Storage Bucket Setup Instructions

## Test Results

✅ **Supabase is configured correctly**
- URL: `https://aufxaqqggdsvenpxheyp.supabase.co`
- Service role key is set

❌ **Storage bucket 'images' does not exist**

## Manual Setup Required

You need to create the bucket manually in Supabase Dashboard:

### Step 1: Create the Bucket

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **Storage** in the left sidebar
4. Click **"New bucket"** button
5. Configure the bucket:
   - **Name**: `images`
   - **Public bucket**: ✅ **Enable this** (very important!)
   - **File size limit**: 10MB (or your preference)
   - **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`
6. Click **"Create bucket"**

### Step 2: Set Up Public Access Policy

1. In the Storage section, click on the `images` bucket
2. Go to the **"Policies"** tab
3. Click **"New Policy"**
4. Create a policy for public read access:
   - **Policy name**: `Public read access`
   - **Allowed operation**: `SELECT` (read)
   - **Policy definition**: 
     ```sql
     (bucket_id = 'images')
     ```
   - **Target roles**: `public` or `anon`
5. Click **"Save policy"**

### Step 3: Verify Setup

After creating the bucket, run the test again:

```bash
cd backend
node test-image-upload.js
```

You should see:
- ✅ Bucket 'images' exists
- ✅ Upload works
- ✅ Public URL generation works

## Alternative: Use a Different Bucket Name

If you want to use a different bucket name (e.g., `product-images`):

1. Set the environment variable:
   ```env
   SUPABASE_STORAGE_BUCKET=product-images
   ```

2. Create the bucket with that name in Supabase Dashboard

3. Make it public and set up the same policies

## Current Status

- ✅ Supabase connection: Working
- ❌ Storage bucket: Needs to be created
- ⏳ Image uploads: Will work after bucket is created

