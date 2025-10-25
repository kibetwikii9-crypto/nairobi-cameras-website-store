# 🔒 Security Setup Guide

This guide will help you secure your Golden Source Technologies application.

## 🚨 Critical Security Issues Fixed

### ✅ Database Security
- Moved sensitive credentials to environment variables
- Added `.gitignore` to prevent credential exposure
- Created secure environment setup script

### ✅ Authentication Security
- Strengthened JWT secret generation
- Added password complexity requirements
- Implemented secure admin password generation

### ✅ API Security
- Added rate limiting to prevent abuse
- Implemented CORS protection
- Added Content Security Policy headers
- Enhanced error handling

## 🛠️ Setup Instructions

### 1. Install Security Dependencies
```bash
cd backend
npm install
```

### 2. Generate Secure Environment
```bash
# Generate secure environment variables
npm run secure-setup
```

### 3. Update Database Credentials
Edit the generated `.env` file and update:
- `MONGODB_URI` with your actual database connection string
- `CLOUDINARY_*` with your cloud storage credentials

### 4. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔐 Security Features Added

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable via environment variables

### CORS Protection
- Whitelist of allowed origins
- Credentials support for authenticated requests

### Content Security Policy
- Prevents XSS attacks
- Restricts resource loading to trusted sources

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, and numbers
- Secure hashing with bcrypt

### Error Handling
- No sensitive information in production errors
- Proper error logging
- Validation error handling

## 🚀 Production Deployment

### Environment Variables Required
```env
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-secure-jwt-secret
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
```

### Security Checklist
- [ ] Update database credentials
- [ ] Generate new JWT secret
- [ ] Configure CORS for your domain
- [ ] Set up SSL/HTTPS
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Regular security updates

## 🔍 Monitoring

### Health Check Endpoint
```
GET /api/health
```

### Security Headers
The application now includes:
- Helmet.js for security headers
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options

## 📞 Support

For security-related questions:
- Email: security@goldensource.com
- Phone: +254 724 369 971

## ⚠️ Important Notes

1. **Never commit `.env` files to version control**
2. **Use strong, unique passwords for all accounts**
3. **Regularly update dependencies**
4. **Monitor application logs for suspicious activity**
5. **Keep your JWT secret secure and rotate it regularly**

---

**Golden Source Technologies** - Secure E-Commerce Platform








