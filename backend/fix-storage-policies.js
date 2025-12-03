/**
 * Fix Supabase Storage RLS Policies
 * This script helps diagnose and provides instructions to fix RLS policies
 */

require('dotenv').config();
const { getSupabaseClient, isSupabaseConfigured } = require('./config/supabase');

async function diagnoseAndFix() {
  console.log('🔧 Diagnosing Supabase Storage RLS Policies\n');
  
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase is not configured');
    return;
  }
  
  const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';
  const supabase = getSupabaseClient();
  
  console.log(`📦 Checking bucket: ${STORAGE_BUCKET}\n`);
  
  // Try to upload a test file to see the exact error
  console.log('1️⃣ Testing upload permissions...');
  const testBuffer = Buffer.from('test');
  const testFilename = `test-rls-${Date.now()}.txt`;
  
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(testFilename, testBuffer, {
        contentType: 'text/plain',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Upload failed:', error.message);
      console.error('   Error code:', error.statusCode);
      
      if (error.message.includes('row-level security') || error.message.includes('RLS')) {
        console.log('\n🔍 ISSUE IDENTIFIED: Row-Level Security (RLS) Policy Problem\n');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('SOLUTION: Create Storage Policies in Supabase Dashboard\n');
        console.log('Follow these steps:\n');
        console.log('1️⃣ Go to Supabase Dashboard:');
        console.log('   https://app.supabase.com\n');
        console.log('2️⃣ Select your project\n');
        console.log('3️⃣ Go to Storage → Click on bucket "' + STORAGE_BUCKET + '"\n');
        console.log('4️⃣ Go to "Policies" tab\n');
        console.log('5️⃣ Click "New Policy" → "For full customization"\n');
        console.log('\n6️⃣ Create Policy 1: INSERT (Upload)\n');
        console.log('   Policy name: Allow authenticated uploads');
        console.log('   Allowed operation: INSERT');
        console.log('   Policy definition:');
        console.log('   ```sql');
        console.log('   (bucket_id = \'' + STORAGE_BUCKET + '\')');
        console.log('   ```');
        console.log('   Target roles: authenticated, service_role\n');
        console.log('7️⃣ Create Policy 2: SELECT (Read)\n');
        console.log('   Policy name: Public read access');
        console.log('   Allowed operation: SELECT');
        console.log('   Policy definition:');
        console.log('   ```sql');
        console.log('   (bucket_id = \'' + STORAGE_BUCKET + '\')');
        console.log('   ```');
        console.log('   Target roles: public, anon\n');
        console.log('8️⃣ Create Policy 3: UPDATE (if needed)\n');
        console.log('   Policy name: Allow authenticated updates');
        console.log('   Allowed operation: UPDATE');
        console.log('   Policy definition:');
        console.log('   ```sql');
        console.log('   (bucket_id = \'' + STORAGE_BUCKET + '\')');
        console.log('   ```');
        console.log('   Target roles: authenticated, service_role\n');
        console.log('9️⃣ Create Policy 4: DELETE (if needed)\n');
        console.log('   Policy name: Allow authenticated deletes');
        console.log('   Allowed operation: DELETE');
        console.log('   Policy definition:');
        console.log('   ```sql');
        console.log('   (bucket_id = \'' + STORAGE_BUCKET + '\')');
        console.log('   ```');
        console.log('   Target roles: authenticated, service_role\n');
        console.log('🔟 Click "Save" for each policy\n');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('ALTERNATIVE: Use SQL Editor\n');
        console.log('You can also run this SQL in the SQL Editor:\n');
        console.log('```sql');
        console.log('-- Allow service_role to upload');
        console.log('CREATE POLICY "Allow service_role uploads" ON storage.objects');
        console.log('FOR INSERT TO service_role');
        console.log('WITH CHECK (bucket_id = \'' + STORAGE_BUCKET + '\');');
        console.log('');
        console.log('-- Allow public to read');
        console.log('CREATE POLICY "Allow public reads" ON storage.objects');
        console.log('FOR SELECT TO public');
        console.log('USING (bucket_id = \'' + STORAGE_BUCKET + '\');');
        console.log('```\n');
        console.log('═══════════════════════════════════════════════════════════\n');
      } else {
        console.error('\n❌ Different error - check Supabase configuration');
      }
    } else {
      console.log('✅ Upload successful! RLS policies are working correctly.');
      console.log('   File uploaded:', data.path);
      
      // Clean up
      await supabase.storage.from(STORAGE_BUCKET).remove([testFilename]);
      console.log('✅ Test file cleaned up');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

diagnoseAndFix().catch(console.error);
