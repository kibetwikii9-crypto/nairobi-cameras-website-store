# 🔧 Supabase Connection Troubleshooting

## Error: `getaddrinfo ENOTFOUND db.xxxxx.supabase.co`

This error means your computer cannot find the Supabase database server. Here's how to fix it:

---

## ✅ Step 1: Check Your Supabase Project Status

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Check your project**:
   - Is it showing as "Active" (green)?
   - Or is it "Paused" (gray/orange)?
   
3. **If project is PAUSED:**
   - Free tier projects pause after 1 week of inactivity
   - Click "Restore" or "Resume" button
   - Wait 1-2 minutes for it to wake up
   - Try connecting again

---

## ✅ Step 2: Verify Your Connection String

1. **Go to Supabase Dashboard** → Your Project
2. **Click Settings** (gear icon ⚙️)
3. **Click "Database"** in left menu
4. **Scroll to "Connection string"** section
5. **Copy the connection string again** (fresh copy)

### Important Checks:
- ✅ Does it start with `postgresql://` or `postgres://`?
- ✅ Does it have your actual password (not `[YOUR-PASSWORD]`)?
- ✅ Does the hostname match: `db.xxxxx.supabase.co`?

---

## ✅ Step 3: Check Your .env File

1. **Open** `backend/.env` file
2. **Check your DATABASE_URL line**:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
   ```

### Common Mistakes:
- ❌ Still has `[YOUR-PASSWORD]` instead of actual password
- ❌ Has extra spaces around `=`
- ❌ Has quotes around the connection string (remove them!)
- ❌ Missing `postgresql://` at the start
- ❌ Wrong project ID in the hostname

### Correct Format:
```
DATABASE_URL=postgresql://postgres:MyActualPassword123@db.aufxaqqggdsvenpxheyp.supabase.co:5432/postgres
```

**NO quotes, NO spaces around =, REAL password**

---

## ✅ Step 4: Test Your Connection String Format

Your connection string should look like this:
```
postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres
```

Where:
- `PASSWORD` = Your actual database password
- `PROJECT_ID` = Your Supabase project ID (like `aufxaqqggdsvenpxheyp`)

---

## ✅ Step 5: Verify Project is Active

1. Go to Supabase Dashboard
2. Check if your project shows:
   - ✅ **Green status** = Active
   - ⚠️ **Orange/Gray status** = Paused (click Resume)

3. **If paused:**
   - Free projects pause after 1 week of no activity
   - Click "Resume" or "Restore"
   - Wait 1-2 minutes
   - Try again

---

## ✅ Step 6: Reset Database Password (If Needed)

If you're not sure about your password:

1. Go to Supabase → Settings → Database
2. Scroll to "Database password"
3. Click "Reset database password"
4. **Save the new password!**
5. Update your `.env` file with the new password
6. Try connecting again

---

## ✅ Step 7: Check Internet Connection

The error can also happen if:
- ❌ No internet connection
- ❌ Firewall blocking Supabase
- ❌ VPN interfering

**Try:**
- Disable VPN temporarily
- Check internet connection
- Try from a different network

---

## 🎯 Quick Fix Checklist

Before trying again, make sure:
- [ ] Supabase project is **Active** (not paused)
- [ ] Connection string in `.env` has **real password** (not `[YOUR-PASSWORD]`)
- [ ] Connection string has **no quotes** around it
- [ ] Connection string has **no spaces** around `=`
- [ ] Connection string starts with `postgresql://`
- [ ] Project ID in connection string matches your actual project

---

## 🆘 Still Not Working?

1. **Double-check your connection string**:
   - Copy it fresh from Supabase
   - Make sure password is correct
   - No typos in the hostname

2. **Verify project status**:
   - Is it active?
   - Not paused?
   - Not deleted?

3. **Try resetting password**:
   - Reset in Supabase
   - Update `.env` file
   - Test again

4. **Check Supabase status page**:
   - https://status.supabase.com
   - See if there are any outages

---

## 📝 Example of Correct .env File

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=postgresql://postgres:MyPassword123@db.aufxaqqggdsvenpxheyp.supabase.co:5432/postgres
```

**Notice:**
- No quotes
- No spaces
- Real password
- Correct format

---

## ✅ Once Fixed

After fixing, test again:
```bash
npm run test-supabase
```

You should see: **✅ SUCCESS! Connected to Supabase!**

