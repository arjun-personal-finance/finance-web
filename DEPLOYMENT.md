# Deployment Guide

This guide covers deploying the Personal Finance web app to various platforms.

## Option 1: Vercel (Recommended - Easiest)

Vercel is made by the creators of Next.js and offers the easiest deployment experience.

### Steps:

1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub (recommended) or email

2. **Install Vercel CLI (Optional - for local testing)**
   ```bash
   npm i -g vercel
   ```

3. **Deploy via Vercel Dashboard**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your GitHub repository
   - Configure project:
     - **Framework Preset**: Next.js (auto-detected)
     - **Root Directory**: `web-app` (important!)
     - **Build Command**: `npm run build` (or `cd web-app && npm run build`)
     - **Output Directory**: `.next` (default)
     - **Install Command**: `npm install` (or `cd web-app && npm install`)
   - Click "Deploy"

4. **Configure Root Directory (Important)**
   Since your Next.js app is in the `web-app` folder:
   - After first deployment, go to Project Settings
   - Go to "General" tab
   - Under "Root Directory", click "Edit"
   - Set it to `web-app`
   - Save and redeploy

5. **Environment Variables (if needed)**
   - Go to Project Settings → Environment Variables
   - Add any required variables (currently none needed)

6. **Your app will be live!**
   - Vercel provides a URL like: `your-app-name.vercel.app`
   - You can add a custom domain later

### Deploy via CLI (Alternative):
```bash
cd web-app
vercel login
vercel
```

---

## Option 2: Render

Render is a good alternative with a free tier.

### Steps:

1. **Create a Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository

3. **Configure Service**
   - **Name**: personal-finance (or your choice)
   - **Environment**: Node
   - **Build Command**: `cd web-app && npm install && npm run build`
   - **Start Command**: `cd web-app && npm start`
   - **Root Directory**: `web-app` (or leave blank and adjust commands)

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - Your app will be available at: `your-app-name.onrender.com`

---

## Option 3: Netlify

### Steps:

1. **Create a Netlify Account**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub

2. **Create New Site**
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository

3. **Configure Build Settings**
   - **Base directory**: `web-app`
   - **Build command**: `npm run build`
   - **Publish directory**: `web-app/.next` (Note: Next.js on Netlify needs special config)
   - **Framework**: Next.js (auto-detected)

4. **For Next.js on Netlify, you may need:**
   - Install `@netlify/plugin-nextjs`:
     ```bash
     cd web-app
     npm install --save-dev @netlify/plugin-nextjs
     ```
   - Create `netlify.toml` in `web-app/`:
     ```toml
     [build]
       command = "npm run build"
       publish = ".next"
     
     [[plugins]]
       package = "@netlify/plugin-nextjs"
     ```

5. **Deploy**
   - Click "Deploy site"
   - Your app will be available at: `your-app-name.netlify.app`

---

## Option 4: Railway

### Steps:

1. **Create a Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Railway will auto-detect Next.js
   - Set **Root Directory** to `web-app`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

4. **Deploy**
   - Railway will automatically deploy
   - Your app will be available at: `your-app-name.up.railway.app`

---

## Pre-Deployment Checklist

Before deploying, make sure:

- [ ] All dependencies are in `package.json`
- [ ] `npm run build` works locally
- [ ] No hardcoded API URLs (use environment variables if needed)
- [ ] CORS is properly configured (if calling external APIs)
- [ ] All environment variables are documented

## Testing Locally Before Deploy

```bash
cd web-app
npm install
npm run build
npm start
```

Visit `http://localhost:3000` to test the production build.

## Post-Deployment

1. **Test all features** on the deployed site
2. **Set up custom domain** (optional)
3. **Enable HTTPS** (usually automatic)
4. **Set up monitoring** (optional)

## Troubleshooting

### Build Fails
- Check Node.js version (should be 18+)
- Ensure all dependencies are in `package.json`
- Check build logs for specific errors

### Root Directory Issues
- Make sure the platform knows your app is in `web-app/` folder
- Adjust build/start commands accordingly

### API Issues
- Ensure backend API URLs are accessible from the deployment platform
- Check CORS settings on your backend

---

## Recommended: Vercel

For Next.js apps, **Vercel is the easiest and most optimized** option. It's free for personal projects and handles:
- Automatic deployments on git push
- Preview deployments for PRs
- Edge network for fast global performance
- Zero configuration needed

