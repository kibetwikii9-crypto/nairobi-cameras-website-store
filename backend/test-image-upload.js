/**
 * Test Image Upload to Supabase Storage
 * This script tests the image upload functionality
 */

require('dotenv').config();
const { isSupabaseConfigured, getSupabaseClient } = require('./config/supabase');
const fs = require('fs');
const path = require('path');

async function testImageUpload() {
  console.log('🧪 Testing Image Upload to Supabase Storage\n');
  
  // Check Supabase configuration
  console.log('1️⃣ Checking Supabase configuration...');
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase is not configured!');
    console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    process.exit(1);
  }
  console.log('✅ Supabase is configured\n');
  
  // Check bucket name
  const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';
  console.log('2️⃣ Using storage bucket:', STORAGE_BUCKET);
  
  // Get Supabase client
  const supabase = getSupabaseClient();
  
  // Test bucket access
  console.log('\n3️⃣ Testing bucket access...');
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message);
      process.exit(1);
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      console.error(`❌ Bucket '${STORAGE_BUCKET}' does not exist!`);
      console.error('   Available buckets:', buckets.map(b => b.name).join(', ') || 'none');
      console.error(`\n   Please create a bucket named '${STORAGE_BUCKET}' in Supabase Storage`);
      process.exit(1);
    }
    
    console.log(`✅ Bucket '${STORAGE_BUCKET}' exists`);
  } catch (error) {
    console.error('❌ Error checking bucket:', error.message);
    process.exit(1);
  }
  
  // Create a test image (1x1 pixel PNG)
  console.log('\n4️⃣ Creating test image...');
  const testImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const testFilename = `test-${Date.now()}.png`;
  console.log(`✅ Test image created: ${testFilename}`);
  
  // Upload test image
  console.log('\n5️⃣ Uploading test image to Supabase Storage...');
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(testFilename, testImageBuffer, {
        contentType: 'image/png',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      console.error('   Error details:', uploadError);
      process.exit(1);
    }
    
    console.log('✅ Upload successful:', uploadData.path);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadData.path);
    
    if (!urlData || !urlData.publicUrl) {
      console.error('❌ Failed to get public URL');
      process.exit(1);
    }
    
    console.log('✅ Public URL:', urlData.publicUrl);
    
    // Test URL accessibility
    console.log('\n6️⃣ Testing URL accessibility...');
    try {
      const response = await fetch(urlData.publicUrl);
      if (response.ok) {
        console.log('✅ Image is accessible via public URL');
      } else {
        console.warn('⚠️ Image URL returned status:', response.status);
        console.warn('   The bucket might not be public. Check bucket policies in Supabase.');
      }
    } catch (fetchError) {
      console.warn('⚠️ Could not test URL accessibility:', fetchError.message);
    }
    
    // Clean up - delete test image
    console.log('\n7️⃣ Cleaning up test image...');
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([testFilename]);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test image:', deleteError.message);
    } else {
      console.log('✅ Test image deleted');
    }
    
    console.log('\n✅ All tests passed! Image upload functionality is working correctly.');
    console.log('\n📝 Summary:');
    console.log('   - Supabase is configured');
    console.log(`   - Bucket '${STORAGE_BUCKET}' exists`);
    console.log('   - Upload works');
    console.log('   - Public URL generation works');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testImageUpload().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

