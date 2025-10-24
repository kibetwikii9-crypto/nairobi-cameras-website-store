const { Sequelize } = require('sequelize');
const path = require('path');

// Create SQLite database connection
// Ensure database directory exists
const dbDir = path.join(__dirname, '../database');
const dbPath = path.join(dbDir, 'golden-source-tech.sqlite');

// Create database directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
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

// Sync database
const syncDatabase = async () => {
  try {
    console.log('🔌 Attempting to connect to SQLite database...');
    console.log('📁 Database path:', dbPath);
    
    await sequelize.authenticate();
    console.log('✅ SQLite database connection established successfully.');
    
    // Sync all models
    console.log('🔄 Synchronizing database models...');
    await sequelize.sync({ force: false });
    console.log('✅ Database synchronized successfully.');
    
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





