const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        
        const filter = { user: req.user._id };
        if (status) filter.orderStatus = status;

        const orders = await Order.find(filter)
            .populate('items.product', 'name images price')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(filter);

        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalOrders: total
                }
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product', 'name images price')
            .populate('user', 'name email phone');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user owns this order or is admin
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({
            success: true,
            data: { order }
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', auth, [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product').isMongoId().withMessage('Invalid product ID'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('shippingAddress.name').trim().isLength({ min: 2 }).withMessage('Shipping name is required'),
    body('shippingAddress.street').trim().isLength({ min: 5 }).withMessage('Street address is required'),
    body('shippingAddress.city').trim().isLength({ min: 2 }).withMessage('City is required'),
    body('shippingAddress.state').trim().isLength({ min: 2 }).withMessage('State is required'),
    body('shippingAddress.zipCode').trim().isLength({ min: 3 }).withMessage('Zip code is required'),
    body('shippingAddress.country').trim().isLength({ min: 2 }).withMessage('Country is required'),
    body('paymentMethod').isIn(['cash', 'mpesa', 'card', 'bank_transfer']).withMessage('Invalid payment method')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { items, shippingAddress, billingAddress, paymentMethod, notes } = req.body;

        // Validate products and calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(400).json({ message: `Product ${item.product} not found` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
                });
            }

            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                product: product._id,
                quantity: item.quantity,
                price: product.price,
                name: product.name,
                image: product.images[0]?.url || ''
            });
        }

        // Calculate shipping (free for orders over 50,000 KSh)
        const shippingCost = subtotal >= 50000 ? 0 : 2000;
        const tax = subtotal * 0.16; // 16% VAT
        const total = subtotal + shippingCost + tax;

        // Create order
        const order = new Order({
            user: req.user._id,
            items: orderItems,
            shippingAddress,
            billingAddress: billingAddress || shippingAddress,
            paymentMethod,
            subtotal,
            shippingCost,
            tax,
            total,
            notes
        });

        await order.save();

        // Update product stock
        for (const item of items) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: -item.quantity } }
            );
        }

        // Populate order for response
        await order.populate('items.product', 'name images price');

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

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Admin)
router.put('/:id/status', adminAuth, [
    body('orderStatus').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status'),
    body('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('Invalid payment status'),
    body('trackingNumber').optional().trim().isLength({ min: 5 }).withMessage('Tracking number must be at least 5 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { orderStatus, paymentStatus, trackingNumber, notes } = req.body;
        
        const updateData = { orderStatus };
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        if (notes) updateData.notes = notes;

        // Set delivery date if status is delivered
        if (orderStatus === 'delivered') {
            updateData.deliveredAt = new Date();
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('items.product', 'name images price')
         .populate('user', 'name email phone');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

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

// @route   GET /api/orders/admin/all
// @desc    Get all orders (Admin)
// @access  Private (Admin)
router.get('/admin/all', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, paymentStatus } = req.query;
        
        const filter = {};
        if (status) filter.orderStatus = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        const orders = await Order.find(filter)
            .populate('items.product', 'name images price')
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(filter);

        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalOrders: total
                }
            }
        });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
