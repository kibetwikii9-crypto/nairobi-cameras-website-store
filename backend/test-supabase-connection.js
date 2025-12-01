/**
 * Simple script to test your Supabase connection
 * Run this after setting up your DATABASE_URL in .env
 * 
 * Usage: node test-supabase-connection.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log('🧪 Testing Supabase Connection...\n');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set in your .env file!');
  console.error('');
  console.error('📝 To fix this:');
  console.error('   1. Open backend/.env file');
  console.error('   2. Add this line:');
  console.error('      DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres');
  console.error('   3. Replace YOUR_PASSWORD with your actual Supabase password');
  console.error('   4. Replace xxxxx with your actual Supabase project ID');
  console.error('');
  process.exit(1);
}

// Parse connection string
const databaseUrl = process.env.DATABASE_URL;

// Check if it looks like a valid PostgreSQL connection string
if (!databaseUrl.includes('postgresql://') && !databaseUrl.includes('postgres://')) {
  console.error('❌ ERROR: DATABASE_URL does not look like a valid PostgreSQL connection string!');
  console.error('');
  console.error('📝 It should start with: postgresql://');
  console.error('📝 Current value:', databaseUrl.substring(0, 50) + '...');
  console.error('');
  process.exit(1);
}

// Check if password placeholder is still there
if (databaseUrl.includes('[YOUR-PASSWORD]') || databaseUrl.includes('YOUR_PASSWORD') || databaseUrl.includes('[YOUR_PASSWORD]')) {
  console.error('❌ ERROR: You still have the password placeholder in your DATABASE_URL!');
  console.error('');
  console.error('📝 You need to replace [YOUR-PASSWORD] or [YOUR_PASSWORD] with your actual Supabase password');
  console.error('');
  console.error('📝 Example:');
  console.error('   WRONG: postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres');
  console.error('   RIGHT: postgresql://postgres:MyPassword123@db.xxxxx.supabase.co:5432/postgres');
  console.error('');
  console.error('💡 If your password has special characters (#, @, etc.), they will be URL-encoded automatically');
  console.error('');
  process.exit(1);
}

console.log('✅ DATABASE_URL is set');
console.log('🔗 Connection string format looks correct');
console.log('');

// Show connection info (without password)
const urlParts = databaseUrl.match(/postgresql?:\/\/([^:]+):([^@]+)@(.+)/);
if (urlParts) {
  const hostname = urlParts[3].split('/')[0];
  console.log('📋 Connection Details:');
  console.log('   Hostname:', hostname);
  console.log('   Username:', urlParts[1]);
  console.log('   Password:', urlParts[2].length > 0 ? '✅ Set (URL-encoded)' : '❌ MISSING!');
  console.log('');
  
  // Check if hostname looks correct
  if (!hostname.includes('.supabase.co')) {
    console.error('⚠️  WARNING: Hostname does not look like a Supabase URL!');
    console.error('   Expected: db.xxxxx.supabase.co');
    console.error('   Got:', hostname);
    console.error('');
  }
}

// Try to connect
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Supabase requires SSL
    }
  }
});

(async () => {
  try {
    console.log('🔌 Attempting to connect to Supabase...');
    await sequelize.authenticate();
    console.log('');
    console.log('✅ SUCCESS! Connected to Supabase!');
    console.log('🎉 Your database connection is working!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Your server will now use Supabase automatically');
    console.log('   2. Run: npm start');
    console.log('   3. Your data will persist forever!');
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ CONNECTION FAILED!');
    console.error('');
    console.error('Error details:', error.message);
    console.error('');
    
    // Check for specific error types
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('🔍 DIAGNOSIS: Cannot find Supabase server (DNS lookup failed)');
      console.error('');
      console.error('🔧 MOST LIKELY CAUSES:');
      console.error('   1. ⚠️  Your Supabase project is PAUSED (most common!)');
      console.error('      → Go to https://supabase.com/dashboard');
      console.error('      → Check if project shows "Paused" status');
      console.error('      → Click "Resume" or "Restore" button');
      console.error('      → Wait 1-2 minutes, then try again');
      console.error('');
      console.error('   2. ❌ Connection string has wrong project ID');
      console.error('      → Go to Supabase → Settings → Database');
      console.error('      → Copy the connection string again (fresh copy)');
      console.error('      → Make sure project ID matches');
      console.error('');
      console.error('   3. 🌐 Internet connection issue');
      console.error('      → Check your internet connection');
      console.error('      → Try disabling VPN if you have one');
      console.error('');
    } else if (error.message.includes('password') || error.message.includes('authentication')) {
      console.error('🔍 DIAGNOSIS: Password or authentication issue');
      console.error('');
      console.error('🔧 FIX:');
      console.error('   1. Go to Supabase → Settings → Database');
      console.error('   2. Click "Reset database password"');
      console.error('   3. Save the new password');
      console.error('   4. Update your .env file with the new password');
      console.error('   5. Try again');
      console.error('');
    } else {
      console.error('🔧 GENERAL TROUBLESHOOTING:');
      console.error('   1. Check your DATABASE_URL in .env file');
      console.error('   2. Make sure your password is correct');
      console.error('   3. Make sure you replaced [YOUR-PASSWORD] with your actual password');
      console.error('   4. Check your Supabase project is active (not paused)');
      console.error('   5. Go to Supabase → Settings → Database to verify connection string');
      console.error('');
    }
    
    console.error('📖 For more help, read: SUPABASE_TROUBLESHOOTING.md');
    console.error('');
    process.exit(1);
  }
})();

