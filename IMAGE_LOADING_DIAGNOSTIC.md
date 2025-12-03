# Image Loading Diagnostic Guide

## Issues Found and Fixed

### 1. ✅ Fixed: Incorrect Error Handler in `js/products.js`
**Problem**: Line 155 had `onerror="this.handleImageError(this)"` which doesn't exist.
**Fix**: Changed to `onerror="window.imageHandler && window.imageHandler.handleImageError(this)"`

### 2. Static File Serving
**Status**: ✅ Configured correctly
- `/images/uploads` route serves uploaded images
- `/images` route serves static images (default.jpg, placeholder.jpg, etc.)
- General static file serving serves everything else

### 3. Image Paths
**Status**: ✅ Correct
- Default images use absolute paths: `/images/default.jpg`
- Product images use paths from database or normalized paths
- Normalization function replaces broken local upload paths

## Diagnostic Steps

### Check 1: Verify Image Files Exist
```bash
# Check if default images exist
ls images/default.jpg
ls images/placeholder.jpg
```

### Check 2: Test Image URLs in Browser
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "Img"
4. Reload page
5. Check if images are being requested
6. Check response codes:
   - 200 = Success
   - 404 = File not found
   - 403 = Permission denied

### Check 3: Check Console for Errors
Look for:
- `⚠️ Replacing broken local upload path with placeholder` - Normal, means broken paths are being fixed
- `Image failed to load: [url]` - Image handler is working
- Any 404 errors for `/images/` paths

### Check 4: Verify ImageHandler is Loaded
In browser console, type:
```javascript
window.imageHandler
```
Should return the ImageHandler instance, not `undefined`

### Check 5: Check CSS
Images might be hidden by CSS:
- `.product-img.loading` has `opacity: 0.5` (semi-transparent, should still be visible)
- `.product-img[src=""]` has `opacity: 0` (hidden, but only if src is empty)

### Check 6: Verify Image Paths in HTML
1. Right-click on missing image
2. Select "Inspect Element"
3. Check the `src` attribute
4. Verify the path is correct

## Common Issues and Solutions

### Issue: Images show as broken/placeholder
**Cause**: Image files don't exist or paths are wrong
**Solution**: 
- Verify image files exist in `images/` directory
- Check if paths use `/images/` (absolute) or `images/` (relative)
- Ensure static file serving is configured correctly

### Issue: Images are invisible but not broken
**Cause**: CSS hiding them or opacity set to 0
**Solution**:
- Check if `.product-img.loading` class is stuck (should be removed on load)
- Check if `src` attribute is empty
- Verify CSS isn't setting `display: none` or `opacity: 0`

### Issue: Images load slowly
**Cause**: Large file sizes or slow server
**Solution**:
- Optimize images (compress, resize)
- Check server response times
- Verify caching headers are set correctly

## Testing Checklist

- [ ] Default images (`/images/default.jpg`) load correctly
- [ ] Placeholder images (`/images/placeholder.jpg`) load correctly
- [ ] Product images from database load correctly
- [ ] Broken image paths are replaced with placeholders
- [ ] ImageHandler is initialized and working
- [ ] No console errors related to images
- [ ] CSS isn't hiding images
- [ ] Static file serving is working

## Next Steps

If images still don't appear:
1. Check browser console for specific errors
2. Check Network tab for failed requests
3. Verify image files exist on server
4. Test image URLs directly in browser (e.g., `http://localhost:5000/images/default.jpg`)
5. Check server logs for any errors



