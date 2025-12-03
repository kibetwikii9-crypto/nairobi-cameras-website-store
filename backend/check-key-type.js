/**
 * Check if the Supabase key is service_role or anon
 */

require('dotenv').config();

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}

// Decode JWT to check the role
try {
  const parts = key.split('.');
  if (parts.length !== 3) {
    console.error('❌ Invalid JWT format');
    process.exit(1);
  }
  
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  
  console.log('🔍 Checking Supabase Key Type\n');
  console.log('Key role:', payload.role);
  console.log('Project ref:', payload.ref);
  console.log('');
  
  if (payload.role === 'service_role') {
    console.log('✅ Correct! This is a SERVICE_ROLE key');
    console.log('   This key has full access and can bypass RLS policies.');
    console.log('   Perfect for backend operations.\n');
  } else if (payload.role === 'anon') {
    console.error('❌ WARNING: This is an ANON key, not a SERVICE_ROLE key!');
    console.error('   Anon keys have limited permissions and cannot bypass RLS.');
    console.error('   This will cause upload failures.\n');
    console.error('💡 To fix:');
    console.error('   1. Go to Supabase Dashboard → Settings → API');
    console.error('   2. Copy the "service_role" key (not "anon" key)');
    console.error('   3. Update SUPABASE_SERVICE_ROLE_KEY in .env file\n');
    process.exit(1);
  } else {
    console.warn('⚠️ Unknown role:', payload.role);
    console.warn('   Expected: service_role');
  }
  
} catch (error) {
  console.error('❌ Error decoding key:', error.message);
  process.exit(1);
}

