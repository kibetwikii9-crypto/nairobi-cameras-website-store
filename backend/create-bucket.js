/**
 * Create Supabase Storage Bucket
 * This script helps create the required storage bucket
 */

require('dotenv').config();
const { isSupabaseConfigured, getSupabaseClient } = require('./config/supabase');

async function createBucket() {
  console.log('📦 Creating Supabase Storage Bucket\n');
  
  // Check Supabase configuration
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase is not configured!');
    console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    process.exit(1);
  }
  
  const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';
  console.log(`📦 Bucket name: ${STORAGE_BUCKET}\n`);
  
  const supabase = getSupabaseClient();
  
  // Check if bucket already exists
  console.log('1️⃣ Checking if bucket exists...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Failed to list buckets:', listError.message);
    process.exit(1);
  }
  
  const bucketExists = buckets.some(bucket => bucket.name === STORAGE_BUCKET);
  
  if (bucketExists) {
    console.log(`✅ Bucket '${STORAGE_BUCKET}' already exists!`);
    console.log('\n📝 To make it public:');
    console.log('   1. Go to Supabase Dashboard → Storage');
    console.log(`   2. Click on bucket '${STORAGE_BUCKET}'`);
    console.log('   3. Go to Settings tab');
    console.log('   4. Enable "Public bucket"');
    console.log('   5. Go to Policies tab and add a public read policy');
    return;
  }
  
  // Create bucket
  console.log('2️⃣ Creating bucket...');
  const { data: bucketData, error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  });
  
  if (createError) {
    console.error('❌ Failed to create bucket:', createError.message);
    console.error('   Error details:', createError);
    console.log('\n💡 You may need to create it manually in Supabase Dashboard:');
    console.log('   1. Go to https://app.supabase.com');
    console.log('   2. Select your project');
    console.log('   3. Go to Storage → New bucket');
    console.log(`   4. Name: ${STORAGE_BUCKET}`);
    console.log('   5. Public: YES');
    process.exit(1);
  }
  
  console.log('✅ Bucket created successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Go to Supabase Dashboard → Storage');
  console.log(`   2. Click on bucket '${STORAGE_BUCKET}'`);
  console.log('   3. Go to Policies tab');
  console.log('   4. Add a public read policy if needed');
  console.log('\n✅ You can now upload images!');
}

createBucket().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

