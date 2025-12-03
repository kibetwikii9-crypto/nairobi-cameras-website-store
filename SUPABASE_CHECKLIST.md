# ✅ Supabase Setup Checklist

Follow these steps in order. Check each box as you complete it!

## 📋 STEP 1: Create Supabase Account
- [ ] Go to https://supabase.com
- [ ] Click "Start your project"
- [ ] Sign up with GitHub, Google, or email
- [ ] Verify your email address
- [ ] You're logged in! ✅

## 📋 STEP 2: Create Your Project
- [ ] Click "New Project" button
- [ ] Create or select an organization
- [ ] Project name: `nairobi-cameras` (or your choice)
- [ ] **CREATE A STRONG PASSWORD** (write it down!)
- [ ] Select region (closest to you)
- [ ] Select "Free" pricing plan
- [ ] Click "Create new project"
- [ ] Wait 2-3 minutes for setup ✅

## 📋 STEP 3: Get Connection String
- [ ] Click on your project name
- [ ] Go to Settings (gear icon ⚙️)
- [ ] Click "Database" in left menu
- [ ] Scroll to "Connection string" section
- [ ] Click "Copy" button
- [ ] **SAVE THIS STRING** - you'll need it! ✅

## 📋 STEP 4: Update Your .env File
- [ ] Open `backend/.env` file (create it if it doesn't exist)
- [ ] Add this line:
  ```
  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
  ```
- [ ] Replace `YOUR_PASSWORD` with your actual password
- [ ] Replace `xxxxx` with your actual project ID
- [ ] Save the file ✅

## 📋 STEP 5: Install PostgreSQL Package
- [ ] Open terminal/command prompt
- [ ] Navigate to backend folder: `cd backend`
- [ ] Run: `npm install pg`
- [ ] Wait for installation to finish ✅

## 📋 STEP 6: Test Connection
- [ ] In terminal, run: `npm start`
- [ ] Look for: "✅ Supabase PostgreSQL database connection established successfully!"
- [ ] Look for: "🎉 Your data is now stored in the cloud and will NEVER disappear!"
- [ ] If you see errors, check your DATABASE_URL in .env ✅

## 🎉 DONE!
- [ ] Your website is now using Supabase!
- [ ] Your data will NEVER disappear again!
- [ ] You can restart your server and data will persist!

---

## 🆘 Having Problems?

### Error: "Connection refused"
- Check your DATABASE_URL in .env
- Make sure password is correct
- Make sure you replaced [YOUR-PASSWORD]

### Error: "Invalid password"
- Go to Supabase → Settings → Database
- Reset your database password
- Update .env file with new password

### Error: "Cannot find module 'pg'"
- Make sure you ran `npm install pg` in the backend folder
- Check you're in the correct folder

---

**Once all boxes are checked, you're ready to go!** 🚀





