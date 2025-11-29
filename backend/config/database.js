const { Sequelize } = require('sequelize');
const path = require('path');

// Create SQLite database connection with persistent storage
// Use Render's persistent disk for production
const dbDir = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/backend/database'  // Render persistent disk
  : path.join(__dirname, '../database');        // Local development

// Alternative paths for Render persistent disk
const renderPersistentPaths = [
  '/opt/render/project/src/backend/database',
  '/opt/render/project/src/database', 
  '/opt/render/project/database',
  '/opt/render/project/src/backend/database',
  path.join(process.cwd(), 'database'),
  path.join(__dirname, '../database')
];

// Try to find the best database directory
let finalDbDir = dbDir;
let dbPath = path.join(dbDir, 'golden-source-tech.sqlite');

// Create database directory if it doesn't exist
const fs = require('fs');

// CRITICAL: Use a fixed, stable database path to prevent data loss
// In production, try multiple paths to find the best persistent location
if (process.env.NODE_ENV === 'production') {
  console.log('🔍 Searching for best persistent database location...');
  
  // FIRST: Check if database file already exists in any location (CRITICAL FOR DATA PERSISTENCE)
  let existingDbPath = null;
  let existingDbSize = 0;
  for (const testPath of renderPersistentPaths) {
    const testDbPath = path.join(testPath, 'golden-source-tech.sqlite');
    if (fs.existsSync(testDbPath)) {
      const stats = fs.statSync(testDbPath);
      if (stats.size > existingDbSize) {
        existingDbPath = testDbPath;
        existingDbSize = stats.size;
        finalDbDir = testPath;
        dbPath = testDbPath;
        console.log(`✅ Found existing database file: ${testDbPath} (${stats.size} bytes)`);
      }
    }
  }
  
  // If existing database found, use it (CRITICAL: Prevents data loss)
  if (existingDbPath) {
    console.log('🔐 USING EXISTING DATABASE FILE TO PRESERVE DATA');
    console.log('🔐 Database path:', existingDbPath);
    console.log('🔐 Database size:', existingDbSize, 'bytes');
  } else {
    // If no existing database found, find writable location
    console.log('📄 No existing database found, creating new one...');
    for (const testPath of renderPersistentPaths) {
      try {
        if (!fs.existsSync(testPath)) {
          fs.mkdirSync(testPath, { recursive: true });
          console.log('📁 Created directory:', testPath);
        }
        
        // Test if we can write to this directory
        const testFile = path.join(testPath, 'test-write.txt');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        
        finalDbDir = testPath;
        dbPath = path.join(testPath, 'golden-source-tech.sqlite');
        console.log('✅ Found writable persistent directory:', testPath);
        break;
      } catch (error) {
        console.log('❌ Cannot write to:', testPath, error.message);
      }
    }
  }
  
  // If no persistent path worked, fall back to local directory
  if (finalDbDir === dbDir && !existingDbPath) {
    console.log('⚠️ No persistent path found, using fallback directory');
    finalDbDir = path.join(__dirname, '../database');
    dbPath = path.join(finalDbDir, 'golden-source-tech.sqlite');
    if (!fs.existsSync(finalDbDir)) {
      fs.mkdirSync(finalDbDir, { recursive: true });
    }
  }
} else {
  // Local development - use fixed path
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('📁 Created database directory:', dbDir);
  }
}

// CRITICAL: Log the final database path to prevent confusion
console.log('🔐 FINAL DATABASE PATH (CRITICAL FOR DATA PERSISTENCE):', dbPath);
console.log('🔐 DATABASE FILE EXISTS:', fs.existsSync(dbPath));
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log('🔐 DATABASE FILE SIZE:', stats.size, 'bytes');
  console.log('🔐 DATABASE FILE LAST MODIFIED:', stats.mtime);
}

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true
  }
});

// Import models
const User = require('../models/User')(sequelize);
const Product = require('../models/Product')(sequelize);
const Order = require('../models/Order')(sequelize);

// Define associations
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Sync database with backup mechanism
const syncDatabase = async () => {
  try {
    console.log('🔌 Attempting to connect to SQLite database...');
    console.log('📁 Final database directory:', finalDbDir);
    console.log('📁 Database path:', dbPath);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    
    await sequelize.authenticate();
    console.log('✅ SQLite database connection established successfully.');
    
    // Check if database file exists
    const dbExists = fs.existsSync(dbPath);
    console.log('📊 Database file exists:', dbExists);
    
    // Ensure database directory exists
    if (!fs.existsSync(finalDbDir)) {
      fs.mkdirSync(finalDbDir, { recursive: true });
      console.log('📁 Created final database directory:', finalDbDir);
    }
    
    // Sync all models (don't force to preserve existing data)
    console.log('🔄 Synchronizing database models...');
    console.log('⚠️ CRITICAL: Using force: false to preserve all existing data');
    await sequelize.sync({ force: false, alter: false }); // Never force, never alter (preserves data)
    console.log('✅ Database synchronized successfully.');
    
    // Log current data counts
    const productCount = await Product.count();
    const userCount = await User.count();
    console.log(`📦 Current data: ${productCount} products, ${userCount} users`);
    
    // CRITICAL: Log database file path for debugging
    console.log('🔐 DATABASE FILE PATH (CRITICAL FOR DATA PERSISTENCE):', dbPath);
    console.log('🔐 DATABASE FILE EXISTS:', fs.existsSync(dbPath));
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log('🔐 DATABASE FILE SIZE:', stats.size, 'bytes');
      console.log('🔐 DATABASE FILE LAST MODIFIED:', stats.mtime);
    }
    
    // Test database write capability
    try {
      const testProduct = await Product.create({
        name: 'Database Test Product',
        description: 'Test product to verify database write capability',
        price: 0.01,
        category: 'test',
        brand: 'Test',
        stock: 1,
        isActive: false // Mark as inactive so it doesn't show in products
      });
      console.log('✅ Database write test successful');
      // Clean up test product
      await testProduct.destroy();
      console.log('🧹 Test product cleaned up');
    } catch (writeError) {
      console.error('❌ Database write test failed:', writeError);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Database path:', dbPath);
    console.error('❌ Final database directory:', finalDbDir);
    return false;
  }
};

module.exports = {
  sequelize,
  User,
  Product,
  Order,
  syncDatabase
};





