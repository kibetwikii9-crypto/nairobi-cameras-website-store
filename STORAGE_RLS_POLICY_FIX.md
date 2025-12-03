# Fix Supabase Storage RLS Policy Error

## Error Message
```
Failed to upload image to Supabase Storage: new row violates row-level security policy
```

## Problem
The bucket exists, but Row-Level Security (RLS) policies are blocking uploads. Even though the bucket is "public" (for reading), you need separate policies for uploading.

## Solution: Add Storage Policies

### Method 1: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - https://app.supabase.com
   - Select your project

2. **Navigate to Storage**
   - Click "Storage" in left sidebar
   - Click on bucket "images"

3. **Go to Policies Tab**
   - Click "Policies" tab at the top

4. **Create INSERT Policy (Upload)**
   - Click "New Policy"
   - Select "For full customization"
   - Configure:
     - **Policy name**: `Allow service_role uploads`
     - **Allowed operation**: `INSERT`
     - **Policy definition**:
       ```sql
       (bucket_id = 'images')
       ```
     - **Target roles**: `service_role`, `authenticated`
   - Click "Save policy"

5. **Create SELECT Policy (Read) - if not exists**
   - Click "New Policy"
   - Select "For full customization"
   - Configure:
     - **Policy name**: `Public read access`
     - **Allowed operation**: `SELECT`
     - **Policy definition**:
       ```sql
       (bucket_id = 'images')
       ```
     - **Target roles**: `public`, `anon`
   - Click "Save policy"

6. **Create UPDATE Policy (Optional)**
   - Click "New Policy"
   - Select "For full customization"
   - Configure:
     - **Policy name**: `Allow service_role updates`
     - **Allowed operation**: `UPDATE`
     - **Policy definition**:
       ```sql
       (bucket_id = 'images')
       ```
     - **Target roles**: `service_role`, `authenticated`
   - Click "Save policy"

7. **Create DELETE Policy (Optional)**
   - Click "New Policy"
   - Select "For full customization"
   - Configure:
     - **Policy name**: `Allow service_role deletes`
     - **Allowed operation**: `DELETE`
     - **Policy definition**:
       ```sql
       (bucket_id = 'images')
       ```
     - **Target roles**: `service_role`, `authenticated`
   - Click "Save policy"

### Method 2: Using SQL Editor (Faster)

1. **Go to SQL Editor** in Supabase Dashboard
2. **Run this SQL**:

```sql
-- Allow service_role to upload files
CREATE POLICY "Allow service_role uploads" 
ON storage.objects 
FOR INSERT 
TO service_role
WITH CHECK (bucket_id = 'images');

-- Allow authenticated users to upload (if needed)
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Allow public to read files
CREATE POLICY "Public read access" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'images');

-- Allow service_role to update files
CREATE POLICY "Allow service_role updates" 
ON storage.objects 
FOR UPDATE 
TO service_role
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Allow service_role to delete files
CREATE POLICY "Allow service_role deletes" 
ON storage.objects 
FOR DELETE 
TO service_role
USING (bucket_id = 'images');
```

3. **Click "Run"** to execute

## Verify the Fix

After adding the policies, test the upload:

1. Try uploading an image through the admin panel
2. Or run the test script:
   ```bash
   cd backend
   node test-image-upload.js
   ```

## Important Notes

- **Public bucket** = Files can be read by anyone (for public URLs)
- **RLS Policies** = Control who can INSERT/UPDATE/DELETE files
- **service_role** = Your backend uses this key, so it needs INSERT permission
- **public/anon** = Anyone can read files (for displaying images on website)

## Why This Happens

Supabase Storage uses Row-Level Security (RLS) by default. Even if a bucket is "public", you still need explicit policies for:
- **INSERT** (uploading)
- **UPDATE** (updating)
- **DELETE** (deleting)

The "public" setting only affects **SELECT** (reading) permissions.
