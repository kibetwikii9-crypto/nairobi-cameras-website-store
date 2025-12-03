# Golden Source Technologies - Backend API

A complete backend system for the Golden Source Technologies electronics store with admin panel and product management.

## 🚀 Features

- **RESTful API** with Express.js
- **Supabase Database** (PostgreSQL via HTTPS REST API)
- **JWT Authentication** for secure access
- **Admin Panel** for product and order management
- **Product Management** with image uploads
- **Order Management** system
- **User Management** with roles
- **Analytics Dashboard** with charts
- **File Upload** support for product images

## 📋 Prerequisites

- Node.js (v14 or higher)
- Supabase account (free tier available)
- Git

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the backend directory:
```env
# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=5000
NODE_ENV=development

# File uploads are stored in Supabase Storage (cloud storage only - no local storage)
```

**To get Supabase credentials:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (or use existing)
3. Go to Settings → API
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Database Setup
1. Go to Supabase Dashboard → SQL Editor
2. Run the migration file: `backend/database/supabase-migration-complete.sql`
3. This creates all required tables (products, users, orders)

### 4. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products` - Get all products (with filtering)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)
- `POST /api/products/:id/reviews` - Add product review

### Orders
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status (Admin)
- `GET /api/orders/admin/all` - Get all orders (Admin)

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats
- `GET /api/admin/products` - Get all products (Admin)
- `GET /api/admin/users` - Get all users (Admin)
- `PUT /api/admin/users/:id/role` - Update user role (Admin)
- `GET /api/admin/analytics` - Get analytics data (Admin)

## 🎛️ Admin Panel

Access the admin panel at: `http://localhost:5000/admin`

**Default Admin Credentials:**
- Email: `admin@goldensource.com`
- Password: Set via `ADMIN_PASSWORD` in `.env` (default: `SecureAdmin2024!`)

### Admin Features:
- **Dashboard** - Overview of sales, orders, and users
- **Product Management** - Add, edit, delete products
- **Order Management** - View and update order status
- **User Management** - Manage user roles
- **Analytics** - Sales charts and reports

## 🗄️ Database Models

### User
- name, email, password, role, phone, address, isActive
- Authentication and profile management

### Product
- name, description, price, category, brand, images, specifications
- Stock management and reviews

### Order
- orderNumber, user, items, shippingAddress, status
- Payment and status tracking

## 🔧 Development

### Project Structure
```
backend/
├── config/          # Database configuration (Supabase)
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Authentication middleware
├── server-dev.js    # Development server
├── server-production.js  # Production server
└── package.json     # Dependencies and scripts
```

### Available Scripts
- `npm run dev` - Start development server (with auto-restart)
- `npm start` - Start production server
- `npm run test-supabase` - Test Supabase connection

## 🚀 Deployment

### Render Deployment
1. Push code to GitHub
2. Connect repository to Render
3. Set environment variables in Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `NODE_ENV=production`
4. Deploy

### Environment Variables for Production
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your-production-jwt-secret
NODE_ENV=production
PORT=10000
```

## 📱 Frontend Integration

The backend serves the frontend files and provides API endpoints for:
- Product listing and search
- User authentication
- Shopping cart functionality
- Order processing

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation with express-validator
- CORS protection
- Admin role authorization
- Row Level Security (RLS) in Supabase

## 📊 Analytics

The admin panel includes:
- Sales over time charts
- Category performance
- User statistics
- Revenue tracking
- Order status monitoring

## 🛡️ Error Handling

- Comprehensive error handling middleware
- Validation error responses
- Database connection error handling
- Authentication error handling

## 📞 Support

For issues or questions:
- Check the console logs for error details
- Verify Supabase credentials are set correctly
- Ensure Supabase project is active (not paused)
- Check database tables exist (run migration SQL)
- Verify JWT token validity

## 🎯 Next Steps

1. Set up Supabase project and run migration
2. Configure environment variables
3. Deploy to Render/production environment
4. Set up domain and SSL
5. Configure email notifications
6. Add payment gateway integration

## 💡 Database Information

- **Type:** Supabase (PostgreSQL via HTTPS REST API)
- **Persistence:** Permanent (cloud storage)
- **Backup:** Automatic backups every 5 minutes
- **Location:** Supabase cloud (external database)
