const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const pesapalService = require('../services/pesapal');
const { Order } = require('../config/database');
const { Product } = require('../config/database');

/**
 * @route   POST /api/payments/pesapal/initiate
 * @desc    Initiate Pesapal payment
 * @access  Public (for now, can add auth later)
 */
router.post('/pesapal/initiate', [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.id').notEmpty().withMessage('Product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('customer.firstName').trim().notEmpty().withMessage('First name is required'),
    body('customer.lastName').trim().notEmpty().withMessage('Last name is required'),
    body('customer.email').isEmail().withMessage('Valid email is required'),
    body('customer.phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
    body('shippingAddress.addressLine1').trim().notEmpty().withMessage('Address is required'),
    body('shippingAddress.city').trim().notEmpty().withMessage('City is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { items, customer, shippingAddress, billingAddress, notes } = req.body;

        // Validate products and calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findOne({ where: { id: item.id } });
            if (!product) {
                return res.status(400).json({ 
                    success: false,
                    message: `Product ${item.id} not found` 
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    success: false,
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
                });
            }

            const itemTotal = parseFloat(product.price) * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                id: product.id,
                name: product.name,
                quantity: item.quantity,
                price: parseFloat(product.price),
                image: product.images && product.images[0] ? product.images[0].url : ''
            });
        }

        // Calculate shipping (free for orders over 50,000 KSh)
        const shippingCost = subtotal >= 50000 ? 0 : 500;
        const tax = 0; // Tax set to 0.00 as per your current setup
        const total = subtotal + shippingCost + tax;

        // Create order in database
        const order = await Order.create({
            orderNumber: `GST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            userId: 1, // Guest user - can be updated later with actual user system
            items: orderItems,
            shippingAddress: shippingAddress,
            billingAddress: billingAddress || shippingAddress,
            paymentMethod: 'pesapal',
            paymentStatus: 'pending',
            orderStatus: 'pending',
            subtotal: subtotal,
            shippingCost: shippingCost,
            tax: tax,
            total: total,
            notes: notes || ''
        });

        // Prepare order data for Pesapal
        const orderData = {
            orderNumber: order.orderNumber,
            amount: total,
            currency: 'KES',
            description: `Order ${order.orderNumber} - ${orderItems.length} item(s)`
        };

        // Prepare customer data for Pesapal
        const customerData = {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phoneNumber: customer.phoneNumber,
            addressLine1: shippingAddress.addressLine1,
            addressLine2: shippingAddress.addressLine2 || '',
            city: shippingAddress.city,
            state: shippingAddress.state || '',
            postalCode: shippingAddress.postalCode || ''
        };

        // Create payment request with Pesapal
        const paymentResponse = await pesapalService.createPaymentRequest(orderData, customerData);

        // Update order with Pesapal tracking information
        await order.update({
            pesapalOrderTrackingId: paymentResponse.orderTrackingId,
            pesapalMerchantReference: paymentResponse.merchantReference
        });

        res.json({
            success: true,
            data: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                redirectUrl: paymentResponse.redirectUrl,
                orderTrackingId: paymentResponse.orderTrackingId
            }
        });

    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to initiate payment',
            error: error.message 
        });
    }
});

/**
 * @route   GET /api/payments/pesapal/ipn
 * @desc    Handle Pesapal IPN (Instant Payment Notification) callback
 * @access  Public (called by Pesapal)
 */
router.get('/pesapal/ipn', async (req, res) => {
    try {
        const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.query;

        if (!OrderTrackingId || !OrderMerchantReference) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required IPN parameters' 
            });
        }

        // Verify IPN data
        const isValid = pesapalService.verifyIPN(req.query);
        if (!isValid) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid IPN data' 
            });
        }

        // Get payment status from Pesapal
        const paymentStatus = await pesapalService.getPaymentStatus(OrderTrackingId);

        // Find order by merchant reference (order number)
        const order = await Order.findOne({ 
            where: { orderNumber: OrderMerchantReference } 
        });

        if (!order) {
            console.error('Order not found for IPN:', OrderMerchantReference);
            return res.status(404).json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        // Update order based on payment status
        const status = paymentStatus.payment_status_description || paymentStatus.status;
        
        if (status === 'COMPLETED' || status === 'Paid') {
            await order.update({
                paymentStatus: 'paid',
                orderStatus: 'confirmed',
                pesapalPaymentMethod: paymentStatus.payment_method || null
            });

            // Update product stock
            for (const item of order.items) {
                const product = await Product.findOne({ where: { id: item.id } });
                if (product) {
                    await product.update({
                        stock: product.stock - item.quantity
                    });
                }
            }
        } else if (status === 'FAILED' || status === 'Failed') {
            await order.update({
                paymentStatus: 'failed'
            });
        }

        // Respond to Pesapal
        res.status(200).send('OK');

    } catch (error) {
        console.error('IPN processing error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to process IPN',
            error: error.message 
        });
    }
});

/**
 * @route   POST /api/payments/pesapal/ipn
 * @desc    Handle Pesapal IPN POST callback (alternative method)
 * @access  Public (called by Pesapal)
 */
router.post('/pesapal/ipn', async (req, res) => {
    try {
        const ipnData = req.body;

        if (!ipnData.OrderTrackingId || !ipnData.OrderMerchantReference) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required IPN parameters' 
            });
        }

        // Verify IPN data
        const isValid = pesapalService.verifyIPN(ipnData);
        if (!isValid) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid IPN data' 
            });
        }

        // Get payment status from Pesapal
        const paymentStatus = await pesapalService.getPaymentStatus(ipnData.OrderTrackingId);

        // Find order by merchant reference
        const order = await Order.findOne({ 
            where: { orderNumber: ipnData.OrderMerchantReference } 
        });

        if (!order) {
            console.error('Order not found for IPN:', ipnData.OrderMerchantReference);
            return res.status(404).json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        // Update order based on payment status
        const status = paymentStatus.payment_status_description || paymentStatus.status;
        
        if (status === 'COMPLETED' || status === 'Paid') {
            await order.update({
                paymentStatus: 'paid',
                orderStatus: 'confirmed',
                pesapalPaymentMethod: paymentStatus.payment_method || null
            });

            // Update product stock
            for (const item of order.items) {
                const product = await Product.findOne({ where: { id: item.id } });
                if (product) {
                    await product.update({
                        stock: product.stock - item.quantity
                    });
                }
            }
        } else if (status === 'FAILED' || status === 'Failed') {
            await order.update({
                paymentStatus: 'failed'
            });
        }

        // Respond to Pesapal
        res.status(200).send('OK');

    } catch (error) {
        console.error('IPN processing error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to process IPN',
            error: error.message 
        });
    }
});

/**
 * @route   GET /api/payments/pesapal/status/:orderId
 * @desc    Check payment status for an order
 * @access  Public
 */
router.get('/pesapal/status/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { trackingId } = req.query;

        let order;

        // Try to find by order ID first
        if (orderId !== 'check') {
            order = await Order.findOne({ where: { id: orderId } });
        }

        // If not found and trackingId provided, find by tracking ID
        if (!order && trackingId) {
            order = await Order.findOne({ where: { pesapalOrderTrackingId: trackingId } });
        }

        // If still not found, try by merchant reference
        if (!order && req.query.orderNumber) {
            order = await Order.findOne({ where: { orderNumber: req.query.orderNumber } });
        }

        if (!order) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        if (!order.pesapalOrderTrackingId) {
            return res.status(400).json({ 
                success: false,
                message: 'Order does not have Pesapal tracking ID' 
            });
        }

        // Get latest status from Pesapal
        const paymentStatus = await pesapalService.getPaymentStatus(order.pesapalOrderTrackingId);

        // Update order status if payment is completed
        const status = paymentStatus.payment_status_description || paymentStatus.status;
        if (status === 'COMPLETED' || status === 'Paid') {
            if (order.paymentStatus !== 'paid') {
                await order.update({
                    paymentStatus: 'paid',
                    orderStatus: 'confirmed',
                    pesapalPaymentMethod: paymentStatus.payment_method || null
                });
            }
        }

        res.json({
            success: true,
            data: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                paymentStatus: order.paymentStatus,
                orderStatus: order.orderStatus,
                pesapalStatus: paymentStatus
            }
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to check payment status',
            error: error.message 
        });
    }
});

module.exports = router;

