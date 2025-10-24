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
        const [
            totalUsers,
            totalProducts,
            totalOrders,
            pendingOrders,
            totalRevenue,
            recentOrders
        ] = await Promise.all([
            User.count({ where: { role: 'user' } }),
            Product.count({ where: { isActive: true } }),
            Order.count(),
            Order.count({ where: { orderStatus: 'pending' } }),
            Order.sum('total', { where: { paymentStatus: 'paid' } }),
            Order.findAll({
                include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
                order: [['createdAt', 'DESC']],
                limit: 5
            })
        ]);

        // Get top products (simplified for SQLite)
        const topProducts = await Product.findAll({
            where: { isActive: true },
            order: [['createdAt', 'DESC']],
            limit: 5,
            attributes: ['id', 'name', 'price', 'images', 'stock']
        });

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    totalProducts,
                    totalOrders,
                    pendingOrders,
                    totalRevenue: totalRevenue || 0
                },
                recentOrders,
                topProducts
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/products
// @desc    Get all products with admin details
// @access  Private (Admin)
router.get('/products', async (req, res) => {
    try {
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

        const products = await Product.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
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
        console.error('Get admin products error:', error);
        res.status(500).json({ message: 'Server error' });
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
        res.status(500).json({ message: 'Server error' });
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
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.update({ role });

        res.json({
            success: true,
            message: 'User role updated successfully',
            data: { user: { id: user.id, name: user.name, email: user.email, role: user.role } }
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ message: 'Server error' });
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
        res.status(500).json({ message: 'Server error' });
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
        res.status(500).json({ message: 'Server error' });
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
        res.status(500).json({ message: 'Server error' });
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
            categoryStats
        ] = await Promise.all([
            Order.sum('total', { where: { paymentStatus: 'paid' } }),
            Order.count({ where: { paymentStatus: 'paid' } }),
            Product.findAll({
                where: { isActive: true },
                attributes: ['category'],
                group: ['category'],
                raw: true
            })
        ]);

        res.json({
            success: true,
            data: {
                totalRevenue: totalRevenue || 0,
                totalOrders,
                categoryStats: categoryStats.map(stat => ({
                    category: stat.category,
                    count: 1 // Simplified for SQLite
                }))
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
