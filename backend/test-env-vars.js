/**
 * Quick test to check if .env variables are loaded
 * Run: node test-env-vars.js
 */

require('dotenv').config();

console.log('🧪 Testing .env file loading...\n');

console.log('📋 Environment Variables:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ NOT SET');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');

if (process.env.SUPABASE_URL) {
  console.log('\n🔗 SUPABASE_URL value:', process.env.SUPABASE_URL.substring(0, 50) + '...');
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('🔑 SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...');
}

console.log('\n📁 .env file location: backend/.env');
console.log('💡 Make sure the .env file is in the backend folder!');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n❌ Supabase credentials are missing!');
  console.log('\n📝 To fix:');
  console.log('   1. Open backend/.env file');
  console.log('   2. Add these lines:');
  console.log('      SUPABASE_URL=https://your-project.supabase.co');
  console.log('      SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('   3. Make sure there are NO spaces around the = sign');
  console.log('   4. Make sure there are NO quotes around the values');
} else {
  console.log('\n✅ Supabase credentials are set!');
  console.log('💡 Restart the server to use Supabase.');
}

