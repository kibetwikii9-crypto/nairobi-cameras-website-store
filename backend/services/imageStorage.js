/**
 * Image Storage Service - Supabase Storage Only
 * All images are stored in Supabase Storage. No local storage.
 */

const multer = require('multer');

// Supabase Storage bucket name (can be overridden via environment variable)
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';

// Use memory storage - files are never saved to disk
// They are uploaded directly to Supabase from memory
const storage = multer.memoryStorage();

// Multer upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Max 10 files
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(require('path').extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

/**
 * Process uploaded image file
 * Uploads directly to Supabase Storage - no local storage
 * 
 * @param {Object} file - Multer file object (from memory storage)
 * @returns {Object} Image response with URL and metadata
 */
async function processImage(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  if (!file.buffer) {
    throw new Error('File buffer is missing');
  }

  // Generate unique filename
  const path = require('path');
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const ext = path.extname(file.originalname) || '.jpg';
  const filename = `product-${timestamp}-${random}${ext.toLowerCase()}`;

  // Supabase is REQUIRED - no fallback to local storage
  const { getSupabaseClient, isSupabaseConfigured } = require('../config/supabase');
  
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase Storage is required but not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
  }

  console.log('📤 Uploading image to Supabase Storage:', filename);
  console.log('📦 Using bucket:', STORAGE_BUCKET);
  
  const supabase = getSupabaseClient();
  
  // Upload directly to Supabase Storage from memory buffer
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, file.buffer, {
      contentType: file.mimetype || 'image/jpeg',
      upsert: false
    });

  if (uploadError) {
    console.error('❌ Supabase upload failed:', uploadError.message);
    console.error('❌ Error details:', {
      status: uploadError.status,
      statusCode: uploadError.statusCode,
      message: uploadError.message,
      error: uploadError
    });
    throw new Error(`Failed to upload image to Supabase Storage: ${uploadError.message}. Please check your Supabase configuration and ensure bucket '${STORAGE_BUCKET}' exists and is accessible.`);
  }

  console.log('✅ Supabase upload successful:', uploadData.path);
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(uploadData.path);

  if (!urlData || !urlData.publicUrl) {
    throw new Error('Failed to generate public URL from Supabase Storage');
  }

  const finalUrl = urlData.publicUrl;
  console.log('✅ Public URL generated:', finalUrl);

  // Return image response
  return {
    filename: filename,
    url: finalUrl,
    size: file.size || 0,
    mimetype: file.mimetype || 'image/jpeg',
    uploadedAt: new Date().toISOString(),
    storage: 'supabase'
  };
}

module.exports = {
  upload,
  processImage
};
