const { Sequelize } = require('sequelize');
const path = require('path');

// Create SQLite database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database/golden-source-tech.sqlite'),
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
    await sequelize.authenticate();
    console.log('✅ SQLite database connection established successfully.');
    
    // Sync all models
    await sequelize.sync({ force: false });
    console.log('✅ Database synchronized successfully.');
    
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
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





