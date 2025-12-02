# 🔧 Supabase Connection Pooling - Fix ENOTFOUND Error

## The Problem
You're getting `ENOTFOUND` error even though your project is active. This might be a network/DNS issue.

## Solution: Use Connection Pooling URL

Supabase offers **Connection Pooling** which is more reliable than direct connections.

### Step 1: Get Connection Pooling URL

1. Go to **Supabase Dashboard** → Your Project
2. Click **Settings** (gear icon ⚙️)
3. Click **Database** in left menu
4. Scroll to **"Connection string"** section
5. Look for **"Connection pooling"** tab or section
6. Select **"Session mode"** or **"Transaction mode"**
7. Copy the connection string

### Step 2: Connection Pooling URL Format

It should look like:
```
postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-xx-region.pooler.supabase.com:6543/postgres
```

**Notice:**
- Uses `pooler.supabase.com` (not `db.xxxxx.supabase.co`)
- Uses port `6543` (not `5432`)
- Has `postgres.xxxxx` format

### Step 3: Update Your .env File

Replace your current `DATABASE_URL` with the pooling URL:

```env
DATABASE_URL=postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-xx-region.pooler.supabase.com:6543/postgres
```

**Important:**
- Replace `YOUR_PASSWORD` with your actual password
- If password has special characters, URL-encode them:
  - `#` becomes `%23`
  - `@` becomes `%40`
  - etc.

### Step 4: Test Connection

```bash
npm run test-supabase
```

---

## Alternative: Use Supabase JS Client (HTTPS REST API)

If connection pooling still doesn't work, we can switch to Supabase JS client which uses HTTPS REST API instead of direct database connection.

**Pros:**
- ✅ Works over HTTPS (no direct DB connection needed)
- ✅ More reliable
- ✅ Works even with network restrictions

**Cons:**
- ⚠️ Requires code changes (rewrite database queries)
- ⚠️ Different API (not Sequelize)

**Would you like me to set this up?** It's a bigger change but more reliable.

---

## Quick Fix Checklist

1. [ ] Get connection pooling URL from Supabase dashboard
2. [ ] Update `.env` file with pooling URL
3. [ ] Test: `npm run test-supabase`
4. [ ] If still fails, consider Supabase JS client approach

---

## Still Having Issues?

If connection pooling doesn't work, the issue might be:
- Network firewall blocking PostgreSQL connections
- DNS resolution issues
- VPN interference

In that case, **Supabase JS client (HTTPS)** is the best solution!



