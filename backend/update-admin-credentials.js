/**
 * Update Admin Credentials Script
 * Updates the admin user email and password
 */

require('dotenv').config();
const { syncDatabase, User } = require('./config/database');

async function updateAdminCredentials() {
  try {
    console.log('🔐 Updating Admin Credentials\n');
    
    // Connect to database
    await syncDatabase();
    console.log('✅ Database connected\n');
    
    // New admin credentials
    const newEmail = process.env.ADMIN_EMAIL || 'Goldensourcetechnologies@gmail.com';
    const newPassword = process.env.ADMIN_PASSWORD || 'golden@2025';
    
    console.log('📋 New Admin Credentials:');
    console.log(`   Email: ${newEmail}`);
    console.log(`   Password: ${'*'.repeat(newPassword.length)} (hidden)\n`);
    
    // Check if admin with new email exists
    let admin = await User.findOne({ where: { email: newEmail } });
    
    if (admin) {
      // Update existing admin
      console.log('🔄 Updating existing admin user...');
      await User.update({
        email: newEmail,
        password: newPassword,
        role: 'admin',
        isActive: true
      }, {
        where: { id: admin.id }
      });
      console.log('✅ Admin credentials updated successfully!\n');
    } else {
      // Check if there's an admin with old email
      const oldAdmin = await User.findOne({ where: { role: 'admin' } });
      
      if (oldAdmin) {
        // Update old admin email and password
        console.log('🔄 Updating existing admin user email and password...');
        await User.update({
          email: newEmail,
          password: newPassword,
          role: 'admin',
          isActive: true
        }, {
          where: { id: oldAdmin.id }
        });
        console.log('✅ Admin credentials updated successfully!\n');
      } else {
        // Create new admin
        console.log('👤 Creating new admin user...');
        admin = await User.create({
          name: process.env.ADMIN_NAME || 'Admin User',
          email: newEmail,
          password: newPassword,
          role: 'admin',
          phone: process.env.ADMIN_PHONE || '+254 724 369 971',
          isActive: true
        });
        console.log('✅ Admin user created successfully!\n');
      }
    }
    
    console.log('✅ Admin credentials update completed!');
    console.log('\n📝 Login Credentials:');
    console.log(`   Email: ${newEmail}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n⚠️ IMPORTANT: Keep these credentials secure!\n');
    
  } catch (error) {
    console.error('❌ Failed to update admin credentials:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    process.exit(1);
  }
}

// Run the update
updateAdminCredentials()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

