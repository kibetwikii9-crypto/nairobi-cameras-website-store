# Pesapal Production Setup Guide

## ✅ What You Need in Your .env File

To switch to **LIVE/PRODUCTION** payments, ensure these environment variables are set:

```env
# Pesapal Live Credentials
PESAPAL_CONSUMER_KEY=your_live_consumer_key
PESAPAL_CONSUMER_SECRET=your_live_consumer_secret
PESAPAL_ENVIRONMENT=production

# Your Production Website URL (for callbacks)
BASE_URL=https://your-production-domain.com

# Optional: Custom callback URLs (if different from defaults)
PESAPAL_IPN_URL=https://your-production-domain.com/api/payments/pesapal/ipn
PESAPAL_CALLBACK_URL=https://your-production-domain.com/payment-callback
```

## 🔍 Verification

After setting up your .env file:

1. **Restart your server** - Environment variables are loaded on startup
2. **Check server logs** - You should see:
   ```
   🔐 Pesapal Configuration:
      Environment: ✅ PRODUCTION (LIVE)
      Base URL: https://pay.pesapal.com/v3
      ⚠️  LIVE MODE: Real payments will be processed!
   ```

3. **Test a payment** - Use a small test amount first

## ⚠️ Important Notes

### Production URLs
- **API Base URL**: `https://pay.pesapal.com/v3`
- **Alternative**: `https://pay.pesapal.com`

### Callback URLs Must Be:
- ✅ **HTTPS** (not HTTP)
- ✅ **Publicly accessible** (Pesapal needs to reach them)
- ✅ **Correct domain** (matches your production domain)

### IPN (Instant Payment Notification)
- Pesapal will call your IPN URL to notify you of payment status
- Make sure `/api/payments/pesapal/ipn` is accessible
- Both GET and POST methods are supported

### Security
- ✅ Never commit `.env` file to git
- ✅ Use strong, unique credentials
- ✅ Keep credentials secure
- ✅ Monitor payment logs regularly

## 🧪 Testing Production Setup

You can test your production setup with Pesapal's test cards (if available) or use a small real transaction to verify everything works.

## 📝 What the Code Does Automatically

The code automatically:
- ✅ Detects `PESAPAL_ENVIRONMENT=production` and switches to live endpoints
- ✅ Uses production API URLs (`https://pay.pesapal.com/v3`)
- ✅ Logs configuration on startup for verification
- ✅ Handles both sandbox and production modes seamlessly

## ❌ Common Issues

### Still Using Sandbox?
- Check that `PESAPAL_ENVIRONMENT=production` is set (not `sandbox` or missing)
- Restart your server after changing .env

### Callback Not Working?
- Ensure `BASE_URL` is set to your production HTTPS URL
- Verify the callback URL is publicly accessible
- Check that your server is running and accessible

### Authentication Errors?
- Verify your live Consumer Key and Secret are correct
- Ensure credentials match your Pesapal account
- Check that your Pesapal account is activated for live payments

