const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filtering and pagination
// @access  Public
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('category').optional().isIn(['laptops', 'phones', 'cameras', 'audio', 'accessories', 'smart-home']),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
    query('search').optional().isString().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            page = 1,
            limit = 12,
            category,
            minPrice,
            maxPrice,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { isActive: true };
        
        if (category) filter.category = category;
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }
        if (search) {
            filter.$text = { $search: search };
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get products
        const products = await Product.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('reviews.user', 'name');

        // Get total count
        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalProducts: total,
                    hasNext: skip + products.length < total,
                    hasPrev: parseInt(page) > 1
                }
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('reviews.user', 'name')
            .lean();

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({
            success: true,
            data: { product }
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private (Admin)
router.post('/', adminAuth, [
    body('name').trim().isLength({ min: 2 }).withMessage('Product name is required'),
    body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('originalPrice').optional().isFloat({ min: 0 }).withMessage('Original price must be a positive number'),
    body('category').isIn(['laptops', 'phones', 'cameras', 'audio', 'accessories', 'smart-home']).withMessage('Invalid category'),
    body('brand').trim().isLength({ min: 1 }).withMessage('Brand is required'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('specifications').optional().isObject().withMessage('Specifications must be an object'),
    body('images').isArray({ min: 1 }).withMessage('At least one image is required'),
    body('images.*.url').isURL().withMessage('Image URL must be valid')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const productData = req.body;
        
        // Set first image as primary
        if (productData.images && productData.images.length > 0) {
            productData.images[0].isPrimary = true;
        }

        const product = new Product(productData);
        await product.save();

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

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Admin)
router.put('/:id', adminAuth, [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),
    body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('originalPrice').optional().isFloat({ min: 0 }).withMessage('Original price must be a positive number'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('specifications').optional().isObject().withMessage('Specifications must be an object')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

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

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Admin)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/products/:id/reviews
// @desc    Add product review
// @access  Private
router.post('/:id/reviews', auth, [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment must be less than 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { rating, comment } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user already reviewed this product
        const existingReview = product.reviews.find(
            review => review.user.toString() === req.user._id.toString()
        );

        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        // Add review
        product.reviews.push({
            user: req.user._id,
            rating,
            comment
        });

        // Update average rating
        const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
        product.rating.average = totalRating / product.reviews.length;
        product.rating.count = product.reviews.length;

        await product.save();

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            data: { product }
        });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
