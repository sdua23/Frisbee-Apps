# Deploy to the Web — Access From Anywhere

This app is **100% client-side** (no database, no server, no API). That means you can host it as static files on any free static host and access it from your Android phone anywhere in the world — no need to run `npm run dev` on your computer.

After deploying, you'll get a public HTTPS URL like `https://your-play.vercel.app`. Open it in Chrome on your phone, then tap ⋮ → "Install app" to add it to your home screen for a native-app feel.

---

## Option A: Vercel (recommended, easiest)

Vercel is the company that makes Next.js, so it has the best compatibility. Free forever for personal projects. Auto-HTTPS, global CDN, instant deploys.

### Deploy from your computer (no GitHub needed)

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. In your project folder, run:
   ```bash
   npm run build         # produces /out directory
   cd out
   vercel deploy --prod
   ```

3. The first time, it'll ask you to log in (email or GitHub) and confirm a project name. After that, you'll get a URL like `https://frisbee-play-designer-abc123.vercel.app` — open it on your phone.

### Deploy from GitHub (auto-deploys on every git push)

1. Push your project to a GitHub repo (public or private)
2. Go to [vercel.com](https://vercel.com) → log in with GitHub
3. Click "Add New" → "Project" → import your repo
4. Vercel auto-detects Next.js. Just click "Deploy".
5. Get a URL like `https://your-repo-name.vercel.app`
6. Any future `git push` triggers an automatic redeploy

---

## Option B: Netlify Drop (drag & drop, no account setup hassle)

Fastest way to get something online — literally drag a folder.

1. Build the static site:
   ```bash
   npm run build
   ```
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the `out/` folder onto the page
4. Get a URL like `https://random-name-xyz.netlify.app` instantly

For a more permanent setup with auto-deploy from git:
1. Push to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → "Add new site" → "Import from Git"
3. Build command: `npm run build`
4. Publish directory: `out`
5. Deploy

---

## Option C: Cloudflare Pages (most generous free tier)

Unlimited bandwidth, unlimited requests on the free plan. Good if you expect heavy traffic.

1. Push to GitHub
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → "Create a project" → "Connect to Git"
3. Build command: `npm run build`
4. Build output directory: `out`
5. Deploy
6. Get a URL like `https://your-project.pages.dev`

---

## Option D: GitHub Pages (free, lives in your repo)

Good if you already use GitHub. The site will be at `https://your-username.github.io/your-repo-name`.

1. Build: `npm run build`
2. The `out/` directory contains the static site
3. Push the contents of `out/` to a branch called `gh-pages` in your repo:
   ```bash
   npm run build
   cd out
   git init
   git add -A
   git commit -m "Deploy static site"
   git branch -M gh-pages
   git remote add origin https://github.com/your-username/your-repo.git
   git push -f origin gh-pages
   ```
4. In your GitHub repo: Settings → Pages → Source → select the `gh-pages` branch → Save
5. Wait 1-2 minutes for the GitHub Actions to build. Your site will be at `https://your-username.github.io/your-repo-name/`

> **Note:** GitHub Pages serves from a subdirectory (`/your-repo-name/`), so if you use this option, you also need to set `basePath: '/your-repo-name'` in `next.config.ts` before building. Vercel/Netlify/Cloudflare don't need this — they serve from the root.

---

## Option E: Self-host on any static file server

Since it's just static files, you can host it on:
- An S3 bucket (enable static website hosting)
- Any web server (nginx, Apache, Caddy) pointing at the `out/` directory
- A USB stick + any computer on the internet
- Your home router if it has a USB port and web server
- An old phone running a static file server app

Just copy the contents of `out/` to your server's web root. That's it.

---

## Install as an App on Android (PWA)

Once you have a public HTTPS URL (all the options above give you this for free):

1. Open the URL in **Chrome** on your Android phone
2. Tap the **⋮** menu (top-right)
3. Tap **"Install app"** (or "Add to Home screen")
4. Confirm — the app appears on your home screen with the frisbee icon
5. Launch it from your home screen — it runs full-screen with no browser chrome, just like a native app

It works offline once installed (after the first load, the app shell is cached). Your plays save to your phone's localStorage, so they're always available.

---

## Which option should I pick?

| Need | Pick |
|-----|------|
| Fastest, no setup | **Netlify Drop** (drag & drop, 30 seconds) |
| Best for Next.js, auto-deploys from git | **Vercel** |
| Heavy traffic, generous free tier | **Cloudflare Pages** |
| Already on GitHub, want it on your domain | **GitHub Pages** |
| Want full control / own server | **Self-host** |

All options give you HTTPS automatically, which is required for the "Install app" prompt to appear on Android.

---

## Build & Deploy Cheat Sheet

```bash
# One-time: install deps
npm install

# Build the static site (outputs to /out)
npm run build

# Deploy /out to your host of choice
# (see options above)
```

That's it — no server, no env vars, no API keys. Just static files.
