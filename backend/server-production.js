// Load environment variables FIRST before anything else
const dotenv = require('dotenv');
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: './env.production' });
} else {
  dotenv.config();
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { upload, buildImageResponse } = require('./services/fileStorage');
const fs = require('fs');
const { syncDatabase, User, Product, Order, getDatabasePath, getDatabaseType, sequelize } = require('./config/database');
const { backupData, restoreData, startAutoBackup } = require('./database/backup-data');
const { recordDatabaseState, getDiagnosticReport, findMultipleDatabaseFiles, verifyDataIntegrity } = require('./utils/diagnostics');

// Function to create sample products
const createSampleProducts = async (Product) => {
  try {
        const sampleProducts = [
          {
            name: 'Canon EOS R5 Camera',
            description: 'Professional mirrorless camera with 45MP full-frame sensor',
            price: 3899.99,
            category: 'cameras',
            brand: 'Canon',
            model: 'EOS R5',
            stock: 10,
            images: [{
              url: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=500&h=500&fit=crop&crop=center',
              isPrimary: true
            }],
            specifications: {
              'Sensor': '45MP Full-Frame',
              'Video': '8K RAW',
              'ISO': '100-51200',
              'Weight': '650g'
            },
            isFeatured: true,
            isActive: true
          },
          {
            name: 'MacBook Pro 16-inch',
            description: 'Powerful laptop with M2 Pro chip for professional work',
            price: 2499.99,
            category: 'laptops',
            brand: 'Apple',
            model: 'MacBook Pro 16-inch',
            stock: 5,
            images: [{
              url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop&crop=center',
              isPrimary: true
            }],
            specifications: {
              'Processor': 'M2 Pro',
              'RAM': '16GB',
              'Storage': '512GB SSD',
              'Display': '16.2-inch Liquid Retina XDR'
            },
            isFeatured: true,
            isActive: true
          },
          {
            name: 'iPhone 15 Pro',
            description: 'Latest iPhone with titanium design and A17 Pro chip',
            price: 999.99,
            category: 'phones',
            brand: 'Apple',
            model: 'iPhone 15 Pro',
            stock: 15,
            images: [{
              url: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&h=500&fit=crop&crop=center',
              isPrimary: true
            }],
            specifications: {
              'Display': '6.1-inch Super Retina XDR',
              'Chip': 'A17 Pro',
              'Camera': '48MP Main Camera',
              'Storage': '128GB'
            },
            isFeatured: true,
            isActive: true
          }
        ];

    await Product.bulkCreate(sampleProducts);
    console.log('✅ Sample products created successfully');
  } catch (error) {
    console.error('❌ Error creating sample products:', error);
  }
};


const app = express();
const PORT = process.env.PORT || 10000;

// PERFORMANCE: Enable compression for all responses (gzip)
app.use(compression({
  filter: (req, res) => {
    // Compress all responses except if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024 // Only compress responses larger than 1KB
}));

// Use the unified image service
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
      'https://goldensourcetech.co.ke',
      'https://www.goldensourcetech.co.ke',
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

// Note: Static files are served later after image routes to ensure proper priority

// Root route fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Nairobi Cameras API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        version: '1.0.0',
        uptime: process.uptime(),
        database: getDatabaseType()
    });
});

// Diagnostic endpoints (Admin only - add auth if needed)
app.get('/api/diagnostics', async (req, res) => {
    try {
        const report = getDiagnosticReport();
        const renderPersistentPaths = [
            '/opt/render/project/src/backend/database',
            '/opt/render/project/src/database',
            '/opt/render/project/database',
            path.join(process.cwd(), 'database'),
            path.join(__dirname, '../database')
        ];
        const multipleFiles = findMultipleDatabaseFiles(renderPersistentPaths);
        const integrity = await verifyDataIntegrity(Product, User, Order);
        const { getCloudBackupRecommendation } = require('./utils/cloud-backup');
        const cloudRecommendation = getCloudBackupRecommendation();
        
        const productCount = await Product.count();
        const userCount = await User.count();
        const orderCount = await Order.count();
        
        // Check if we're on Render free tier with empty database
        const isRenderFreeTierIssue = process.env.NODE_ENV === 'production' && productCount === 0;
        
        res.json({
            success: true,
            diagnostics: {
                report,
                multipleDatabaseFiles: multipleFiles,
                integrity,
                databasePath: getDatabasePath(),
                currentCounts: {
                    products: productCount,
                    users: userCount,
                    orders: orderCount
                },
                renderFreeTierWarning: isRenderFreeTierIssue ? {
                    issue: 'Database is empty - likely due to Render free tier ephemeral storage',
                    explanation: 'Render free tier deletes all files on restart/redeploy',
                    recommendation: cloudRecommendation
                } : null,
                environment: process.env.NODE_ENV || 'development'
            }
        });
    } catch (error) {
        console.error('Diagnostics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate diagnostics',
            error: error.message
        });
    }
});

// Database state endpoint
app.get('/api/diagnostics/state', async (req, res) => {
    try {
        const state = await recordDatabaseState(Product, User, Order, getDatabasePath());
        res.json({
            success: true,
            state
        });
    } catch (error) {
        console.error('State recording error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record state',
            error: error.message
        });
    }
});

// Manual backup endpoint
app.post('/api/backup', async (req, res) => {
    try {
        await backupData(Product, User, Order);
        res.json({
            success: true,
            message: 'Backup created successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Manual backup error:', error);
        res.status(500).json({
            success: false,
            message: 'Backup failed',
            error: error.message
        });
    }
});

// Fallback products endpoint (no database dependency)
app.get('/api/products-fallback', (req, res) => {
    console.log('🔄 Using fallback products endpoint');
    res.json({
        success: true,
        data: {
            products: [],
            pagination: {
                currentPage: 1,
                totalPages: 0,
                totalProducts: 0
            }
        }
    });
});

// Products API
app.get('/api/products', async (req, res) => {
    try {
        console.log('🔍 Products API called');
        console.log('🔍 Product model available:', !!Product);
        
        // Check if Product model is available
        if (!Product) {
            console.error('❌ Product model not available');
            return res.status(500).json({ 
                success: false, 
                message: 'Database model not available',
                error: 'Product model not found'
            });
        }

        // Test database connection first (only if sequelize is available)
        try {
            if (sequelize && sequelize.authenticate) {
                await sequelize.authenticate();
                console.log('✅ Database connection verified');
            } else {
                // For Supabase, connection is implicit via REST API
                console.log('✅ Using Supabase (connection verified via REST API)');
            }
        } catch (dbError) {
            console.error('❌ Database connection failed:', dbError);
            // Don't fail the request - Supabase might still work
            console.warn('⚠️ Continuing despite connection check failure...');
        }
        
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

        console.log('🔍 Products API - Where clause:', where);
        
        let products;
        try {
            products = await Product.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                order: [['createdAt', 'DESC']]
            });
            console.log(`📦 Found ${products.count} products, returning ${products.rows ? products.rows.length : 0} products`);
            
            // Ensure products.rows is an array
            if (!products.rows || !Array.isArray(products.rows)) {
                console.warn('⚠️ products.rows is not an array, converting...');
                products.rows = Array.isArray(products) ? products : [];
            }
        } catch (queryError) {
            console.error('❌ Product query error:', queryError);
            console.error('❌ Query error message:', queryError.message);
            console.error('❌ Query error code:', queryError.code);
            console.error('❌ Query error details:', queryError.details);
            console.error('❌ Query error hint:', queryError.hint);
            // Return empty result instead of throwing
            return res.json({
                success: true,
                data: {
                    products: [],
                    pagination: {
                        currentPage: parseInt(page) || 1,
                        totalPages: 0,
                        totalProducts: 0
                    }
                }
            });
        }

        res.json({
            success: true,
            data: {
                products: products.rows || [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil((products.count || 0) / parseInt(limit)),
                    totalProducts: products.count || 0
                }
            }
        });
    } catch (error) {
        console.error('❌ Get products error:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        // Always return 200 with empty products array instead of 500 error
        res.status(200).json({
            success: true,
            data: {
                products: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    totalProducts: 0
                }
            }
        });
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
        console.log('📦 Creating new product...');
        console.log('📦 Product data:', JSON.stringify(req.body, null, 2));
        
        // Validate required fields
        if (!req.body.name || !req.body.category || !req.body.price) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required fields: name, category, and price are required' 
            });
        }
        
        // Ensure category is lowercase and valid
        const validCategories = ['laptops', 'phones', 'cameras', 'audio', 'accessories', 'smart-home'];
        const category = req.body.category.toLowerCase().trim();
        if (!validCategories.includes(category)) {
            return res.status(400).json({ 
                success: false,
                message: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
            });
        }
        req.body.category = category;
        
        // Ensure isActive is set (default to true)
        if (req.body.isActive === undefined) {
            req.body.isActive = true;
        }
        
        // Ensure at least one image
        if (!req.body.images || !Array.isArray(req.body.images) || req.body.images.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'At least one image is required' 
            });
        }
        
        // Set first image as primary
        if (req.body.images && req.body.images.length > 0) {
            req.body.images[0].isPrimary = true;
        }
        
        // Record state BEFORE creation
        const stateBefore = await recordDatabaseState(Product, User, Order, getDatabasePath());
        const productCountBefore = stateBefore ? stateBefore.productCount : await Product.count();
        
        const product = await Product.create(req.body);
        
        // Record state AFTER creation
        const stateAfter = await recordDatabaseState(Product, User, Order, getDatabasePath());
        const productCountAfter = stateAfter ? stateAfter.productCount : await Product.count();
        
        // Check for data loss
        if (stateBefore && stateAfter) {
            const issues = require('./utils/diagnostics').detectDataLoss(stateAfter, stateBefore);
            if (issues && issues.length > 0) {
                console.error('🚨 DATA LOSS DETECTED AFTER PRODUCT CREATION!');
                issues.forEach(issue => {
                    console.error(`🚨 ${issue.severity}: ${issue.message}`);
                });
            }
        }
        
        // Verify product was actually saved
        if (productCountAfter <= productCountBefore) {
            console.error('🚨 CRITICAL: Product count did not increase after creation!');
            console.error(`🚨 Before: ${productCountBefore}, After: ${productCountAfter}`);
        }
        
        // Immediately backup after creating product
        try {
            await backupData(Product, User, Order, getDatabasePath());
            console.log('✅ Backup created after product creation');
        } catch (backupError) {
            console.error('⚠️ Backup failed after product creation:', backupError);
            // Don't fail the request if backup fails
        }
        
        console.log(`✅ Product created successfully with ID: ${product.id}`);
        console.log(`📦 Total products in database: ${productCountAfter} (was ${productCountBefore})`);
        
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: { product }
        });
    } catch (error) {
        console.error('❌ Create product error:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
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
// Register endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, email, and password are required' 
            });
        }

        // Normalize email (trim and lowercase)
        const normalizedEmail = email.trim().toLowerCase();
        
        // Check if user already exists
        const existingUser = await User.findOne({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email already exists' 
            });
        }

        // Record state BEFORE user creation
        const stateBefore = await recordDatabaseState(Product, User, Order, getDatabasePath());
        const userCountBefore = stateBefore ? stateBefore.userCount : await User.count();
        
        // Create new user (simple password storage - in production, use bcrypt)
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password, // In production, hash this with bcrypt
            role: 'admin' // Default to admin for admin panel
        });
        
        // Record state AFTER user creation
        const stateAfter = await recordDatabaseState(Product, User, Order, getDatabasePath());
        const userCountAfter = stateAfter ? stateAfter.userCount : await User.count();
        
        // Check for data loss
        if (stateBefore && stateAfter) {
            const issues = require('./utils/diagnostics').detectDataLoss(stateAfter, stateBefore);
            if (issues && issues.length > 0) {
                console.error('🚨 DATA LOSS DETECTED AFTER USER CREATION!');
                issues.forEach(issue => {
                    console.error(`🚨 ${issue.severity}: ${issue.message}`);
                });
            }
        }
        
        // Verify user was actually saved
        if (userCountAfter <= userCountBefore) {
            console.error('🚨 CRITICAL: User count did not increase after creation!');
            console.error(`🚨 Before: ${userCountBefore}, After: ${userCountAfter}`);
        }
        
        // Immediately backup after creating user
        try {
            await backupData(Product, User, Order, getDatabasePath());
            console.log('✅ Backup created after user creation');
        } catch (backupError) {
            console.error('⚠️ Backup failed after user creation:', backupError);
        }

        // Generate token
        const token = 'admin-token-' + Date.now();
        
        console.log(`✅ User created successfully with ID: ${user.id}`);
        console.log(`👥 Total users in database: ${userCountAfter} (was ${userCountBefore})`);
        
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }
        
        // Trim and lowercase email for consistency
        const normalizedEmail = email.trim().toLowerCase();
        
        const user = await User.findOne({ where: { email: normalizedEmail } });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Simple password check (in production, use bcrypt)
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
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
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// Admin routes
app.use('/api/admin', require('./routes/admin'));

// Simple image upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (req.file) {
      const imageResponse = buildImageResponse(req.file);
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
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: `Upload failed: ${error.message}`
    });
  }
});

// Handle favicon requests (prevent 404)
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '../images/favicon.png'));
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
        // PERFORMANCE: Cache images for 1 year with ETag
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('ETag', `"${filePath}-${fs.statSync(filePath).mtime.getTime()}"`);
    },
    maxAge: 31536000 // 1 year in milliseconds
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
        // PERFORMANCE: Cache images for 1 year with ETag
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        if (fs.existsSync(filePath)) {
            res.setHeader('ETag', `"${filePath}-${fs.statSync(filePath).mtime.getTime()}"`);
        }
    },
    maxAge: 31536000 // 1 year in milliseconds
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
    console.error('❌ Unhandled error:', err);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ Request path:', req.path);
    
    // For /api/products, always return 200 with empty products to prevent frontend breakage
    if (req.path === '/api/products' || req.path.startsWith('/api/products?')) {
        return res.status(200).json({
            success: true,
            data: {
                products: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    totalProducts: 0
                }
            }
        });
    }
    
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message
    });
});

// Global error handlers for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('❌ Reason:', reason);
    // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('❌ Error stack:', error.stack);
    // Don't exit the process, just log the error
});

// Initialize database and start server
const startServer = async () => {
    try {
        console.log('🚀 Starting server initialization...');
        console.log('🌍 Environment:', process.env.NODE_ENV);
        console.log('🔌 Port:', process.env.PORT || 10000);
        
        const dbConnected = await syncDatabase();
        if (!dbConnected) {
            console.error('❌ Failed to connect to database');
            console.log('⚠️ Continuing without database - some features may not work');
            // Don't exit - let the server start with limited functionality
        } else {
            console.log('✅ Database connection established');
        }

        // Only perform database operations if database is connected
        if (dbConnected) {
            try {
                // Record initial database state
                const initialState = await recordDatabaseState(Product, User, Order, getDatabasePath());
                console.log('📊 Initial database state recorded:', {
                    products: initialState?.productCount || 0,
                    users: initialState?.userCount || 0,
                    orders: initialState?.orderCount || 0,
                    dbPath: initialState?.dbPath,
                    dbFileSize: initialState?.dbFileSize
                });
                
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

                // Try to restore data from backup
                const stateBeforeRestore = await recordDatabaseState(Product, User, Order, getDatabasePath());
                await restoreData(Product, User, Order, getDatabasePath());
                const stateAfterRestore = await recordDatabaseState(Product, User, Order, getDatabasePath());
                
                // Check for issues after restore
                if (stateBeforeRestore && stateAfterRestore) {
                    const issues = require('./utils/diagnostics').detectDataLoss(stateAfterRestore, stateBeforeRestore);
                    if (issues && issues.length > 0) {
                        console.error('🚨 ISSUES DETECTED AFTER RESTORE:');
                        issues.forEach(issue => {
                            console.error(`🚨 ${issue.severity}: ${issue.message}`);
                        });
                    }
                }
                
                // Check if we have any products after restore
                const productCount = await Product.count();
                const userCount = await User.count();
                console.log(`📦 Database initialized with ${productCount} products, ${userCount} users`);
                
                // CRITICAL WARNING FOR RENDER FREE TIER
                if (productCount === 0 && process.env.NODE_ENV === 'production') {
                    console.error('');
                    console.error('🚨 ============================================');
                    console.error('🚨 RENDER FREE TIER DATA LOSS WARNING');
                    console.error('🚨 ============================================');
                    console.error('🚨 Your database is EMPTY. This is because:');
                    console.error('🚨 1. Render free tier uses EPHEMERAL storage');
                    console.error('🚨 2. Database file is DELETED on every restart/redeploy');
                    console.error('🚨 3. All data is LOST when Render restarts your service');
                    console.error('');
                    console.error('✅ SOLUTIONS:');
                    console.error('   1. Use Supabase PostgreSQL (FREE forever) - RECOMMENDED');
                    console.error('   2. Use Render PostgreSQL (free 30 days, then upgrade)');
                    console.error('   3. Upgrade to Render paid plan for persistent disk');
                    console.error('');
                    console.error('📋 Current status:');
                    console.error(`   - Products: ${productCount}`);
                    console.error(`   - Users: ${userCount}`);
                    console.error(`   - Database path: ${getDatabasePath()}`);
                    console.error('🚨 ============================================');
                    console.error('');
                }
                
                // Check for multiple database files
                const renderPersistentPaths = [
                    '/opt/render/project/src/backend/database',
                    '/opt/render/project/src/database',
                    '/opt/render/project/database',
                    path.join(process.cwd(), 'database'),
                    path.join(__dirname, '../database')
                ];
                const multipleFiles = findMultipleDatabaseFiles(renderPersistentPaths);
                if (multipleFiles.length > 1) {
                    console.warn('⚠️ WARNING: Multiple database files found!');
                    multipleFiles.forEach(file => {
                        console.warn(`⚠️   - ${file.path} (${file.size} bytes, modified: ${file.modified})`);
                    });
                    console.warn('⚠️ This could cause data loss if the wrong file is used!');
                }
                
                // If no products exist, optionally create sample products
                if (productCount === 0) {
                    const shouldSeedSamples = process.env.SEED_SAMPLE_PRODUCTS === 'true';
                    if (shouldSeedSamples) {
                        console.log('📦 No products found, creating sample products (SEED_SAMPLE_PRODUCTS=true)...');
                        await createSampleProducts(Product);
                        const newProductCount = await Product.count();
                        console.log(`✅ Created ${newProductCount} sample products`);
                    } else {
                        console.log('🧹 Database is empty and SEED_SAMPLE_PRODUCTS is not enabled. Skipping demo data.');
                    }
                }
                
                // Create backup of current data
                await backupData(Product, User, Order, getDatabasePath());
                
                // Record final state after initialization
                const finalState = await recordDatabaseState(Product, User, Order, getDatabasePath());
                console.log('📊 Final database state after initialization:', {
                    products: finalState?.productCount || 0,
                    users: finalState?.userCount || 0,
                    orders: finalState?.orderCount || 0
                });
                
                // Start automatic backup system
                startAutoBackup(Product, User, Order, getDatabasePath());
                
                // Schedule periodic state recording (every 5 minutes)
                setInterval(async () => {
                    try {
                        await recordDatabaseState(Product, User, Order, getDatabasePath());
                    } catch (error) {
                        console.error('❌ Error recording periodic state:', error);
                    }
                }, 5 * 60 * 1000); // Every 5 minutes
            } catch (dbError) {
                console.error('❌ Database operation error:', dbError);
                console.log('⚠️ Continuing with limited functionality');
            }
        } else {
            console.log('⚠️ Skipping database operations - database not connected');
        }

        console.log('🚀 Starting HTTP server...');
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 Server running on port', PORT);
            console.log('📱 Frontend: https://nairobi-cameras-website-store.onrender.com');
            console.log('🔧 API: https://nairobi-cameras-website-store.onrender.com/api');
            console.log('💚 Health Check: https://nairobi-cameras-website-store.onrender.com/api/health');
            const dbType = getDatabaseType();
            console.log(`🗄️ Database: ${dbType}`);
            if (dbType.includes('Supabase')) {
                console.log('🎉 Data persistence: PERMANENT (cloud storage)');
            } else {
                console.log('⚠️ Data persistence: May be lost on Render free tier restarts');
            }
            console.log('✅ Server startup completed successfully');
        });

        // Handle server errors
        server.on('error', (error) => {
            console.error('❌ Server error:', error);
            if (error.code === 'EADDRINUSE') {
                console.error('❌ Port', PORT, 'is already in use');
            }
            process.exit(1);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🛑 SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('✅ Server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Server startup error:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
        process.exit(1);
    }
};

startServer();

module.exports = app;
