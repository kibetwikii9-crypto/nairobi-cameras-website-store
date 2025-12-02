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
            // Convert ID to number if needed (Supabase uses integer IDs)
            let productId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
            
            // Validate product ID
            if (!productId || isNaN(productId)) {
                console.error('❌ Invalid product ID received:', item);
                return res.status(400).json({ 
                    success: false,
                    message: `Invalid product ID: ${item.id}. Product IDs must be valid numbers.` 
                });
            }
            
            console.log(`🔍 Looking up product with ID: ${productId} (type: ${typeof productId})`);
            
            // Use findByPk for Supabase adapter (or findOne if available)
            let product;
            try {
                if (Product.findByPk) {
                    product = await Product.findByPk(productId);
                } else {
                    product = await Product.findOne({ where: { id: productId } });
                }
            } catch (error) {
                console.error(`❌ Error finding product ${productId}:`, error);
                console.error(`❌ Error details:`, {
                    message: error.message,
                    code: error.code,
                    details: error.details
                });
                return res.status(500).json({ 
                    success: false,
                    message: `Error looking up product ${productId}: ${error.message}` 
                });
            }
            
            if (!product) {
                console.error(`❌ Product not found: ID=${productId}, received item:`, item);
                
                // Try to list available products for debugging
                try {
                    const allProducts = await Product.findAll({ 
                        limit: 20,
                        attributes: ['id', 'name', 'isActive']
                    });
                    const productList = Array.isArray(allProducts) 
                        ? allProducts 
                        : (allProducts.rows || []);
                    console.log(`📦 Available products in database:`, productList.map(p => ({ id: p.id, name: p.name, isActive: p.isActive })));
                    console.log(`📦 Product IDs in database:`, productList.map(p => p.id).join(', '));
                } catch (debugError) {
                    console.error('Could not fetch product list for debugging:', debugError.message);
                }
                
                return res.status(400).json({ 
                    success: false,
                    message: `Product with ID ${productId} not found in database. This product may have been removed or the cart contains outdated data. Please clear your cart and re-add products.`,
                    debug: {
                        requestedId: productId,
                        suggestion: 'Clear your cart and re-add products from the product pages'
                    }
                });
            }
            
            // Check if product is active (if isActive field exists)
            if (product.isActive === false) {
                console.warn(`⚠️ Product ${productId} (${product.name}) is inactive`);
                return res.status(400).json({ 
                    success: false,
                    message: `Product "${product.name}" is currently unavailable.` 
                });
            }
            
            console.log(`✅ Found product: ${product.name} (ID: ${product.id}, Active: ${product.isActive !== false})`);

            // Check stock (handle both number and string stock values)
            const stock = typeof product.stock === 'string' ? parseInt(product.stock, 10) : (product.stock || 0);
            if (stock < item.quantity) {
                return res.status(400).json({ 
                    success: false,
                    message: `Insufficient stock for ${product.name}. Available: ${stock}` 
                });
            }

            const itemTotal = parseFloat(product.price || 0) * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                id: product.id,
                name: product.name,
                quantity: item.quantity,
                price: parseFloat(product.price || 0),
                image: (product.images && Array.isArray(product.images) && product.images[0]?.url) 
                    ? product.images[0].url 
                    : (product.image || '')
            });
        }

        // Calculate shipping (free for orders over 50,000 KSh)
        const shippingCost = subtotal >= 50000 ? 0 : 500;
        const tax = 0; // Tax set to 0.00 as per your current setup
        const total = subtotal + shippingCost + tax;

        // Generate order number
        const orderNumber = `GST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Prepare order data for Pesapal first (before creating order)
        const orderData = {
            orderNumber: orderNumber,
            amount: total,
            currency: 'KES',
            description: `Order ${orderNumber} - ${orderItems.length} item(s)`
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

        // Create payment request with Pesapal FIRST
        let paymentResponse;
        try {
            console.log('💳 Initiating Pesapal payment request...');
            console.log('💳 Order data:', JSON.stringify(orderData, null, 2));
            console.log('💳 Customer data:', JSON.stringify(customerData, null, 2));
            
            paymentResponse = await pesapalService.createPaymentRequest(orderData, customerData);
            
            console.log('✅ Pesapal payment request successful:', paymentResponse);
        } catch (error) {
            console.error('❌ Pesapal payment request error:');
            console.error('   Error message:', error.message);
            console.error('   Error stack:', error.stack);
            console.error('   Full error:', error);
            
            return res.status(500).json({ 
                success: false,
                message: error.message || 'Failed to create payment request',
                error: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }

        // Create order in database AFTER payment request is successful
        let order;
        try {
            // Ensure we have a valid user ID (create guest user if needed)
            let userId = 1;
            try {
                // Check if user 1 exists, if not create a guest user
                const { User } = require('../config/database');
                if (User && User.findByPk) {
                    const existingUser = await User.findByPk(1);
                    if (!existingUser) {
                        console.log('Creating guest user (ID: 1)...');
                        try {
                            await User.create({
                                id: 1,
                                email: 'guest@example.com',
                                password: 'guest', // Placeholder - not used for guest orders
                                name: 'Guest User',
                                role: 'guest'
                            });
                            console.log('✅ Guest user created');
                        } catch (createError) {
                            console.warn('⚠️ Could not create guest user, will try with userId: 1:', createError.message);
                        }
                    }
                }
            } catch (userError) {
                console.warn('⚠️ Could not verify/create guest user, proceeding with userId: 1:', userError.message);
                // Continue with userId: 1 even if user doesn't exist (Supabase might allow it)
            }
            
            // Prepare order data - Supabase orders table has minimal schema
            // Store all extra data in shippingAddress JSON field
            const orderData = {
                userId: userId,
                items: orderItems,
                total: total,
                status: 'pending', // Supabase uses 'status' not 'orderStatus'
                shippingAddress: {
                    // Store shipping info
                    ...shippingAddress,
                    // Store additional order metadata in shippingAddress JSON
                    orderNumber: orderNumber,
                    billingAddress: billingAddress || shippingAddress,
                    paymentMethod: 'pesapal',
                    paymentStatus: 'pending',
                    orderStatus: 'pending',
                    subtotal: subtotal,
                    shippingCost: shippingCost,
                    tax: tax,
                    notes: notes || '',
                    pesapalOrderTrackingId: paymentResponse.orderTrackingId || null,
                    pesapalMerchantReference: paymentResponse.merchantReference || null
                }
            };
            
            console.log('📦 Creating order with data:', JSON.stringify(orderData, null, 2));
            order = await Order.create(orderData);
            console.log('✅ Order created successfully:', order.id);
        } catch (error) {
            console.error('Error creating order:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                stack: error.stack
            });
            return res.status(500).json({ 
                success: false,
                message: 'Failed to create order in database',
                error: error.message,
                details: process.env.NODE_ENV === 'development' ? error.details : undefined
            });
        }

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
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        res.status(500).json({ 
            success: false,
            message: 'Failed to initiate payment',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
            // Update order using Supabase update method
            try {
                await Order.update(
                    {
                        paymentStatus: 'paid',
                        orderStatus: 'confirmed',
                        pesapalPaymentMethod: paymentStatus.payment_method || null
                    },
                    { where: { id: order.id } }
                );
            } catch (updateError) {
                console.error('Error updating order:', updateError);
            }

            // Update product stock
            for (const item of order.items) {
                try {
                    const productId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
                    let product;
                    if (Product.findByPk) {
                        product = await Product.findByPk(productId);
                    } else {
                        product = await Product.findOne({ where: { id: productId } });
                    }
                    
                    if (product) {
                        const currentStock = typeof product.stock === 'string' ? parseInt(product.stock, 10) : (product.stock || 0);
                        const newStock = currentStock - item.quantity;
                        
                        await Product.update(
                            { stock: newStock },
                            { where: { id: productId } }
                        );
                    }
                } catch (stockError) {
                    console.error(`Error updating stock for product ${item.id}:`, stockError);
                }
            }
        } else if (status === 'FAILED' || status === 'Failed') {
            try {
                await Order.update(
                    { paymentStatus: 'failed' },
                    { where: { id: order.id } }
                );
            } catch (updateError) {
                console.error('Error updating order status:', updateError);
            }
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
            // Update order using Supabase update method
            try {
                await Order.update(
                    {
                        paymentStatus: 'paid',
                        orderStatus: 'confirmed',
                        pesapalPaymentMethod: paymentStatus.payment_method || null
                    },
                    { where: { id: order.id } }
                );
            } catch (updateError) {
                console.error('Error updating order:', updateError);
            }

            // Update product stock
            for (const item of order.items) {
                try {
                    const productId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
                    let product;
                    if (Product.findByPk) {
                        product = await Product.findByPk(productId);
                    } else {
                        product = await Product.findOne({ where: { id: productId } });
                    }
                    
                    if (product) {
                        const currentStock = typeof product.stock === 'string' ? parseInt(product.stock, 10) : (product.stock || 0);
                        const newStock = currentStock - item.quantity;
                        
                        await Product.update(
                            { stock: newStock },
                            { where: { id: productId } }
                        );
                    }
                } catch (stockError) {
                    console.error(`Error updating stock for product ${item.id}:`, stockError);
                }
            }
        } else if (status === 'FAILED' || status === 'Failed') {
            try {
                await Order.update(
                    { paymentStatus: 'failed' },
                    { where: { id: order.id } }
                );
            } catch (updateError) {
                console.error('Error updating order status:', updateError);
            }
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
                try {
                    await Order.update(
                        {
                            paymentStatus: 'paid',
                            orderStatus: 'confirmed',
                            pesapalPaymentMethod: paymentStatus.payment_method || null
                        },
                        { where: { id: order.id } }
                    );
                } catch (updateError) {
                    console.error('Error updating order status:', updateError);
                }
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

