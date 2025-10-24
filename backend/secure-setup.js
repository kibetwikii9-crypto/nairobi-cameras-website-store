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
    const envContent = `# Database Configuration (SQLite - file-based)
DATABASE_PATH=./database/golden-source-tech.sqlite

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

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
`;

    const envPath = path.join(__dirname, '.env');
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Secure environment file created');
    console.log('🔑 JWT Secret generated');
    console.log('🔐 Admin password generated');
    console.log('📧 Admin Email: admin@goldensource.com');
    console.log('🔑 Admin Password: ' + envContent.match(/ADMIN_PASSWORD=(.+)/)[1]);
    console.log('\n⚠️  IMPORTANT: Keep these credentials secure!');
    console.log('📁 Environment file saved to: ' + envPath);
}

// Run the setup
createSecureEnv();

