/**
 * Simple Image Storage Service
 * Handles image uploads with automatic fallback
 */

const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Supabase Storage bucket name (can be overridden via environment variable)
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../images/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created upload directory:', uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `product-${timestamp}-${random}${ext.toLowerCase()}`;
    cb(null, filename);
  }
});

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
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
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
 * Returns image URL and metadata
 * 
 * @param {Object} file - Multer file object
 * @returns {Object} Image response with URL and metadata
 */
async function processImage(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  if (!file.path) {
    throw new Error('File path is missing');
  }

  if (!file.filename) {
    throw new Error('File filename is missing');
  }

  // Generate local URL
  const localUrl = `/images/uploads/${file.filename}`;

  // Try Supabase upload if configured
  let finalUrl = localUrl;
  let storageType = 'local';

  try {
    const { getSupabaseClient, isSupabaseConfigured } = require('../config/supabase');
    
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const fileBuffer = fs.readFileSync(file.path);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(file.filename, fileBuffer, {
          contentType: file.mimetype || 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.warn('⚠️ Supabase upload failed, using local storage:', uploadError.message);
        console.warn('⚠️ Error details:', {
          status: uploadError.status,
          statusCode: uploadError.statusCode,
          message: uploadError.message
        });
        // Continue with local storage below
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(uploadData.path);

        if (urlData && urlData.publicUrl) {
          finalUrl = urlData.publicUrl;
          storageType = 'supabase';
          
          // Delete local file after successful Supabase upload
          try {
            fs.unlinkSync(file.path);
            console.log('✅ Uploaded to Supabase, deleted local file');
          } catch (deleteError) {
            console.warn('⚠️ Could not delete local file:', deleteError.message);
          }
        }
      }
    }
  } catch (error) {
    // If Supabase fails, just use local storage
    console.warn('⚠️ Supabase not available, using local storage:', error.message);
  }

  // Return image response
  return {
    filename: file.filename,
    url: finalUrl,
    size: file.size || 0,
    mimetype: file.mimetype || 'image/jpeg',
    uploadedAt: new Date().toISOString(),
    storage: storageType
  };
}

module.exports = {
  upload,
  processImage,
  uploadDir
};

