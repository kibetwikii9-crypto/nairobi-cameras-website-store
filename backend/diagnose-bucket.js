/**
 * Diagnose Supabase Storage Bucket Issues
 * This script checks various possible problems
 */

require('dotenv').config();
const { isSupabaseConfigured, getSupabaseClient } = require('./config/supabase');

async function diagnose() {
  console.log('🔍 Diagnosing Supabase Storage Bucket Issues\n');
  
  // 1. Check Supabase configuration
  console.log('1️⃣ Checking Supabase Configuration...');
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase is not configured!');
    return;
  }
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasAnonKey = !!process.env.SUPABASE_ANON_KEY;
  
  console.log('   ✅ Supabase URL:', supabaseUrl);
  console.log('   ' + (hasServiceKey ? '✅' : '❌') + ' Service Role Key:', hasServiceKey ? 'SET' : 'NOT SET');
  console.log('   ' + (hasAnonKey ? '✅' : '⚠️') + ' Anon Key:', hasAnonKey ? 'SET' : 'NOT SET');
  
  if (!hasServiceKey) {
    console.error('\n❌ SUPABASE_SERVICE_ROLE_KEY is not set!');
    console.error('   The service role key is required for bucket operations.');
    return;
  }
  
  // 2. Check which key is being used
  console.log('\n2️⃣ Checking which key is being used...');
  const supabase = getSupabaseClient();
  const keyUsed = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key' : 'Anon Key';
  console.log('   Using:', keyUsed);
  console.log('   ' + (keyUsed === 'Service Role Key' ? '✅' : '❌') + ' Service Role Key is required for bucket management');
  
  // 3. List all buckets
  console.log('\n3️⃣ Attempting to list buckets...');
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message);
      console.error('   Error code:', listError.statusCode);
      console.error('   Error status:', listError.status);
      console.error('   Full error:', JSON.stringify(listError, null, 2));
      
      if (listError.statusCode === 403 || listError.status === 403) {
        console.error('\n💡 Possible issue: RLS policies or insufficient permissions');
        console.error('   - Check if your service role key has storage admin permissions');
        console.error('   - Verify the key is correct in your .env file');
      }
      return;
    }
    
    console.log('   ✅ Successfully listed buckets');
    console.log('   📦 Total buckets found:', buckets.length);
    
    if (buckets.length === 0) {
      console.log('\n   ⚠️ No buckets found in this project');
      console.log('   💡 Possible reasons:');
      console.log('      - Bucket was created in a different Supabase project');
      console.log('      - Wrong SUPABASE_URL in .env file');
      console.log('      - Bucket was deleted');
    } else {
      console.log('\n   📋 Available buckets:');
      buckets.forEach((bucket, index) => {
        console.log(`      ${index + 1}. "${bucket.name}" (public: ${bucket.public}, created: ${bucket.created_at})`);
      });
    }
    
    // 4. Check for 'images' bucket specifically
    const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';
    console.log(`\n4️⃣ Looking for bucket: "${STORAGE_BUCKET}"`);
    
    const bucketExists = buckets.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (bucketExists) {
      const bucket = buckets.find(b => b.name === STORAGE_BUCKET);
      console.log('   ✅ Bucket found!');
      console.log('   📦 Bucket details:');
      console.log('      - Name:', bucket.name);
      console.log('      - Public:', bucket.public);
      console.log('      - Created:', bucket.created_at);
      
      if (!bucket.public) {
        console.log('\n   ⚠️ WARNING: Bucket is not public!');
        console.log('   💡 To make it public:');
        console.log('      1. Go to Supabase Dashboard → Storage');
        console.log(`      2. Click on bucket "${STORAGE_BUCKET}"`);
        console.log('      3. Go to Settings tab');
        console.log('      4. Enable "Public bucket"');
      }
    } else {
      console.log('   ❌ Bucket not found!');
      console.log('\n   💡 Possible solutions:');
      console.log(`      1. Check if bucket name is exactly "${STORAGE_BUCKET}" (case-sensitive)`);
      console.log('      2. Verify you are looking at the correct Supabase project');
      console.log('      3. Check SUPABASE_URL matches your project URL');
      console.log('      4. Create the bucket in Supabase Dashboard');
      
      // Check for similar bucket names
      const similarBuckets = buckets.filter(b => 
        b.name.toLowerCase().includes('image') || 
        b.name.toLowerCase().includes('img') ||
        b.name.toLowerCase().includes('upload')
      );
      
      if (similarBuckets.length > 0) {
        console.log('\n   💡 Found similar bucket names:');
        similarBuckets.forEach(b => {
          console.log(`      - "${b.name}"`);
        });
        console.log(`   💡 If you meant one of these, set SUPABASE_STORAGE_BUCKET=${similarBuckets[0].name} in .env`);
      }
    }
    
    // 5. Test bucket access
    if (bucketExists) {
      console.log(`\n5️⃣ Testing access to bucket "${STORAGE_BUCKET}"...`);
      try {
        const { data: files, error: listFilesError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .list('', { limit: 1 });
        
        if (listFilesError) {
          console.error('   ❌ Cannot access bucket:', listFilesError.message);
          console.error('   💡 Check bucket policies and RLS settings');
        } else {
          console.log('   ✅ Can access bucket');
          console.log('   📁 Files in bucket:', files.length);
        }
      } catch (error) {
        console.error('   ❌ Error testing bucket access:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  // 6. Environment check
  console.log('\n6️⃣ Environment Variables Check...');
  console.log('   SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET');
  console.log('   SUPABASE_STORAGE_BUCKET:', process.env.SUPABASE_STORAGE_BUCKET || 'images (default)');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', hasServiceKey ? 'SET (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'NOT SET');
  
  console.log('\n✅ Diagnosis complete!');
}

diagnose().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

