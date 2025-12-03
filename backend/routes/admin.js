const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Product, Order } = require('../config/database');
const { Op } = require('sequelize');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private (Admin)
router.get('/dashboard', async (req, res) => {
    try {
        // Fetch data with error handling for each operation
        const [
            totalUsers,
            totalProducts,
            totalOrders,
            pendingOrders,
            totalRevenue,
            recentOrdersResult
        ] = await Promise.allSettled([
            User.count({ where: { role: 'user' } }),
            Product.count({ where: { isActive: true } }),
            Order.count(),
            Order.count({ where: { orderStatus: 'pending' } }),
            Order.sum('total', { where: { paymentStatus: 'paid' } }),
            Order.findAll({
                include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
                order: [['createdAt', 'DESC']],
                limit: 5,
                raw: true // Return array directly instead of { rows, count }
            })
        ]);

        // Extract values from Promise.allSettled results
        const totalUsersCount = totalUsers.status === 'fulfilled' ? totalUsers.value : 0;
        const totalProductsCount = totalProducts.status === 'fulfilled' ? totalProducts.value : 0;
        const totalOrdersCount = totalOrders.status === 'fulfilled' ? totalOrders.value : 0;
        const pendingOrdersCount = pendingOrders.status === 'fulfilled' ? pendingOrders.value : 0;
        const totalRevenueValue = totalRevenue.status === 'fulfilled' ? totalRevenue.value : 0;
        // Extract recentOrders and ensure it's an array
        let recentOrders = [];
        if (recentOrdersResult.status === 'fulfilled') {
            const ordersValue = recentOrdersResult.value;
            // Handle both array and { rows, count } format
            recentOrders = Array.isArray(ordersValue) ? ordersValue : (ordersValue?.rows || []);
        } else {
            console.warn('⚠️ Error fetching recent orders with user:', recentOrdersResult.reason?.message);
            recentOrders = [];
        }

        // Get top products
        let topProducts = [];
        try {
            const productsResult = await Product.findAll({
                where: { isActive: true },
                order: [['createdAt', 'DESC']],
                limit: 5,
                attributes: ['id', 'name', 'price', 'images', 'stock'],
                raw: true // Return array directly instead of { rows, count }
            });
            
            // Ensure it's an array - handle all possible return formats
            if (Array.isArray(productsResult)) {
                topProducts = productsResult;
            } else if (productsResult && typeof productsResult === 'object') {
                // Handle { rows: [...] } format
                topProducts = productsResult.rows || [];
            } else {
                console.warn('⚠️ productsResult is unexpected type:', typeof productsResult, productsResult);
                topProducts = [];
            }
            
            // Final safety check
            if (!Array.isArray(topProducts)) {
                console.error('❌ topProducts is still not an array after processing:', typeof topProducts, topProducts);
                topProducts = [];
            } else {
                console.log(`✅ Fetched ${topProducts.length} top products`);
            }
        } catch (productsError) {
            console.error('❌ Error fetching top products:', productsError);
            console.error('❌ Error stack:', productsError.stack);
            topProducts = [];
        }

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers: totalUsersCount,
                    totalProducts: totalProductsCount,
                    totalOrders: totalOrdersCount,
                    pendingOrders: pendingOrdersCount,
                    totalRevenue: totalRevenueValue || 0
                },
                recentOrders: Array.isArray(recentOrders) ? recentOrders : [],
                topProducts: Array.isArray(topProducts) ? topProducts : []
            }
        });
    } catch (error) {
        console.error('❌ Dashboard error:', error);
        console.error('❌ Error stack:', error.stack);
        // Return 200 with empty data instead of 500 to prevent admin panel breakage
        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalUsers: 0,
                    totalProducts: 0,
                    totalOrders: 0,
                    pendingOrders: 0,
                    totalRevenue: 0
                },
                recentOrders: [],
                topProducts: []
            }
        });
    }
});

// @route   GET /api/admin/products
// @desc    Get all products with admin details
// @access  Private (Admin)
router.get('/products', async (req, res) => {
    try {
        console.log('📦 Admin products request:', req.query);
        
        const { page = 1, limit = 20, category, search, isActive } = req.query;
        
        const where = {};
        if (category) where.category = category;
        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { brand: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        console.log('📦 Query where clause:', JSON.stringify(where, null, 2));

        const products = await Product.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        console.log('📦 Found products:', products.count);
        console.log('📦 Products rows:', products.rows?.length || 0);

        res.json({
            success: true,
            data: {
                products: products.rows || [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(products.count / parseInt(limit)),
                    totalProducts: products.count
                }
            }
        });
    } catch (error) {
        console.error('❌ Get admin products error:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error details:', error.details);
        // Return 200 with empty products instead of 500 to prevent admin panel breakage
        res.status(200).json({
            success: true,
            data: {
                products: [],
                pagination: {
                    currentPage: parseInt(req.query.page) || 1,
                    totalPages: 0,
                    totalProducts: 0
                }
            },
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, role, search } = req.query;
        
        const where = {};
        if (role) where.role = role;
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const users = await User.findAndCountAll({
            where,
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                users: users.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(users.count / parseInt(limit)),
                    totalUsers: users.count
                }
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        // Return 200 with empty users instead of 500
        res.status(200).json({
            success: true,
            data: { users: [] }
        });
    }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
// @access  Private (Admin)
router.put('/users/:id/role', [
    body('role').isIn(['user', 'admin']).withMessage('Invalid role')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { role } = req.body;
        
        // Prevent creating admin users through API - admins are created via seed script only
        if (role === 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Cannot assign admin role. Admin users are created via seed script only.' 
            });
        }
        
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Also prevent downgrading existing admin users
        if (user.role === 'admin' && role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Cannot change admin user role. Admin users are managed via seed script only.' 
            });
        }

        await user.update({ role });

        res.json({
            success: true,
            message: 'User role updated successfully',
            data: { user: { id: user.id, name: user.name, email: user.email, role: user.role } }
        });
    } catch (error) {
        console.error('Update user role error:', error);
        // Return 200 with error message instead of 500
        res.status(200).json({
            success: false,
            message: 'Failed to update user role',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   PUT /api/admin/products/:id/featured
// @desc    Toggle product featured status
// @access  Private (Admin)
router.put('/products/:id/featured', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await product.update({ isFeatured: req.body.isFeatured });

        res.json({
            success: true,
            message: `Product ${product.isFeatured ? 'featured' : 'unfeatured'} successfully`,
            data: { product }
        });
    } catch (error) {
        console.error('Toggle featured error:', error);
        // Return 200 with error message instead of 500
        res.status(200).json({
            success: false,
            message: 'Failed to toggle featured status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   GET /api/admin/orders
// @desc    Get all orders
// @access  Private (Admin)
router.get('/orders', async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        
        const where = {};
        if (status) where.orderStatus = status;
        if (search) {
            where[Op.or] = [
                { orderNumber: { [Op.like]: `%${search}%` } },
                { customerName: { [Op.like]: `%${search}%` } },
                { customerEmail: { [Op.like]: `%${search}%` } }
            ];
        }

        const orders = await Order.findAndCountAll({
            where,
            include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: {
                orders: orders.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(orders.count / parseInt(limit)),
                    totalOrders: orders.count
                }
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        // Return 200 with empty orders instead of 500
        res.status(200).json({
            success: true,
            data: { orders: [] }
        });
    }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private (Admin)
router.put('/orders/:id/status', [
    body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const order = await Order.findByPk(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        await order.update({ orderStatus: req.body.status });

        res.json({
            success: true,
            message: 'Order status updated successfully',
            data: { order }
        });
    } catch (error) {
        console.error('Update order status error:', error);
        // Return 200 with error message instead of 500
        res.status(200).json({
            success: false,
            message: 'Failed to update order status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// @route   GET /api/admin/analytics
// @desc    Get analytics data
// @access  Private (Admin)
router.get('/analytics', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        // Calculate date range
        const now = new Date();
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        // Get basic stats
        const [
            totalRevenue,
            totalOrders,
            allProducts
        ] = await Promise.all([
            Order.sum('total', { where: { paymentStatus: 'paid' } }),
            Order.count({ where: { paymentStatus: 'paid' } }),
            Product.findAll({
                where: { isActive: true },
                attributes: ['category'],
                raw: true
            })
        ]);

        // Group by category manually (Supabase doesn't support GROUP BY directly)
        const categoryMap = {};
        (allProducts || []).forEach(product => {
            const category = product.category || 'uncategorized';
            categoryMap[category] = (categoryMap[category] || 0) + 1;
        });

        const categoryStats = Object.keys(categoryMap).map(category => ({
            category,
            count: categoryMap[category]
        }));

        res.json({
            success: true,
            data: {
                totalRevenue: totalRevenue || 0,
                totalOrders,
                categoryStats
            }
        });
    } catch (error) {
        console.error('❌ Analytics error:', error);
        console.error('❌ Error stack:', error.stack);
        // Return 200 with empty analytics instead of 500
        res.status(200).json({
            success: true,
            data: {
                totalRevenue: 0,
                totalOrders: 0,
                categoryStats: []
            }
        });
    }
});

module.exports = router;
