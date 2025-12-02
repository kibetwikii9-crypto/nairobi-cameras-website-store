# Supabase Storage Bucket Name Configuration

## Current Setup

The bucket name defaults to `'images'` in `backend/services/imageStorage.js` but can be overridden via environment variable.

## Two Options

### Option 1: Use Default Bucket Name `images` (Recommended)

The code defaults to `images` bucket name. If your bucket is named `images`, it will work automatically with no changes needed.

If you need to use a different bucket name, see Option 2 below.

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

