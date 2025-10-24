const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs');
const { syncDatabase, User, Product, Order } = require('./config/database');

// Load environment variables
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: './env.production' });
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 10000;

// Multer configuration for Render deployment
// Use memory storage since Render doesn't support file system writes
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage instead of disk storage
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

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

// Rate limiting for production - More lenient for e-commerce
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // limit each IP to 1000 requests per windowMs (more lenient)
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain paths
  skip: (req) => {
    // Skip rate limiting for health checks and static files
    return req.path === '/api/health' || req.path.startsWith('/images/') || req.path.startsWith('/css/') || req.path.startsWith('/js/');
  }
});
app.use(limiter);

// More lenient rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes for API calls
  message: {
    error: 'API rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply API rate limiting only to API routes
app.use('/api', apiLimiter);

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Get the current Render URL dynamically
    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    const allowedOrigins = [
      renderUrl,
      'https://nairobi-cameras.onrender.com',
      'https://nairobi-cameras-website-store.onrender.com',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000'
    ].filter(Boolean); // Remove undefined values
    
    // Add custom allowed origins from environment
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }
    
    console.log('🌐 CORS check for origin:', origin);
    console.log('🌐 Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS allowed for:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked for:', origin);
      // For production, be more strict but allow Render domains
      if (process.env.NODE_ENV === 'production' && !origin.includes('onrender.com')) {
        callback(new Error('Not allowed by CORS'));
      } else {
        console.log('✅ CORS allowed (fallback) for:', origin);
        callback(null, true);
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// Apply CORS with fallback for development
app.use(cors(corsOptions));

// Additional CORS fallback for development/testing
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Nairobi Cameras API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
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

// Image upload endpoint - Modified for Render deployment
app.post('/api/upload', (req, res) => {
  // For Render deployment, we'll accept image URLs instead of file uploads
  const { imageUrl } = req.body;
  
  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      message: 'Image URL is required. Please provide an external image URL.',
      data: {
        filename: 'placeholder.jpg',
        url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop&crop=center',
        size: 0
      }
    });
  }
  
  // Validate URL format
  try {
    new URL(imageUrl);
    res.json({
      success: true,
      message: 'Image URL accepted successfully',
      data: {
        filename: 'external-image.jpg',
        url: imageUrl,
        size: 0
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid image URL format. Please provide a valid URL.',
      data: {
        filename: 'placeholder.jpg',
        url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop&crop=center',
        size: 0
      }
    });
  }
});

// Serve uploaded images
app.use('/images/uploads', express.static(path.join(__dirname, '../images/uploads')));

// Serve static files (CSS, JS, images) from root directory
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Serve frontend files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
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

        app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 Server running on port', PORT);
            console.log('📱 Frontend: https://your-app-name.onrender.com');
            console.log('🔧 API: https://your-app-name.onrender.com/api');
            console.log('💚 Health Check: https://your-app-name.onrender.com/api/health');
            console.log('🗄️ Database: SQLite (file-based)');
        });
    } catch (error) {
        console.error('❌ Server startup error:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
