# Supabase Storage Bucket Name Configuration

## Current Setup

The bucket name is **hardcoded** in `backend/services/imageStorage.js` as `'product-images'` (lines 88 and 105).

## Two Options

### Option 1: Create Bucket with Name `product-images` (Recommended)

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name it exactly: `product-images`
4. Set it to **Public**
5. Click "Create bucket"

This matches the code, so no changes needed.

### Option 2: Change Code to Use Different Bucket Name

If you want to use a different bucket name (e.g., `images` or `products`):

1. **Edit `backend/services/imageStorage.js`**
   - Find line 88: `.from('product-images')`
   - Change to: `.from('your-bucket-name')`
   - Find line 105: `.from('product-images')`
   - Change to: `.from('your-bucket-name')`

2. **Or make it configurable via environment variable:**

   Add to `backend/services/imageStorage.js`:
   ```javascript
   const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';
   ```
   
   Then use:
   ```javascript
   .from(BUCKET_NAME)
   ```
   
   Add to `.env`:
   ```
   SUPABASE_STORAGE_BUCKET=your-bucket-name
   ```

## Current Code Location

```javascript
// Line 88
.from('product-images')

// Line 105
.from('product-images')
```

## Recommendation

**Use Option 1** - Create the bucket named `product-images` in Supabase. This is the simplest solution and matches the existing code.

