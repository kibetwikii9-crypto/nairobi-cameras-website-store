/**
 * Database Seed Script - Create Admin User
 * Run this script to create the initial admin user
 * 
 * Usage: node backend/database/seed-admin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const { syncDatabase, User } = require('../config/database');

async function seedAdmin() {
  try {
    console.log('🌱 Starting admin user seed...\n');
    
    // Connect to database
    await syncDatabase();
    console.log('✅ Database connected\n');
    
    // Admin user configuration
    const adminEmail = process.env.ADMIN_EMAIL || 'Goldensourcetechnologies@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'golden@2025';
    const adminName = process.env.ADMIN_NAME || 'Admin User';
    
    console.log('📋 Admin Configuration:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Name: ${adminName}`);
    console.log(`   Password: ${'*'.repeat(adminPassword.length)} (hidden)\n`);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('✅ Admin user already exists with admin role');
        console.log(`   User ID: ${existingAdmin.id}`);
        console.log(`   Email: ${existingAdmin.email}`);
        console.log(`   Name: ${existingAdmin.name}`);
        console.log(`   Role: ${existingAdmin.role}\n`);
        
        // Optionally update password if ADMIN_PASSWORD is set
        if (process.env.ADMIN_PASSWORD && existingAdmin.password !== adminPassword) {
          console.log('🔄 Updating admin password...');
          await existingAdmin.update({ password: adminPassword });
          console.log('✅ Admin password updated\n');
        }
        
        console.log('✅ Seed completed - admin user ready');
        return;
      } else {
        console.log('⚠️ User exists but is not an admin');
        console.log('🔄 Updating user to admin role...');
        await existingAdmin.update({ role: 'admin' });
        console.log('✅ User updated to admin role\n');
        console.log('✅ Seed completed - admin user ready');
        return;
      }
    }
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isActive: true
    });
    
    console.log('✅ Admin user created successfully!');
    console.log(`   User ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}\n`);
    
    console.log('✅ Seed completed successfully!');
    console.log('\n📝 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n⚠️ IMPORTANT: Change the default password after first login!\n');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    process.exit(1);
  }
}

// Run the seed
seedAdmin()
  .then(() => {
    console.log('✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });

