// Database backup and restore utility
const fs = require('fs');
const path = require('path');

// Backup database data to JSON file
const backupData = async (sequelize, Product, User, Order) => {
  try {
    console.log('💾 Creating database backup...');
    
    const products = await Product.findAll({ raw: true });
    const users = await User.findAll({ raw: true });
    const orders = await Order.findAll({ raw: true });
    
    const backupData = {
      products,
      users,
      orders,
      timestamp: new Date().toISOString()
    };
    
    const backupPath = path.join(__dirname, 'backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup created: ${products.length} products, ${users.length} users, ${orders.length} orders`);
    return true;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return false;
  }
};

// Restore database data from JSON file
const restoreData = async (sequelize, Product, User, Order) => {
  try {
    const backupPath = path.join(__dirname, 'backup.json');
    
    if (!fs.existsSync(backupPath)) {
      console.log('📄 No backup file found, skipping restore');
      return true;
    }
    
    console.log('🔄 Restoring database from backup...');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    // Check if data already exists
    const existingProducts = await Product.count();
    if (existingProducts > 0) {
      console.log('📦 Data already exists, skipping restore');
      return true;
    }
    
    // Restore data
    if (backupData.products && backupData.products.length > 0) {
      await Product.bulkCreate(backupData.products);
      console.log(`✅ Restored ${backupData.products.length} products`);
    }
    
    if (backupData.users && backupData.users.length > 0) {
      await User.bulkCreate(backupData.users);
      console.log(`✅ Restored ${backupData.users.length} users`);
    }
    
    if (backupData.orders && backupData.orders.length > 0) {
      await Order.bulkCreate(backupData.orders);
      console.log(`✅ Restored ${backupData.orders.length} orders`);
    }
    
    console.log('✅ Database restore completed');
    return true;
  } catch (error) {
    console.error('❌ Restore failed:', error);
    return false;
  }
};

module.exports = { backupData, restoreData };
