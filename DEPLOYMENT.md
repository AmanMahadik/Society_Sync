# 🏢 SocietySync Deployment Guide

This guide provides step-by-step instructions on how to build and deploy the **SocietySync Admin Portal** (Next.js) and the **Expo Web App** to production using **Vercel** or other static hosting providers.

---

## 🌐 1. Deploying the Admin Portal to Vercel (Next.js App)

The admin portal is a Next.js application located in the `/portal` directory. It is pre-configured with a `vercel.json` file.

### Option A: Via the Vercel Dashboard (Recommended)
1. Go to [Vercel](https://vercel.com) and log in.
2. Click **Add New** > **Project**.
3. Import your `Society_Sync` git repository.
4. In the **Configure Project** window:
   - **Project Name**: `societysync-portal`
   - **Framework Preset**: **Next.js**
   - **Root Directory**: Click "Edit" and select **`portal`**. (This tells Vercel to only build and deploy the `portal/` folder contents).
5. Open the **Environment Variables** section and add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL (e.g. `https://nqpxlvbgzcfguijouhgl.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
6. Click **Deploy**.

### Option B: Via Vercel CLI
If you have the Vercel CLI installed (`npm install -g vercel`), run:
```bash
# Navigate to the portal folder
cd portal

# Log in and deploy
vercel
```
Follow the prompts to link the project and deploy it. For production release, run:
```bash
vercel --prod
```

---

## 📱 2. Deploying the Mobile Web App to Vercel (Expo Web)

If you want to host the web-exported version of the Expo app (located in the root `/dist` folder after building), you can deploy it as a separate project on Vercel.

### Option A: Via the Vercel Dashboard
1. Go to [Vercel](https://vercel.com).
2. Click **Add New** > **Project** and import your `Society_Sync` git repository.
3. In the **Configure Project** window:
   - **Project Name**: `societysync-web-app`
   - **Framework Preset**: **Other** or **Create React App** (since it is a static export)
   - **Root Directory**: **`.`** (the workspace root)
   - **Build Command**: `npm run build_web`
   - **Output Directory**: `dist`
4. Click **Deploy**.

### Option B: Via Vercel CLI
1. Build the static files locally:
   ```bash
   npm run build_web
   ```
2. Deploy the static `dist` folder:
   ```bash
   vercel dist
   ```

---

## 🛠️ 3. Local Build & Development Helper Scripts

To make local building and development easier, several convenience commands and scripts are available:

### Root CLI Commands
We have added prefix commands to the root `package.json` so you do not have to change directories:
- **Run Portal in Dev Mode**: `npm run portal:dev`
- **Build Portal locally**: `npm run portal:build` (Outputs to `/portal/.next`)
- **Start Production Portal locally**: `npm run portal:start`
- **Lint Portal**: `npm run portal:lint`

### Deployment Control Panel
You can run the interactive deployment dashboard:
```bash
deploy.bat
```
Select **Option [6] Build Next.js Portal** to test compiling the admin portal locally prior to pushing to Vercel.
