# Deploy to Vercel - Step by Step Guide

## Method 1: Via Vercel Dashboard (Recommended - Easiest)

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"** (recommended - easiest integration)
4. Authorize Vercel to access your GitHub account

### Step 2: Import Your Repository
1. After logging in, you'll see the Vercel dashboard
2. Click **"Add New..."** button (top right)
3. Select **"Project"**
4. You'll see a list of your GitHub repositories
5. Find and click **"finance-web"** repository
6. Click **"Import"**

### Step 3: Configure Project Settings
Vercel will auto-detect Next.js, but verify these settings:

**Framework Preset:** Next.js (should be auto-detected)

**Root Directory:** 
- Since your Next.js app is at the root of the `finance-web` repository, leave this as **"." (default)** or blank
- If you had it in a subfolder, you'd set it to that folder name

**Build and Output Settings:**
- **Build Command:** `npm run build` (default - should be auto-filled)
- **Output Directory:** `.next` (default - should be auto-filled)
- **Install Command:** `npm install` (default - should be auto-filled)

**Environment Variables:**
- Currently, your app doesn't need any environment variables
- If you add any later, you can add them here or in Project Settings

### Step 4: Deploy
1. Review all settings
2. Click **"Deploy"** button
3. Wait for the build to complete (usually 1-2 minutes)

### Step 5: Access Your App
- Once deployment completes, you'll see a success message
- Your app will be live at: `https://finance-web.vercel.app` (or similar)
- You can click the URL to visit your deployed app

### Step 6: Configure Custom Domain (Optional)
1. Go to **Project Settings** → **Domains**
2. Add your custom domain if you have one
3. Follow Vercel's instructions to configure DNS

---

## Method 2: Via Vercel CLI

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
This will open a browser window for authentication.

### Step 3: Navigate to Web App Directory
```bash
cd web-app
```

### Step 4: Deploy
```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No (first time) or Yes (if redeploying)
- **Project name?** → `finance-web` (or press Enter for default)
- **Directory?** → `.` (current directory)
- **Override settings?** → No (unless you need to change something)

### Step 5: Production Deploy
For production deployment:
```bash
vercel --prod
```

---

## Post-Deployment

### Automatic Deployments
- Vercel automatically deploys on every push to the `main` branch
- Each deployment gets a unique URL
- Production deployments use your main domain

### Preview Deployments
- Every pull request gets a preview deployment
- Great for testing before merging

### Viewing Deployments
- Go to your project dashboard on Vercel
- Click on **"Deployments"** tab
- See all deployment history, logs, and status

### Monitoring
- Check deployment logs if something goes wrong
- View analytics and performance metrics
- Set up error tracking if needed

---

## Troubleshooting

### Build Fails
1. Check the build logs in Vercel dashboard
2. Common issues:
   - Node.js version mismatch (Vercel uses Node 18+ by default)
   - Missing dependencies (ensure all are in `package.json`)
   - TypeScript errors (fix before deploying)
   - Environment variables missing

### Fix Node.js Version
If you need a specific Node.js version, create `.nvmrc` file:
```bash
echo "18.17.0" > .nvmrc
```

### Check Build Locally First
Before deploying, test the build:
```bash
cd web-app
npm install
npm run build
npm start
```

### Environment Variables
If you need to add environment variables later:
1. Go to **Project Settings** → **Environment Variables**
2. Add your variables
3. Redeploy (or they'll be added to next deployment)

---

## Quick Reference

**Repository:** `https://github.com/arjun-personal-finance/finance-web.git`  
**Framework:** Next.js 14  
**Build Command:** `npm run build`  
**Output Directory:** `.next`  
**Node Version:** 18+ (auto-detected by Vercel)

---

## Next Steps After Deployment

1. ✅ Test all features on the deployed site
2. ✅ Verify API calls work (check browser console)
3. ✅ Test on mobile devices
4. ✅ Set up custom domain (optional)
5. ✅ Enable analytics (optional)
6. ✅ Set up monitoring/alerts (optional)

Your app is now live! 🎉

