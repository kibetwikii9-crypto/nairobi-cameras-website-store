const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');
const imageSecurity = require('../middleware/imageSecurity');
const imageCompression = require('./imageCompression');
const imageMetadata = require('./imageMetadata');
const imageCache = require('./imageCache');
const imageMonitoring = require('./imageMonitoring');

class ImageService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.uploadDir = path.join(__dirname, '../images/uploads');
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    this.allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    this.initializeUploadDir();
  }

  initializeUploadDir() {
    if (!this.isProduction && !fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getMulterConfig() {
    const storage = this.isProduction 
      ? multer.memoryStorage() 
      : multer.diskStorage({
          destination: (req, file, cb) => {
            cb(null, this.uploadDir);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `product-${uniqueSuffix}${ext}`);
          }
        });

    return multer({
      storage: storage,
      limits: {
        fileSize: this.maxFileSize,
        files: 10 // Maximum 10 files per request
      },
      fileFilter: (req, file, cb) => {
        this.validateFile(file, cb);
      }
    });
  }

  validateFile(file, cb) {
    // Check MIME type
    if (!this.allowedTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`));
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      return cb(new Error(`Invalid file extension. Allowed extensions: ${this.allowedExtensions.join(', ')}`));
    }

    // Check file size (additional check)
    if (file.size && file.size > this.maxFileSize) {
      return cb(new Error(`File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`));
    }

    cb(null, true);
  }

  async processImage(file, options = {}) {
    const startTime = Date.now();
    
    try {
      let imageBuffer = file.buffer || fs.readFileSync(file.path);
      const originalSize = imageBuffer.length;
      
      // Security validation
      const securityCheck = await imageSecurity.validateImageContent(imageBuffer);
      if (!securityCheck.valid) {
        imageMonitoring.logSecurity('blocked', { reason: securityCheck.error });
        throw new Error(`Security validation failed: ${securityCheck.error}`);
      }

      // Scan for malware
      const malwareScan = imageSecurity.scanForMalware(imageBuffer);
      if (!malwareScan.clean) {
        await imageSecurity.quarantineFile(imageBuffer, file.originalname, malwareScan.threat);
        imageMonitoring.logSecurity('quarantined', { reason: malwareScan.threat });
        throw new Error(`Malware detected: ${malwareScan.threat}`);
      }

      // Sanitize image metadata
      const sanitized = await imageSecurity.sanitizeImage(imageBuffer);
      if (!sanitized.success) {
        throw new Error(`Image sanitization failed: ${sanitized.error}`);
      }

      imageBuffer = sanitized.buffer;

      // Extract comprehensive metadata
      const metadata = await imageMetadata.extractMetadata(imageBuffer);
      
      // Optimize image for web delivery
      const optimized = await imageCompression.optimizeForWeb(imageBuffer, {
        maxWidth: options.width || 800,
        maxHeight: options.height || 600,
        quality: options.quality || 85
      });

      const processingTime = Date.now() - startTime;
      
      // Log processing metrics
      imageMonitoring.logProcessing(true, originalSize, optimized.buffer.length, processingTime);
      imageMonitoring.logUpload(true, originalSize, processingTime);

      return {
        buffer: optimized.buffer,
        metadata: {
          ...metadata,
          originalSize,
          optimizedSize: optimized.buffer.length,
          compressionRatio: optimized.savings,
          processingTime
        }
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      imageMonitoring.logProcessing(false, 0, 0, processingTime, error);
      imageMonitoring.logUpload(false, 0, processingTime, error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async saveImage(processedImage, filename) {
    if (this.isProduction) {
      // In production, return a placeholder URL or integrate with cloud storage
      return {
        url: `https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop&crop=center`,
        filename: filename,
        size: processedImage.metadata.size
      };
    } else {
      // Save to local filesystem
      const filepath = path.join(this.uploadDir, filename);
      fs.writeFileSync(filepath, processedImage.buffer);
      
      return {
        url: `/images/uploads/${filename}`,
        filename: filename,
        size: processedImage.metadata.size
      };
    }
  }

  async validateExternalUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Only allow HTTPS URLs
      if (urlObj.protocol !== 'https:') {
        throw new Error('Only HTTPS URLs are allowed');
      }

      // Check if URL is accessible with timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`URL not accessible: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
          throw new Error('URL does not point to an image');
        }

        return true;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout - URL validation took too long');
        }
        throw fetchError;
      }
    } catch (error) {
      throw new Error(`Invalid image URL: ${error.message}`);
    }
  }

  generateImageMetadata(image) {
    return {
      id: crypto.randomUUID(),
      uploadedAt: new Date().toISOString(),
      size: image.size || 0,
      type: image.mimetype || 'image/jpeg',
      isExternal: !!image.url,
      status: 'active'
    };
  }

  async cleanupOrphanedImages() {
    if (this.isProduction) return; // Skip cleanup in production
    
    try {
      const files = fs.readdirSync(this.uploadDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      for (const file of files) {
        const filepath = path.join(this.uploadDir, file);
        const stats = fs.statSync(filepath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filepath);
          console.log(`Cleaned up orphaned image: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up images:', error);
    }
  }
}

module.exports = new ImageService();
