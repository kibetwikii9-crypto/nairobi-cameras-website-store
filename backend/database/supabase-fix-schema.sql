-- Fix Supabase schema to match Sequelize models
-- Run this in Supabase SQL Editor

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(255),
ADD COLUMN IF NOT EXISTS address JSONB,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- Add missing columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sku VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rating JSONB DEFAULT '{"average": 0, "count": 0}'::jsonb;

-- Create index on sku if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;

-- Verify the changes
SELECT 'Users table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

SELECT 'Products table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;





