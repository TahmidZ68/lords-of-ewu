# Deployment Guide (GitHub + Vercel + Supabase Cloud)

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial production platform for Lords of EWU"
git branch -M main
git remote add origin https://github.com/<your-org>/lords-of-ewu.git
git push -u origin main
```

Verify `.env` is excluded by `.gitignore` before pushing.

## 2. Deploy to Vercel

1. Log in to [Vercel](https://vercel.com/) and import the GitHub repository.
2. Configure Build Settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variables in **Vercel → Project Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL`
4. Deploy. The included `vercel.json` handles React Router client-side fallback rewrites (`/(.*) -> /index.html`).

## 3. Configure Supabase Auth Redirect URLs

In **Supabase Dashboard → Authentication → URL Configuration**:
- Set **Site URL** to your production Vercel URL (e.g., `https://lordsofewu.vercel.app`).
- Add your production URL and `http://localhost:5173/**` to **Redirect URLs**.

## 4. Update SEO Sitemap

Replace `https://lordsofewu.vercel.app` in `public/sitemap.xml` and `public/robots.txt` with your final custom domain before launch.
