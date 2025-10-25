const express = require('express');
const multer = require('multer');
const imageService = require('../services/imageService');
const imageSecurity = require('../middleware/imageSecurity');
const imageCompression = require('../services/imageCompression');
const imageMetadata = require('../services/imageMetadata');
const imageCache = require('../services/imageCache');
const imageMonitoring = require('../services/imageMonitoring');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get multer configuration
const upload = imageService.getMulterConfig();

// Upload single image
router.post('/upload', 
  imageSecurity.createUploadRateLimit(),
  imageSecurity.setImageCSP,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      // Process image
      const processedImage = await imageService.processImage(req.file);
      const result = await imageService.saveImage(processedImage, req.file.filename);
      
      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          ...result,
          metadata: processedImage.metadata
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Upload multiple images
router.post('/upload-multiple',
  imageSecurity.createUploadRateLimit(),
  upload.array('images', 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No image files provided'
        });
      }

      const results = [];
      for (const file of req.files) {
        try {
          const processedImage = await imageService.processImage(file);
          const result = await imageService.saveImage(processedImage, file.filename);
          results.push({
            success: true,
            filename: file.originalname,
            data: result
          });
        } catch (error) {
          results.push({
            success: false,
            filename: file.originalname,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: 'Batch upload completed',
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Generate responsive images
router.post('/responsive/:imageId',
  adminAuth,
  async (req, res) => {
    try {
      const { imageId } = req.params;
      const { sizes = ['thumbnail', 'small', 'medium', 'large'] } = req.body;
      
      // Get original image (this would typically come from database)
      const imageBuffer = Buffer.from(''); // Placeholder
      
      const responsiveImages = await imageCompression.generateResponsiveImages(imageBuffer, sizes);
      
      res.json({
        success: true,
        data: responsiveImages
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Generate modern format images
router.post('/modern-formats/:imageId',
  adminAuth,
  async (req, res) => {
    try {
      const { imageId } = req.params;
      const { formats = ['webp', 'avif'] } = req.body;
      
      // Get original image
      const imageBuffer = Buffer.from(''); // Placeholder
      
      const modernFormats = await imageCompression.generateModernFormats(imageBuffer, formats);
      
      res.json({
        success: true,
        data: modernFormats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Analyze and optimize image
router.post('/analyze/:imageId',
  adminAuth,
  async (req, res) => {
    try {
      const { imageId } = req.params;
      
      // Get original image
      const imageBuffer = Buffer.from(''); // Placeholder
      
      const analysis = await imageCompression.analyzeAndOptimize(imageBuffer);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get image metadata
router.get('/metadata/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    // Get image from database or file system
    const imageBuffer = Buffer.from(''); // Placeholder
    
    const metadata = await imageMetadata.extractMetadata(imageBuffer);
    
    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Find similar images
router.post('/similar',
  adminAuth,
  async (req, res) => {
    try {
      const { imageId, threshold = 0.8 } = req.body;
      
      // Get image and generate perceptual hash
      const imageBuffer = Buffer.from(''); // Placeholder
      const metadata = await imageMetadata.extractMetadata(imageBuffer);
      
      const similarImages = await imageMetadata.findSimilarImages(metadata.perceptualHash, threshold);
      
      res.json({
        success: true,
        data: similarImages
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get cache statistics
router.get('/cache/stats',
  adminAuth,
  async (req, res) => {
    try {
      const stats = imageCache.getStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Clear cache
router.post('/cache/clear',
  adminAuth,
  async (req, res) => {
    try {
      imageCache.clearCache();
      
      res.json({
        success: true,
        message: 'Cache cleared successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get monitoring metrics
router.get('/monitoring/metrics',
  adminAuth,
  async (req, res) => {
    try {
      const metrics = imageMonitoring.getMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get health report
router.get('/monitoring/health',
  adminAuth,
  async (req, res) => {
    try {
      const healthReport = imageMonitoring.generateHealthReport();
      
      res.json({
        success: true,
        data: healthReport
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get error summary
router.get('/monitoring/errors',
  adminAuth,
  async (req, res) => {
    try {
      const errorSummary = imageMonitoring.getErrorSummary();
      
      res.json({
        success: true,
        data: errorSummary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Reset monitoring metrics
router.post('/monitoring/reset',
  adminAuth,
  async (req, res) => {
    try {
      imageMonitoring.resetMetrics();
      
      res.json({
        success: true,
        message: 'Monitoring metrics reset successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Batch process images
router.post('/batch-process',
  adminAuth,
  upload.array('images', 20),
  async (req, res) => {
    try {
      const { operation = 'compress', options = {} } = req.body;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No image files provided'
        });
      }

      const results = await imageCompression.batchProcess(req.files, operation, options);
      
      res.json({
        success: true,
        message: 'Batch processing completed',
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Create image collage
router.post('/collage',
  adminAuth,
  upload.array('images', 10),
  async (req, res) => {
    try {
      const { layout = 'grid', options = {} } = req.body;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No image files provided'
        });
      }

      const imageBuffers = req.files.map(file => file.buffer);
      const collage = await imageCompression.createCollage(imageBuffers, { layout, ...options });
      
      res.json({
        success: true,
        message: 'Collage created successfully',
        data: {
          buffer: collage.toString('base64'),
          size: collage.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

module.exports = router;
