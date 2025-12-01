/**
 * Database Configuration - Supabase Only
 * Uses Supabase JS Client (HTTPS REST API)
 */

const { isSupabaseConfigured, getSupabaseClient } = require('./supabase');
const { SupabaseAdapter, ProductModel, UserModel, OrderModel } = require('./database-supabase');

// Check if Supabase is configured
if (!isSupabaseConfigured()) {
  throw new Error(
    'Supabase is required. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.\n' +
    'Get these from: Supabase Dashboard → Settings → API'
  );
}

console.log('🚀 Using Supabase JS Client (HTTPS REST API)');
console.log('🔗 This uses REST API - no direct database connection needed!');

const supabaseClient = getSupabaseClient();
const adapter = new SupabaseAdapter();

// Create model instances
const Product = new ProductModel(supabaseClient);
const User = new UserModel(supabaseClient);
const Order = new OrderModel(supabaseClient);

// Create a mock sequelize object for compatibility with existing code
const sequelize = {
  authenticate: () => adapter.authenticate(),
  sync: (options) => adapter.sync(options),
  close: () => Promise.resolve(),
  models: { Product, User, Order }
};

const dbType = 'Supabase (HTTPS REST API)';

// Sync database function
const syncDatabase = async () => {
  try {
    console.log('🔌 Attempting to connect to Supabase via HTTPS REST API...');
    await sequelize.authenticate();
    console.log('✅ Supabase connection established via HTTPS REST API!');
    console.log('🎉 Your data is now stored in the cloud and will NEVER disappear!');
    console.log('🔐 Data persistence: PERMANENT (cloud storage)');
    
    // Test connection by getting counts
    const productCount = await Product.count();
    const userCount = await User.count();
    console.log(`📦 Current data: ${productCount} products, ${userCount} users`);
    
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to Supabase:', error);
    console.error('❌ Error details:', error.message);
    console.error('');
    console.error('🔧 TROUBLESHOOTING:');
    console.error('   1. Check SUPABASE_URL in .env file');
    console.error('   2. Check SUPABASE_SERVICE_ROLE_KEY in .env file');
    console.error('   3. Verify your Supabase project is active');
    console.error('   4. Go to Supabase → Settings → API to get your keys');
    console.error('   5. Make sure database tables are created (run supabase-migration-complete.sql)');
    return false;
  }
};

// Get database path (always null for Supabase)
const getDatabasePath = () => null;

// Get database type
const getDatabaseType = () => dbType;

module.exports = {
  sequelize,
  User,
  Product,
  Order,
  syncDatabase,
  getDatabasePath,
  getDatabaseType
};
