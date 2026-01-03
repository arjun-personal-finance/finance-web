# Using Vercel Free Tier (Hobby Plan)

## How to Use Free Tier

When Vercel asks about Pro trial:

1. **Look for "Hobby" or "Free" option**
   - Vercel should show you plan options
   - Select **"Hobby"** plan (free tier)
   - This is sufficient for personal projects

2. **Skip the Pro Trial**
   - You don't need to start a Pro trial
   - The Hobby plan is free forever
   - Click "Continue with Hobby" or similar option

3. **Hobby Plan Includes:**
   - Unlimited personal projects
   - 100GB bandwidth per month
   - Automatic HTTPS
   - Custom domains
   - Preview deployments
   - More than enough for your web app!

## If You Don't See Hobby Option

If Vercel is only showing Pro trial:

1. **Check your account type:**
   - Make sure you're signing up as an individual, not a team
   - Teams require Pro plan, but individuals can use Hobby

2. **Try this:**
   - Go to [vercel.com/pricing](https://vercel.com/pricing)
   - Look for "Hobby" plan
   - Sign up from there if needed

3. **Alternative: Use a different email**
   - Sometimes the trial prompt appears for certain account types
   - Try signing up with a different email if needed

## Alternative: Deploy to Render (Free Tier)

If Vercel continues to show Pro trial, you can use Render instead:

### Render Free Tier Steps:

1. **Go to [render.com](https://render.com)**
2. **Sign up** (free account)
3. **Create New Web Service**
4. **Connect GitHub** and select `finance-web` repository
5. **Configure:**
   - **Name:** finance-web
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (select this)
6. **Deploy**

Render free tier includes:
- 750 hours/month (enough for 24/7)
- Automatic HTTPS
- Custom domains
- Free SSL certificates

## Alternative: Deploy to Netlify (Free Tier)

1. **Go to [netlify.com](https://netlify.com)**
2. **Sign up** (free)
3. **Add new site** → Import from Git
4. **Select `finance-web` repository**
5. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `.next`
6. **Deploy**

Netlify free tier includes:
- 100GB bandwidth/month
- 300 build minutes/month
- Automatic HTTPS
- Custom domains

## Recommendation

**Try Vercel Hobby plan first** - it's the best for Next.js apps. If you can't access it, Render or Netlify are good alternatives with free tiers.

