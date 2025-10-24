const { Sequelize } = require('sequelize');
const path = require('path');

// Create SQLite database connection with persistent storage
// Use Render's persistent disk for production
const dbDir = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/backend/database'  // Render persistent disk
  : path.join(__dirname, '../database');        // Local development

const dbPath = path.join(dbDir, 'golden-source-tech.sqlite');

// Create database directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 Created database directory:', dbDir);
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
    console.log('📁 Database path:', dbPath);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    
    await sequelize.authenticate();
    console.log('✅ SQLite database connection established successfully.');
    
    // Check if database file exists
    const dbExists = fs.existsSync(dbPath);
    console.log('📊 Database file exists:', dbExists);
    
    // Sync all models (don't force to preserve existing data)
    console.log('🔄 Synchronizing database models...');
    await sequelize.sync({ force: false });
    console.log('✅ Database synchronized successfully.');
    
    // Log current data counts
    const productCount = await Product.count();
    const userCount = await User.count();
    console.log(`📦 Current data: ${productCount} products, ${userCount} users`);
    
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Database path:', dbPath);
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





