const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate secure random strings
function generateSecureString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// Generate secure JWT secret
function generateJWTSecret() {
    return 'GST_' + generateSecureString(24) + '_' + Date.now();
}

// Generate secure admin password
function generateAdminPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Create secure environment file
function createSecureEnv() {
    const envContent = `# Supabase Configuration (REQUIRED)
# Get these from: Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Configuration - SECURE RANDOM STRING
JWT_SECRET=${generateJWTSecret()}

# Server Configuration
PORT=5000
NODE_ENV=development

# Security Configuration
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=7d

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000,http://127.0.0.1:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Configuration
ADMIN_EMAIL=admin@goldensource.com
ADMIN_PASSWORD=${generateAdminPassword()}
ADMIN_PHONE=+254 724 369 971

# Contact Information
CONTACT_PHONE=+254 724 369 971
CONTACT_EMAIL=info@goldensource.com
`;

    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
        console.log('⚠️  .env file already exists!');
        console.log('📝 Please update it manually with the generated values above.');
        console.log('');
        console.log('Generated values:');
        console.log('JWT_SECRET:', generateJWTSecret());
        console.log('ADMIN_PASSWORD:', generateAdminPassword());
    } else {
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Secure .env file created!');
        console.log('📝 IMPORTANT: Update SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY with your Supabase credentials');
        console.log('📝 Get them from: Supabase Dashboard → Settings → API');
    }
}

// Run setup
console.log('🔐 Secure Setup for Golden Source Technologies Backend');
console.log('');
createSecureEnv();
console.log('');
console.log('📋 Next steps:');
console.log('   1. Update SUPABASE_URL in .env file');
console.log('   2. Update SUPABASE_SERVICE_ROLE_KEY in .env file');
console.log('   3. Run database migration: backend/database/supabase-migration-complete.sql');
console.log('   4. Start server: npm run dev');
