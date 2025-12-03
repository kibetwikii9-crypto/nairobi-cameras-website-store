/**
 * Verify Supabase Project and Help Find the Bucket
 */

require('dotenv').config();
const { getSupabaseClient } = require('./config/supabase');

async function verify() {
  console.log('🔍 Verifying Supabase Project Connection\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  console.log('📋 Current Configuration:');
  console.log('   SUPABASE_URL:', supabaseUrl);
  console.log('   Project ID:', supabaseUrl ? supabaseUrl.split('//')[1]?.split('.')[0] : 'N/A');
  console.log('');
  
  console.log('💡 To verify the bucket exists:');
  console.log('   1. Go to: https://app.supabase.com');
  console.log('   2. Select your project');
  console.log('   3. Check the project URL in the settings');
  console.log('   4. Compare it with your SUPABASE_URL');
  console.log('');
  console.log('   Your SUPABASE_URL should match:');
  console.log('   https://[PROJECT_ID].supabase.co');
  console.log('');
  console.log('   5. Go to Storage → Check if "images" bucket exists');
  console.log('   6. If bucket exists but has a different name, set:');
  console.log('      SUPABASE_STORAGE_BUCKET=your-bucket-name');
  console.log('');
  
  // Try to get project info
  try {
    const supabase = getSupabaseClient();
    
    // Try to list buckets with detailed error
    console.log('🔍 Attempting to list buckets...\n');
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Error listing buckets:', error.message);
      console.error('   Status:', error.status);
      console.error('   Code:', error.statusCode);
      console.log('');
      console.log('💡 Possible issues:');
      console.log('   - Wrong SUPABASE_URL (check project URL in dashboard)');
      console.log('   - Wrong SUPABASE_SERVICE_ROLE_KEY (check in dashboard → Settings → API)');
      console.log('   - Service role key doesn\'t have storage permissions');
      return;
    }
    
    console.log(`✅ Found ${buckets.length} bucket(s) in this project:\n`);
    
    if (buckets.length === 0) {
      console.log('   ⚠️ No buckets found!');
      console.log('');
      console.log('💡 The bucket might be in a different project.');
      console.log('   Steps to fix:');
      console.log('   1. Check which Supabase project has the "images" bucket');
      console.log('   2. Update SUPABASE_URL in .env to match that project');
      console.log('   3. Update SUPABASE_SERVICE_ROLE_KEY to match that project');
      return;
    }
    
    buckets.forEach((bucket, i) => {
      console.log(`   ${i + 1}. "${bucket.name}"`);
      console.log(`      - Public: ${bucket.public ? '✅ Yes' : '❌ No'}`);
      console.log(`      - Created: ${bucket.created_at}`);
      console.log('');
    });
    
    const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';
    const found = buckets.find(b => b.name === STORAGE_BUCKET);
    
    if (found) {
      console.log(`✅ Bucket "${STORAGE_BUCKET}" found!`);
      if (!found.public) {
        console.log('   ⚠️ But it\'s not public - make it public in dashboard');
      }
    } else {
      console.log(`❌ Bucket "${STORAGE_BUCKET}" not found in this project`);
      console.log('');
      console.log('💡 Options:');
      console.log(`   1. Create bucket "${STORAGE_BUCKET}" in this project`);
      console.log(`   2. Use existing bucket by setting SUPABASE_STORAGE_BUCKET=${buckets[0].name}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verify().catch(console.error);

