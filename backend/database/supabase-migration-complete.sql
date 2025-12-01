-- Supabase Database Migration - COMPLETE VERSION
-- Run this entire file in Supabase SQL Editor
-- This creates all tables with correct column names

-- Drop existing tables if they exist (WARNING: This deletes data!)
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create Products table (with quoted camelCase columns)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    "originalPrice" DECIMAL(10, 2),
    category VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    stock INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "isFeatured" BOOLEAN DEFAULT false,
    images JSONB DEFAULT '[]'::jsonb,
    specifications JSONB DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER REFERENCES users(id),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    "shippingAddress" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_isActive ON products("isActive");
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_userId ON orders("userId");

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role full access
-- Drop policies if they exist first, then create them
DROP POLICY IF EXISTS "Service role full access on products" ON products;
CREATE POLICY "Service role full access on products"
    ON products FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on users" ON users;
CREATE POLICY "Service role full access on users"
    ON users FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on orders" ON orders;
CREATE POLICY "Service role full access on orders"
    ON orders FOR ALL
    USING (true)
    WITH CHECK (true);

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Database migration completed successfully!';
    RAISE NOTICE '📦 Tables created: products, users, orders';
    RAISE NOTICE '🔐 Row Level Security enabled';
    RAISE NOTICE '📊 Indexes created for better performance';
END $$;

