/**
 * Test Pesapal Integration
 * Run this script to verify your Pesapal credentials and connection
 */

require('dotenv').config();
const pesapalService = require('./services/pesapal');

async function testPesapal() {
    console.log('🧪 Testing Pesapal Integration...\n');

    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log('   PESAPAL_CONSUMER_KEY:', process.env.PESAPAL_CONSUMER_KEY ? '✅ SET' : '❌ NOT SET');
    console.log('   PESAPAL_CONSUMER_SECRET:', process.env.PESAPAL_CONSUMER_SECRET ? '✅ SET' : '❌ NOT SET');
    console.log('   PESAPAL_ENVIRONMENT:', process.env.PESAPAL_ENVIRONMENT || 'sandbox');
    console.log('   PESAPAL_IPN_URL:', process.env.PESAPAL_IPN_URL || 'Not set (will use default)');
    console.log('   PESAPAL_CALLBACK_URL:', process.env.PESAPAL_CALLBACK_URL || 'Not set (will use default)');
    console.log('   BASE_URL:', process.env.BASE_URL || 'Not set\n');

    if (!process.env.PESAPAL_CONSUMER_KEY || !process.env.PESAPAL_CONSUMER_SECRET) {
        console.error('❌ ERROR: PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET must be set in .env file!');
        process.exit(1);
    }

    // Test 1: Get Access Token
    console.log('🔐 Test 1: Getting Access Token...');
    try {
        const token = await pesapalService.getAccessToken();
        console.log('✅ Access token obtained successfully!');
        console.log('   Token:', token.substring(0, 20) + '...\n');
    } catch (error) {
        console.error('❌ Failed to get access token:', error.message);
        console.error('   Make sure your credentials are correct and you have internet connection.\n');
        process.exit(1);
    }

    // Test 2: Register IPN
    console.log('📡 Test 2: Registering IPN URL...');
    try {
        const ipnResponse = await pesapalService.registerIPN();
        if (ipnResponse && ipnResponse.ipn_id) {
            console.log('✅ IPN registered successfully!');
            console.log('   IPN ID:', ipnResponse.ipn_id);
        } else {
            console.log('⚠️  IPN registration returned no ID (this is okay, IPN might already be registered)');
        }
        console.log('');
    } catch (error) {
        console.error('❌ Failed to register IPN:', error.message);
        console.log('   (This might be okay if IPN is already registered)\n');
    }

    console.log('✅ All tests completed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Make sure your IPN URL is publicly accessible');
    console.log('   2. Test a payment in sandbox mode');
    console.log('   3. Check server logs for IPN callbacks');
    console.log('   4. Verify orders are created and updated correctly\n');
}

testPesapal().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});




