# 🚀 Render Deployment Guide - Nairobi Cameras Website

This guide will walk you through deploying your Nairobi Cameras and Computers website to Render for free testing.

## 📋 Prerequisites

- [Render Account](https://render.com) (free account)
- GitHub account (to host your code)
- Your website code ready

## 🎯 What We're Deploying

- **Frontend**: HTML, CSS, JavaScript e-commerce website
- **Backend**: Node.js + Express API server
- **Database**: SQLite (file-based, no external database needed)
- **Features**: Product browsing, admin panel, shopping cart, search

## 📁 Project Structure

```
nairobi-cameras-website/
├── package.json                 # Root package.json for Render
├── Procfile                     # Render deployment command
├── render.yaml                  # Render configuration
├── backend/
│   ├── package.json            # Backend dependencies
│   ├── server-production.js    # Production server
│   ├── env.production         # Production environment variables
│   └── ...                    # Other backend files
├── index.html                  # Frontend homepage
├── admin/                      # Admin panel
├── css/                        # Stylesheets
├── js/                         # Frontend JavaScript
└── images/                     # Product images
```

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Code

1. **Create a GitHub Repository**
   ```bash
   # Initialize git repository
   git init
   git add .
   git commit -m "Initial commit - Nairobi Cameras Website"
   
   # Create repository on GitHub and push
   git remote add origin https://github.com/your-username/nairobi-cameras-website.git
   git push -u origin main
   ```

### Step 2: Deploy to Render

1. **Go to Render Dashboard**
   - Visit [render.com](https://render.com)
   - Sign up/Login with your GitHub account

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your `nairobi-cameras-website` repository

3. **Configure Deployment Settings**
   ```
   Name: nairobi-cameras-website
   Environment: Node
   Region: Oregon (US West) or Frankfurt (EU)
   Branch: main
   Root Directory: (leave empty)
   Build Command: npm run install-deps
   Start Command: npm start
   ```

4. **Set Environment Variables**
   Click "Advanced" → "Environment Variables" and add:
   ```
   NODE_ENV = production
   PORT = 10000
   JWT_SECRET = your-super-secure-jwt-secret-key
   ADMIN_EMAIL = admin@goldensource.com
   ADMIN_PASSWORD = SecureAdmin2024!
   ALLOWED_ORIGINS = https://your-app-name.onrender.com
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Your website will be available at `https://your-app-name.onrender.com`

## 🔧 Configuration Details

### Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `10000` | Server port (Render assigns this) |
| `JWT_SECRET` | `your-secret-key` | JWT token secret |
| `ADMIN_EMAIL` | `admin@goldensource.com` | Admin login email |
| `ADMIN_PASSWORD` | `SecureAdmin2024!` | Admin password |
| `ALLOWED_ORIGINS` | `https://your-app.onrender.com` | CORS allowed origins |

### File Structure for Render

```
Root Directory: /
├── package.json          # Main package.json
├── Procfile             # Start command
├── render.yaml          # Render config
└── backend/             # Backend code
    ├── package.json     # Backend dependencies
    ├── server-production.js
    └── ...
```

## 🎯 What Happens During Deployment

1. **Build Phase**
   - Render installs Node.js dependencies
   - Runs `npm run install-deps` (installs backend dependencies)
   - Prepares the application

2. **Start Phase**
   - Runs `npm start` (starts the production server)
   - Server starts on assigned port
   - Database initializes with sample data

3. **Runtime**
   - Your website is live and accessible
   - SQLite database persists between deployments
   - Admin panel available at `/admin`

## 🔍 Testing Your Deployment

### 1. Health Check
Visit: `https://your-app-name.onrender.com/api/health`
Should return:
```json
{
  "success": true,
  "message": "Nairobi Cameras API is running",
  "environment": "production"
}
```

### 2. Frontend
Visit: `https://your-app-name.onrender.com`
- Homepage should load
- Product categories should work
- Search functionality should work

### 3. Admin Panel
Visit: `https://your-app-name.onrender.com/admin`
- Login with: `admin@goldensource.com` / `SecureAdmin2024!`
- Should be able to manage products

### 4. API Endpoints
- Products: `https://your-app-name.onrender.com/api/products`
- Search: `https://your-app-name.onrender.com/api/search?q=laptop`
- Health: `https://your-app-name.onrender.com/api/health`

## 🛠️ Troubleshooting

### Common Issues

1. **Build Fails**
   - Check that all dependencies are in `backend/package.json`
   - Ensure Node.js version is compatible (18+)

2. **Server Won't Start**
   - Check environment variables are set
   - Verify PORT is set to 10000
   - Check server logs in Render dashboard

3. **Database Issues**
   - SQLite database is created automatically
   - Sample data is added on first run
   - Database persists between deployments

4. **CORS Errors**
   - Update `ALLOWED_ORIGINS` environment variable
   - Include your Render domain

### Debug Commands

```bash
# Check if server is running
curl https://your-app-name.onrender.com/api/health

# Test products API
curl https://your-app-name.onrender.com/api/products

# Check admin login
curl -X POST https://your-app-name.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@goldensource.com","password":"SecureAdmin2024!"}'
```

## 📊 Render Free Tier Limits

- **750 hours/month** (enough for 24/7 operation)
- **512MB RAM**
- **Automatic sleep** after 15 minutes of inactivity
- **Wake up time**: ~30 seconds when accessed
- **Custom domains** supported
- **SSL certificates** included

## 🔄 Updating Your Deployment

1. **Push changes to GitHub**
   ```bash
   git add .
   git commit -m "Update website"
   git push origin main
   ```

2. **Render auto-deploys**
   - Render detects changes
   - Automatically rebuilds and redeploys
   - Your changes go live in 5-10 minutes

## 🎉 Success!

Your Nairobi Cameras and Computers website is now live on Render!

**Your website URL**: `https://your-app-name.onrender.com`
**Admin panel**: `https://your-app-name.onrender.com/admin`
**API health**: `https://your-app-name.onrender.com/api/health`

## 📞 Support

If you encounter issues:
1. Check Render deployment logs
2. Verify environment variables
3. Test API endpoints
4. Check browser console for errors

## 🔐 Security Notes

- Change default admin password in production
- Use strong JWT secrets
- Consider adding HTTPS redirects
- Monitor for unusual activity

---

**Happy Deploying! 🚀**
