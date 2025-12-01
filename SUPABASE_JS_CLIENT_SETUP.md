# 🚀 Supabase JS Client Setup (HTTPS REST API)

## What Changed

We've switched from direct PostgreSQL connection to **Supabase JS Client** which uses **HTTPS REST API**. This is more reliable and works even with network restrictions!

---

## Step 1: Get Your Supabase Credentials

1. Go to **Supabase Dashboard** → Your Project
2. Click **Settings** (gear icon ⚙️)
3. Click **API** in left menu
4. You'll see two important values:

### a) Project URL
- Label: **"Project URL"** or **"API URL"**
- Example: `https://aufxaqqggdsvenpxheyp.supabase.co`
- Copy this value

### b) Service Role Key (IMPORTANT!)
- Label: **"service_role"** key (NOT anon key!)
- This is a long string starting with `eyJ...`
- **⚠️ Keep this secret!** It has full database access
- Copy this value

---

## Step 2: Update Your .env File

Open `backend/.env` and add these two lines:

```env
SUPABASE_URL=https://aufxaqqggdsvenpxheyp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**
- Replace `https://aufxaqqggdsvenpxheyp.supabase.co` with YOUR actual Project URL
- Replace `eyJ...` with YOUR actual Service Role Key
- **Remove or comment out** the old `DATABASE_URL` line (we don't need it anymore)

---

## Step 3: Install Package

```bash
cd backend
npm install @supabase/supabase-js
```

---

## Step 4: Test Connection

```bash
npm start
```

Look for:
- ✅ `🚀 Using Supabase JS Client (HTTPS REST API)`
- ✅ `✅ Supabase connection established via HTTPS REST API!`
- ✅ `🎉 Your data is now stored in the cloud and will NEVER disappear!`

---

## How It Works Now

### Before (Direct PostgreSQL):
- ❌ Required direct database connection
- ❌ Could fail with network/DNS issues
- ❌ Needed PostgreSQL connection string

### After (Supabase JS Client):
- ✅ Uses HTTPS REST API (like a web browser)
- ✅ Works through firewalls
- ✅ No direct database connection needed
- ✅ More reliable

---

## Database Tables

**Important:** You need to create the database tables in Supabase first!

### Option 1: Use Supabase Dashboard (Easiest)

1. Go to Supabase → **Table Editor**
2. Create tables: `products`, `users`, `orders`
3. Add columns based on your models

### Option 2: Use SQL (Recommended)

I'll create a SQL migration file for you to run in Supabase SQL Editor.

---

## Troubleshooting

### Error: "Supabase is not configured"
- Check `SUPABASE_URL` is set in `.env`
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
- Make sure you're using **Service Role Key** (not anon key)

### Error: "Table does not exist"
- You need to create tables first
- Use Supabase Dashboard → Table Editor
- Or run SQL migrations

### Error: "Invalid API key"
- Make sure you copied the **Service Role Key** (not anon key)
- Service Role Key starts with `eyJ` and is very long
- Check for extra spaces in `.env` file

---

## Next Steps

1. ✅ Get your Supabase credentials
2. ✅ Add to `.env` file
3. ✅ Install package: `npm install @supabase/supabase-js`
4. ✅ Create database tables (I'll help with this)
5. ✅ Test: `npm start`

---

## Benefits

- ✅ **No more ENOTFOUND errors** - Uses HTTPS like a website
- ✅ **Works through firewalls** - Standard HTTPS traffic
- ✅ **More reliable** - REST API is more stable
- ✅ **Easier to debug** - Standard HTTP requests
- ✅ **Data persists forever** - Cloud storage

---

**Ready to set up? Follow the steps above!** 🚀

