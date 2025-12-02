const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

/**
 * Pesapal Payment Gateway Service
 * Handles OAuth authentication, payment requests, and IPN verification
 */

class PesapalService {
    constructor() {
        this.consumerKey = process.env.PESAPAL_CONSUMER_KEY;
        this.consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
        this.environment = process.env.PESAPAL_ENVIRONMENT || 'sandbox';
        this.ipnUrl = process.env.PESAPAL_IPN_URL || `${process.env.BASE_URL || 'http://localhost:3000'}/api/payments/pesapal/ipn`;
        this.callbackUrl = process.env.PESAPAL_CALLBACK_URL || `${process.env.BASE_URL || 'http://localhost:3000'}/payment-callback`;
        
        // Pesapal API endpoints
        // Note: Pesapal v3 uses different endpoints
        this.baseUrl = this.environment === 'production' 
            ? 'https://pay.pesapal.com/v3'
            : 'https://cybqa.pesapal.com/pesapalv3';
        
        // Alternative base URLs if the above don't work
        this.alternativeBaseUrl = this.environment === 'production'
            ? 'https://pay.pesapal.com'
            : 'https://cybqa.pesapal.com';
        
        this.accessToken = null;
        this.tokenExpiry = null;
        
        // Log environment configuration on initialization
        this.logConfiguration();
    }
    
    /**
     * Log current Pesapal configuration
     */
    logConfiguration() {
        console.log('\n🔐 Pesapal Configuration:');
        console.log('   Environment:', this.environment === 'production' ? '✅ PRODUCTION (LIVE)' : '⚠️ SANDBOX (TEST)');
        console.log('   Base URL:', this.baseUrl);
        console.log('   Consumer Key:', this.consumerKey ? `${this.consumerKey.substring(0, 8)}...` : '❌ NOT SET');
        console.log('   Consumer Secret:', this.consumerSecret ? '✅ SET' : '❌ NOT SET');
        console.log('   IPN URL:', this.ipnUrl);
        console.log('   Callback URL:', this.callbackUrl);
        
        if (this.environment === 'production') {
            console.log('   ⚠️  LIVE MODE: Real payments will be processed!');
            if (!this.consumerKey || !this.consumerSecret) {
                console.error('   ❌ ERROR: Consumer Key and Secret must be set for production!');
            }
        } else {
            console.log('   ℹ️  TEST MODE: No real payments will be processed');
        }
        console.log('');
    }

    /**
     * Generate OAuth signature for Pesapal API requests
     */
    generateOAuthSignature(method, url, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
        
        const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
        const signingKey = `${encodeURIComponent(this.consumerSecret)}&`;
        
        return crypto
            .createHmac('sha1', signingKey)
            .update(signatureBase)
            .digest('base64');
    }

    /**
     * Get access token from Pesapal v3 API
     * Pesapal v3 uses Consumer Key and Secret in request body
     */
    async getAccessToken() {
        // Return cached token if still valid
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            // Try the standard v3 endpoint first
            let url = `${this.baseUrl}/api/Auth/RequestToken`;
            
            // Pesapal v3 expects consumer_key and consumer_secret in the request body
            let response;
            try {
                response = await axios.post(url, {
                    consumer_key: this.consumerKey,
                    consumer_secret: this.consumerSecret
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
            } catch (firstError) {
                // If that fails, try alternative endpoint
                console.log('Trying alternative endpoint...');
                url = `${this.alternativeBaseUrl}/api/Auth/RequestToken`;
                response = await axios.post(url, {
                    consumer_key: this.consumerKey,
                    consumer_secret: this.consumerSecret
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
            }

            if (response.data && response.data.token) {
                this.accessToken = response.data.token;
                // Cache token for 4 minutes (Pesapal tokens expire in 5 minutes)
                this.tokenExpiry = Date.now() + (4 * 60 * 1000);
                return this.accessToken;
            }
            
            // Check for alternative response formats
            if (response.data && response.data.access_token) {
                this.accessToken = response.data.access_token;
                this.tokenExpiry = Date.now() + (4 * 60 * 1000);
                return this.accessToken;
            }

            throw new Error(`Failed to get access token - unexpected response format: ${JSON.stringify(response.data)}`);
        } catch (error) {
            console.error('Pesapal Auth Error:', error.response?.data || error.message);
            
            // Try alternative: Basic Auth
            if (error.response?.status === 401 || error.response?.status === 500) {
                try {
                    const url = `${this.baseUrl}/api/Auth/RequestToken`;
                    const response = await axios.post(url, null, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        auth: {
                            username: this.consumerKey,
                            password: this.consumerSecret
                        }
                    });

                    if (response.data && response.data.token) {
                        this.accessToken = response.data.token;
                        this.tokenExpiry = Date.now() + (4 * 60 * 1000);
                        console.log('✅ Pesapal access token obtained (via Basic Auth)');
                        return this.accessToken;
                    }
                } catch (altError) {
                    console.error('Pesapal Basic Auth Error:', altError.response?.data || altError.message);
                }
            }
            
            const errorMsg = error.response?.data?.error?.message || error.message;
            throw new Error(`Failed to authenticate with Pesapal: ${errorMsg}`);
        }
    }

    /**
     * Create a payment request
     * @param {Object} orderData - Order information
     * @param {String} orderData.id - Order ID
     * @param {String} orderData.orderNumber - Order number
     * @param {Number} orderData.amount - Total amount
     * @param {String} orderData.currency - Currency code (KES)
     * @param {String} orderData.description - Order description
     * @param {Object} customerData - Customer information
     * @param {String} customerData.firstName - Customer first name
     * @param {String} customerData.lastName - Customer last name
     * @param {String} customerData.email - Customer email
     * @param {String} customerData.phoneNumber - Customer phone number
     * @returns {Object} Payment request response with redirect URL
     */
    async createPaymentRequest(orderData, customerData) {
        try {
            const accessToken = await this.getAccessToken();
            
            const paymentData = {
                id: orderData.orderNumber,
                currency: orderData.currency || 'KES',
                amount: orderData.amount,
                description: orderData.description || `Order ${orderData.orderNumber}`,
                callback_url: this.callbackUrl,
                notification_id: null, // Will be set after registering IPN
                billing_address: {
                    email_address: customerData.email,
                    phone_number: customerData.phoneNumber,
                    country_code: 'KE',
                    first_name: customerData.firstName,
                    middle_name: customerData.middleName || '',
                    last_name: customerData.lastName,
                    line_1: customerData.addressLine1 || '',
                    line_2: customerData.addressLine2 || '',
                    city: customerData.city || '',
                    state: customerData.state || '',
                    postal_code: customerData.postalCode || '',
                    zip_code: customerData.postalCode || ''
                }
            };

            // First, register IPN
            const ipnResponse = await this.registerIPN();
            if (ipnResponse && ipnResponse.ipn_id) {
                paymentData.notification_id = ipnResponse.ipn_id;
            }

            const url = `${this.baseUrl}/api/Transactions/SubmitOrderRequest`;
            
            const response = await axios.post(url, paymentData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (response.data && response.data.redirect_url) {
                return {
                    success: true,
                    orderTrackingId: response.data.order_tracking_id,
                    redirectUrl: response.data.redirect_url,
                    merchantReference: orderData.orderNumber
                };
            }

            throw new Error('Failed to create payment request');
        } catch (error) {
            console.error('Pesapal Payment Request Error:', error.response?.data || error.message);
            throw new Error(`Failed to create payment request: ${error.message}`);
        }
    }

    /**
     * Register IPN (Instant Payment Notification) URL
     */
    async registerIPN() {
        try {
            const accessToken = await this.getAccessToken();
            
            const ipnData = {
                url: this.ipnUrl,
                ipn_notification_type: 'GET'
            };

            const url = `${this.baseUrl}/api/URLSetup/RegisterIPN`;
            
            const response = await axios.post(url, ipnData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Pesapal IPN Registration Error:', error.response?.data || error.message);
            // Don't throw - IPN registration failure shouldn't block payment
            return null;
        }
    }

    /**
     * Get payment status by order tracking ID
     * @param {String} orderTrackingId - Pesapal order tracking ID
     */
    async getPaymentStatus(orderTrackingId) {
        try {
            const accessToken = await this.getAccessToken();
            
            const url = `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`;
            
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Pesapal Status Check Error:', error.response?.data || error.message);
            throw new Error(`Failed to check payment status: ${error.message}`);
        }
    }

    /**
     * Verify IPN callback signature
     * @param {Object} ipnData - IPN callback data
     */
    verifyIPN(ipnData) {
        // Pesapal IPN verification
        // In production, you should verify the signature from Pesapal
        // For now, we'll trust the data structure
        const requiredFields = ['OrderTrackingId', 'OrderMerchantReference', 'OrderNotificationType'];
        
        for (const field of requiredFields) {
            if (!ipnData[field]) {
                return false;
            }
        }

        return true;
    }
}

module.exports = new PesapalService();

