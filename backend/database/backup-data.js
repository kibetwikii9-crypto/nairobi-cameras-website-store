// Database backup and restore utility
const fs = require('fs');
const path = require('path');

// Enhanced backup with automatic scheduling
const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let backupInterval = null;

// Backup database data to JSON file
const backupData = async (Product, User, Order) => {
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
const restoreData = async (Product, User, Order) => {
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
    console.log(`📊 Current products in database: ${existingProducts}`);
    
    // Only restore if we have backup data and no existing products
    if (existingProducts === 0 && backupData.products && backupData.products.length > 0) {
      console.log(`🔄 Restoring ${backupData.products.length} products from backup...`);
      await Product.bulkCreate(backupData.products);
      console.log(`✅ Restored ${backupData.products.length} products`);
    } else if (existingProducts > 0) {
      console.log('📦 Products already exist, skipping restore');
    } else {
      console.log('📄 No products in backup to restore');
    }
    
    // Restore users if needed
    const existingUsers = await User.count();
    if (existingUsers === 0 && backupData.users && backupData.users.length > 0) {
      console.log(`🔄 Restoring ${backupData.users.length} users from backup...`);
      await User.bulkCreate(backupData.users);
      console.log(`✅ Restored ${backupData.users.length} users`);
    }
    
    // Restore orders if needed
    const existingOrders = await Order.count();
    if (existingOrders === 0 && backupData.orders && backupData.orders.length > 0) {
      console.log(`🔄 Restoring ${backupData.orders.length} orders from backup...`);
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

// Start automatic backup system
const startAutoBackup = (Product, User, Order) => {
  if (backupInterval) {
    clearInterval(backupInterval);
  }
  
  console.log('🔄 Starting automatic backup system...');
  backupInterval = setInterval(async () => {
    try {
      await backupData(Product, User, Order);
      console.log('✅ Automatic backup completed');
    } catch (error) {
      console.error('❌ Automatic backup failed:', error);
    }
  }, BACKUP_INTERVAL);
  
  console.log(`⏰ Automatic backup scheduled every ${BACKUP_INTERVAL / 1000} seconds`);
};

// Stop automatic backup system
const stopAutoBackup = () => {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    console.log('🛑 Automatic backup system stopped');
  }
};

module.exports = { backupData, restoreData, startAutoBackup, stopAutoBackup };
