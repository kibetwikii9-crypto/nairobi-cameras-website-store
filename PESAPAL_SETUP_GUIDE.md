# Pesapal Payment Integration Setup Guide

## ✅ Implementation Complete

All Pesapal payment integration code has been implemented. Follow these steps to complete the setup.

## 📋 Required Environment Variables

Add these to your `backend/.env` or `backend/env.production` file:

```env
# Pesapal Configuration
PESAPAL_CONSUMER_KEY=your_consumer_key_here
PESAPAL_CONSUMER_SECRET=your_consumer_secret_here
PESAPAL_ENVIRONMENT=sandbox  # Use 'sandbox' for testing, 'production' for live
PESAPAL_IPN_URL=https://yourdomain.com/api/payments/pesapal/ipn
PESAPAL_CALLBACK_URL=https://yourdomain.com/payment-callback
BASE_URL=https://yourdomain.com  # Your website URL
```

## 🔧 Setup Steps

### 1. Get Pesapal Credentials
- Sign up at [Pesapal](https://www.pesapal.com/)
- Get your Consumer Key and Consumer Secret from the dashboard
- For testing, use sandbox credentials
- For production, use live credentials

### 2. Configure Environment Variables
- Add all required variables to your `.env` file
- Make sure `PESAPAL_ENVIRONMENT` is set to `sandbox` for testing
- Update URLs to match your domain

### 3. Database Migration
The Order model has been updated with Pesapal fields. If you need to update existing database:

```sql
-- Add Pesapal fields to Orders table (if using Supabase)
ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "pesapalOrderTrackingId" VARCHAR(255);
ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "pesapalMerchantReference" VARCHAR(255);
ALTER TABLE "pesapalPaymentMethod" VARCHAR(255);

-- Update paymentMethod enum to include 'pesapal'
-- Update paymentStatus enum to include 'processing'
```

### 4. Test the Integration

#### Test Payment Flow:
1. Add items to cart
2. Click "Proceed to Checkout"
3. Fill in customer details
4. Click "Pay with Pesapal"
5. You'll be redirected to Pesapal payment page
6. Complete payment (use test credentials in sandbox)
7. You'll be redirected back to payment-callback.html

#### Test IPN (Webhook):
- Pesapal will send IPN notifications to your server
- Check server logs for IPN processing
- Verify orders are updated correctly

## 📁 Files Created/Modified

### Backend Files:
- ✅ `backend/services/pesapal.js` - Pesapal service utility
- ✅ `backend/routes/payments.js` - Payment API routes
- ✅ `backend/models/Order.js` - Updated with Pesapal fields
- ✅ `backend/server-production.js` - Added payment routes

### Frontend Files:
- ✅ `js/cart.js` - Updated checkout flow with Pesapal integration
- ✅ `payment-callback.html` - Payment status page

## 🔌 API Endpoints

### POST `/api/payments/pesapal/initiate`
Initiate a payment request.

**Request Body:**
```json
{
  "items": [
    {
      "id": 1,
      "quantity": 2
    }
  ],
  "customer": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+254712345678"
  },
  "shippingAddress": {
    "addressLine1": "123 Main St",
    "city": "Nairobi",
    "state": "Nairobi County",
    "postalCode": "00100"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": 123,
    "orderNumber": "GST-123456-789",
    "redirectUrl": "https://pay.pesapal.com/...",
    "orderTrackingId": "abc123"
  }
}
```

### GET `/api/payments/pesapal/ipn`
Handle Pesapal IPN callbacks (called by Pesapal).

### GET `/api/payments/pesapal/status/:orderId`
Check payment status for an order.

## 🧪 Testing

### Sandbox Testing:
1. Use sandbox credentials
2. Use test phone numbers and cards provided by Pesapal
3. Test successful payments
4. Test failed payments
5. Verify IPN callbacks

### Production Checklist:
- [ ] Update environment variables to production
- [ ] Set `PESAPAL_ENVIRONMENT=production`
- [ ] Update IPN URL to production domain
- [ ] Update callback URL to production domain
- [ ] Test with small real transaction first
- [ ] Monitor logs for any issues

## ⚠️ Important Notes

1. **IPN URL**: Must be publicly accessible (Pesapal needs to reach it)
2. **Callback URL**: Where users are redirected after payment
3. **OAuth Token**: Automatically cached and refreshed
4. **Order Status**: Automatically updated when payment is confirmed
5. **Stock Management**: Product stock is updated when payment is confirmed

## 🐛 Troubleshooting

### Payment not initiating:
- Check environment variables are set correctly
- Verify Pesapal credentials are valid
- Check server logs for errors

### IPN not working:
- Ensure IPN URL is publicly accessible
- Check server logs for IPN requests
- Verify IPN URL in Pesapal dashboard

### Payment status not updating:
- Check IPN is being received
- Verify order lookup by merchant reference
- Check database connection

## 📞 Support

For Pesapal API issues, contact Pesapal support.
For integration issues, check server logs and error messages.


