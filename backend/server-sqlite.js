const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const { upload, buildImageResponse } = require('./services/fileStorage');
const { syncDatabase, User, Product, Order } = require('./config/database');

// Load environment variables
dotenv.config();

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
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      [process.env.RENDER_EXTERNAL_URL || 'https://nairobi-cameras.onrender.com', 'http://localhost:3000', 'http://localhost:5000'];
    
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
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Golden Source Technologies API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        uptime: process.uptime(),
        database: 'SQLite'
    });
});

// Products API
app.get('/api/products', async (req, res) => {
    try {
        const { page = 1, limit = 12, category, search, minPrice, maxPrice } = req.query;
        
        const where = { isActive: true };
        if (category) where.category = category;
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
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ success: true, data: { product } });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ message: 'Server error' });
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
        const product = await Product.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: { product }
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update product (Admin only)
app.put('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        await product.update(req.body);
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: { product }
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete product (Admin only)
app.delete('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        await product.destroy();
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Orders API
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [{ model: User, as: 'user' }],
            order: [['createdAt', 'DESC']]
        });
        
        res.json({
            success: true,
            data: { orders }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create order
app.post('/api/orders', async (req, res) => {
    try {
        const order = await Order.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: { order }
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Simple password check (in production, use bcrypt)
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate JWT token (simplified for demo)
        const token = 'admin-token-' + Date.now();
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin routes
app.use('/api/admin', require('./routes/admin'));

// Simple upload endpoint for local development
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (req.file) {
      return res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: buildImageResponse(req.file)
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
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: `Upload failed: ${error.message}`
    });
  }
});

// Serve uploaded images with proper headers
app.use('/images/uploads', express.static(path.join(__dirname, '../images/uploads'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
        } else if (filePath.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
}));

// Serve static images from root images directory
app.use('/images', express.static(path.join(__dirname, '../images'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
        } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
}));

// Serve static files (CSS, JS) from root directory
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

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

// Also support .html URLs for backward compatibility
htmlPages.forEach(page => {
    app.get(`/${page}.html`, (req, res) => {
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        const dbConnected = await syncDatabase();
        if (!dbConnected) {
            console.error('❌ Failed to connect to database');
            process.exit(1);
        }

        // Create admin user if it doesn't exist
        const adminExists = await User.findOne({ where: { email: 'admin@goldensource.com' } });
        if (!adminExists) {
            await User.create({
                name: 'Admin User',
                email: 'admin@goldensource.com',
                password: process.env.ADMIN_PASSWORD || 'SecureAdmin2024!',
                role: 'admin',
                phone: process.env.ADMIN_PHONE || '+254 724 369 971'
            });
            console.log('✅ Admin user created');
        }

        // No automatic product seeding - products should be added via admin panel
        const productCount = await Product.count();
        console.log(`📦 Database initialized with ${productCount} existing products`);

        app.listen(PORT, () => {
            console.log('🚀 Server running on port', PORT);
            console.log('📱 Frontend: http://localhost:' + PORT);
            console.log('🔧 API: http://localhost:' + PORT + '/api');
            console.log('💚 Health Check: http://localhost:' + PORT + '/api/health');
            console.log('🗄️ Database: SQLite (file-based)');
        });
    } catch (error) {
        console.error('❌ Server startup error:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
