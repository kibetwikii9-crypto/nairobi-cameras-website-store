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
    
    console.log(`📊 Backup data: ${products.length} products, ${users.length} users, ${orders.length} orders`);
    
    const backupData = {
      products,
      users,
      orders,
      timestamp: new Date().toISOString(),
      productCount: products.length,
      userCount: users.length,
      orderCount: orders.length
    };
    
    const backupPath = path.join(__dirname, 'backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    // Verify backup was created
    if (fs.existsSync(backupPath)) {
      const stats = fs.statSync(backupPath);
      console.log(`✅ Backup created successfully: ${backupPath} (${stats.size} bytes)`);
      console.log(`✅ Backup contains: ${products.length} products, ${users.length} users, ${orders.length} orders`);
    } else {
      console.error('❌ Backup file was not created!');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    console.error('❌ Backup error details:', error.message);
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
    console.log(`📊 Products in backup: ${backupData.products ? backupData.products.length : 0}`);
    
    // CRITICAL: Only restore if database is empty AND backup exists
    // This prevents overwriting existing products
    if (existingProducts === 0 && backupData.products && backupData.products.length > 0) {
      console.log(`🔄 Database is empty - Restoring ${backupData.products.length} products from backup...`);
      try {
        // Use bulkCreate with ignoreDuplicates to prevent errors
        await Product.bulkCreate(backupData.products, {
          ignoreDuplicates: true,
          validate: true
        });
        const restoredCount = await Product.count();
        console.log(`✅ Restored ${restoredCount} products from backup`);
      } catch (restoreError) {
        console.error('❌ Error during restore:', restoreError);
        console.log('⚠️ Attempting individual product restore...');
        // Fallback: restore one by one
        let successCount = 0;
        for (const product of backupData.products) {
          try {
            await Product.create(product);
            successCount++;
          } catch (err) {
            console.error(`❌ Failed to restore product ${product.id || product.name}:`, err.message);
          }
        }
        console.log(`✅ Restored ${successCount} of ${backupData.products.length} products`);
      }
    } else if (existingProducts > 0) {
      console.log(`📦 ${existingProducts} products already exist in database - preserving existing data (NOT restoring from backup)`);
      console.log('✅ Your products are safe - backup restore skipped to prevent data loss');
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
