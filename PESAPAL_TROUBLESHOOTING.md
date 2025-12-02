# Pesapal Integration Troubleshooting Guide

## Current Issue: Authentication Error

If you're getting `invalid_consumer_key_or_secret_provided`, check the following:

### 1. Verify Your Credentials
- Make sure your `PESAPAL_CONSUMER_KEY` and `PESAPAL_CONSUMER_SECRET` are correct
- Check for extra spaces or quotes in your `.env` file
- Ensure you're using **sandbox** credentials for testing (not production)

### 2. Check Credential Format
Your `.env` file should look like this:
```env
PESAPAL_CONSUMER_KEY=qkio1BGGYgTumrWwWBFNWRWWGbHLkJDW
PESAPAL_CONSUMER_SECRET=4V0PEzsItKsJWlI+STFnebNE8CU=
PESAPAL_ENVIRONMENT=sandbox
```

**Important:** 
- No quotes around the values
- No spaces before or after the `=`
- Make sure there are no hidden characters

### 3. Verify Pesapal Account Status
- Log into your Pesapal dashboard
- Check that your account is active
- Verify you're using the correct environment (sandbox vs production)
- Make sure your IPN URL is registered in Pesapal dashboard

### 4. Test Credentials Manually
You can test your credentials using curl:

```bash
curl -X POST https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken \
  -H "Content-Type: application/json" \
  -d '{
    "consumer_key": "YOUR_CONSUMER_KEY",
    "consumer_secret": "YOUR_CONSUMER_SECRET"
  }'
```

### 5. Common Issues

#### Issue: "invalid_consumer_key_or_secret_provided"
**Solutions:**
- Double-check credentials in Pesapal dashboard
- Make sure you're using sandbox credentials for sandbox environment
- Verify credentials are copied correctly (no extra spaces)

#### Issue: "Invalid Access Token"
**Solutions:**
- This usually means the authentication method is wrong
- Check if Pesapal requires a different authentication format
- Verify the API endpoint URL is correct

#### Issue: IPN Not Working
**Solutions:**
- Ensure IPN URL is publicly accessible (not localhost)
- Register IPN URL in Pesapal dashboard
- Check server logs for IPN requests
- Verify your server can receive POST/GET requests from Pesapal

### 6. Pesapal API Documentation
Refer to official Pesapal documentation:
- [Pesapal Developer Portal](https://developer.pesapal.com/)
- [API Reference](https://developer.pesapal.com/api3-documentation)

### 7. Contact Pesapal Support
If credentials are correct but still not working:
- Contact Pesapal support with your consumer key
- Ask them to verify your account status
- Request API endpoint confirmation

### 8. Alternative: Check Pesapal Dashboard
- Log into Pesapal dashboard
- Go to API Settings
- Verify your credentials match what's in the dashboard
- Check if there are any account restrictions

## Next Steps After Fixing Authentication

Once authentication works:
1. Test IPN registration
2. Test payment initiation
3. Test payment callback
4. Verify order creation in database
5. Test complete payment flow end-to-end


