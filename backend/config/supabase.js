/**
 * Supabase Client Configuration
 * Uses HTTPS REST API instead of direct PostgreSQL connection
 */

const { createClient } = require('@supabase/supabase-js');

// Check if Supabase credentials are provided
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let isConfigured = false;

if (supabaseUrl && supabaseKey) {
  try {
    // Use service role key for backend (has full access)
    // Use anon key if service role not available (limited access)
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    supabase = createClient(supabaseUrl, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    isConfigured = true;
    console.log('✅ Supabase client initialized (HTTPS REST API)');
    console.log('🔗 Supabase URL:', supabaseUrl);
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
  }
} else {
  console.log('⚠️ Supabase credentials not found');
  console.log('💡 To use Supabase, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

/**
 * Get Supabase client instance
 */
const getSupabaseClient = () => {
  if (!isConfigured) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  }
  return supabase;
};

/**
 * Check if Supabase is configured
 */
const isSupabaseConfigured = () => isConfigured;

module.exports = {
  getSupabaseClient,
  isSupabaseConfigured,
  supabase
};



