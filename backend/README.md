# Golden Source Technologies - Backend API

A complete backend system for the Golden Source Technologies electronics store with admin panel and product management.

## 🚀 Features

- **RESTful API** with Express.js
- **SQLite Database** with Sequelize ORM
- **JWT Authentication** for secure access
- **Admin Panel** for product and order management
- **Product Management** with image uploads
- **Order Management** system
- **User Management** with roles
- **Analytics Dashboard** with charts
- **File Upload** support for product images

## 📋 Prerequisites

- Node.js (v14 or higher)
- SQLite (file-based database)
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
# Database (SQLite - file-based)
DATABASE_PATH=./database/golden-source-tech.sqlite

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=5000
NODE_ENV=development

# File uploads are stored locally in /images/uploads
```

### 3. Database Setup
```bash
# Run the setup script to create admin user and sample data
npm run setup
```

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
- Password: `admin123`

### Admin Features:
- **Dashboard** - Overview of sales, orders, and users
- **Product Management** - Add, edit, delete products
- **Order Management** - View and update order status
- **User Management** - Manage user roles
- **Analytics** - Sales charts and reports

## 🗄️ Database Models

### User
- name, email, password, role, phone, address
- Authentication and profile management

### Product
- name, description, price, category, brand, images
- Stock management and reviews

### Order
- orderNumber, user, items, shippingAddress
- Payment and status tracking

## 🔧 Development

### Project Structure
```
backend/
├── models/          # Database models
├── routes/           # API routes
├── middleware/       # Authentication middleware
├── server.js         # Main server file
├── setup.js          # Database setup script
└── package.json      # Dependencies and scripts
```

### Available Scripts
- `npm run dev` - Start development server
- `npm start` - Start production server
- `npm run setup` - Initialize database with sample data

## 🚀 Deployment

### Vercel Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the backend directory
3. Set environment variables in Vercel dashboard
4. Deploy: `vercel --prod`

### Environment Variables for Production
```env
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
NODE_ENV=production
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
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
- Verify environment variables are set correctly
- Ensure SQLite database file is accessible
- Check JWT token validity

## 🎯 Next Steps

1. Add optional CDN/distributed storage if needed
2. Deploy to Render/production environment
3. Set up automated backups for SQLite database
4. Set up domain and SSL
5. Configure email notifications
6. Add payment gateway integration
