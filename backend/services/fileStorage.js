const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { getSupabaseClient, isSupabaseConfigured } = require('../config/supabase');

const uploadDir = path.join(__dirname, '../../images/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `product-${timestamp}-${random}${ext.toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10
  }
});

/**
 * Upload file to Supabase Storage
 * @param {string} filePath - Local file path
 * @param {string} fileName - File name to use in storage
 * @param {string} contentType - MIME type
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadToSupabaseStorage(filePath, fileName, contentType = 'image/jpeg') {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Images will be stored locally (ephemeral).');
  }

  try {
    const supabase = getSupabaseClient();
    const fileBuffer = fs.readFileSync(filePath);
    
    // Upload to Supabase Storage bucket 'product-images'
    // IMPORTANT: Make sure this bucket exists in your Supabase project and is set to PUBLIC
    // See SUPABASE_STORAGE_SETUP.md for setup instructions
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, fileBuffer, {
        contentType: contentType,
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path
    };
  } catch (error) {
    console.error('Error uploading to Supabase Storage:', error);
    throw error;
  }
}

/**
 * Build image response - uses Supabase Storage if configured, otherwise local
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} Image response object
 */
async function buildImageResponse(file) {
  // If Supabase is configured, upload to cloud storage
  if (isSupabaseConfigured() && file.path) {
    try {
      const { url, path: storagePath } = await uploadToSupabaseStorage(
        file.path,
        file.filename,
        file.mimetype
      );

      // Delete local file after successful upload
      try {
        fs.unlinkSync(file.path);
      } catch (deleteError) {
        console.warn('Failed to delete local file after upload:', deleteError);
      }

      return {
        filename: file.filename,
        url: url,
        path: storagePath,
        size: file.size || 0,
        mimetype: file.mimetype || 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        storage: 'supabase'
      };
    } catch (error) {
      console.error('Failed to upload to Supabase, falling back to local:', error);
      // Fall back to local storage if Supabase upload fails
    }
  }

  // Fallback to local storage (ephemeral - will be lost on redeploy)
  return {
    filename: file.filename,
    url: `/images/uploads/${file.filename}`,
    size: file.size || 0,
    mimetype: file.mimetype || 'image/jpeg',
    uploadedAt: new Date().toISOString(),
    storage: 'local'
  };
}

module.exports = {
  upload,
  buildImageResponse,
  uploadDir,
  uploadToSupabaseStorage
};














