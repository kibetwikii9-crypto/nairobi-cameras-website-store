// Load environment variables FIRST before anything else
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const fs = require('fs');
const { upload, buildImageResponse } = require('./services/fileStorage');
const { syncDatabase, User, Product, Order, getDatabaseType } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting - Disabled for local development
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
} else {
  console.log('🔓 Rate limiting disabled for local development');
}

// CORS configuration - Allow all origins for development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // For development, allow all localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Golden Source Technologies API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        uptime: process.uptime(),
        database: getDatabaseType()
    });
});

// Products API
app.get('/api/products', async (req, res) => {
    try {
        const { page = 1, limit = 12, category, search, minPrice, maxPrice } = req.query;
        
        console.log('🔍 Products API - Query params:', { page, limit, category, search, minPrice, maxPrice });
        
        const where = { isActive: true };
        if (category) {
            where.category = category;
            console.log('✅ Category filter applied:', category);
        } else {
            console.log('⚠️ No category filter - returning all active products');
        }
        if (search) {
            where.name = { [require('sequelize').Op.like]: `%${search}%` };
        }
        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price[require('sequelize').Op.gte] = parseFloat(minPrice);
            if (maxPrice) where.price[require('sequelize').Op.lte] = parseFloat(maxPrice);
        }

        const products = await Product.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: {
                products: products.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(products.count / parseInt(limit)),
                    totalProducts: products.count
                }
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, data: { product } });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Search products
app.get('/api/search', async (req, res) => {
    try {
        const { q, category, minPrice, maxPrice, brand, limit = 50 } = req.query;
        
        if (!q || q.trim() === '') {
            return res.json({
                success: true,
                data: { products: [], total: 0, query: q }
            });
        }
        
        const searchTerm = q.trim();
        const { Op } = require('sequelize');
        
        let whereClause = {
            isActive: true,
            [Op.or]: [
                { name: { [Op.like]: `%${searchTerm}%` } },
                { description: { [Op.like]: `%${searchTerm}%` } },
                { brand: { [Op.like]: `%${searchTerm}%` } },
                { model: { [Op.like]: `%${searchTerm}%` } },
                { category: { [Op.like]: `%${searchTerm}%` } }
            ]
        };
        
        // Add additional filters
        if (category) whereClause.category = category;
        if (brand) whereClause.brand = brand;
        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
            if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
        }
        
        const products = await Product.findAll({
            where: whereClause,
            limit: parseInt(limit),
            order: [
                ['isFeatured', 'DESC'],
                ['name', 'ASC']
            ]
        });
        
        res.json({
            success: true,
            data: { 
                products,
                total: products.length,
                query: searchTerm
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create product (Admin only)
app.post('/api/products', async (req, res) => {
    try {
        const productData = req.body;
        const product = await Product.create(productData);
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update product (Admin only)
app.put('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.update(req.body, {
            where: { id: req.params.id }
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete product (Admin only)
app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.destroy({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin routes
app.use('/api/admin', require('./routes/admin'));

// Payment routes
app.use('/api/payments', require('./routes/payments'));

// Simple upload endpoint for local development
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (req.file) {
      const imageResponse = await buildImageResponse(req.file);
      console.log('📸 Image uploaded:', imageResponse);
      
      if (!imageResponse || !imageResponse.url) {
        console.error('❌ buildImageResponse did not return a valid URL');
        return res.status(500).json({
          success: false,
          message: 'Upload succeeded but failed to generate URL'
        });
      }
      
      return res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: imageResponse
      });
    }

    const { imageUrl } = req.body;
    if (imageUrl && typeof imageUrl === 'string') {
      const trimmed = imageUrl.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return res.status(400).json({
          success: false,
          message: 'Image URL must start with http:// or https://'
        });
      }

      return res.json({
        success: true,
        message: 'Image URL saved successfully',
        data: {
          filename: 'external-image',
          url: trimmed,
          size: 0,
          mimetype: 'external/url',
          uploadedAt: new Date().toISOString()
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: 'No image file or URL provided'
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Upload failed', 
      error: error.message 
    });
  }
});

// Serve frontend files - Root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Serve frontend files - Admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// Clean URLs (without .html extension)
const htmlPages = [
    'cart', 'search', 'wishlist', 'product',
    'phones', 'laptops', 'cameras', 'audio', 
    'accessories', 'smart-home', 'deals'
];

htmlPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, `../${page}.html`));
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        console.log('🚀 Starting server initialization...');
        console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
        console.log('🔌 Port:', PORT);
        
        // Sync database
        const dbConnected = await syncDatabase();
        if (!dbConnected) {
            console.error('❌ Failed to connect to database. Server will not start.');
            process.exit(1);
        }
        
        console.log('✅ Database connection established');
        
        // Start server
        app.listen(PORT, () => {
            console.log('🚀 Server running on port', PORT);
            console.log('📱 Frontend: http://localhost:' + PORT);
            console.log('🔧 API: http://localhost:' + PORT + '/api');
            console.log('💚 Health Check: http://localhost:' + PORT + '/api/health');
            const dbType = getDatabaseType();
            console.log(`🗄️ Database: ${dbType}`);
            console.log('🎉 Data persistence: PERMANENT (cloud storage)');
        });
    } catch (error) {
        console.error('❌ Server startup error:', error);
        process.exit(1);
    }
};

startServer();

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message
    });
});

