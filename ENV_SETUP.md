# Environment Variables Setup Guide

## Required Variables

```
EXPO_PUBLIC_SUPABASE_URL=https://ofewccajgulkurtpdyoj.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_XpsnPbvAP_u5HwEUsmB4hw_je7iay7w
```

## Setup Instructions

### 1. For Vercel Web Deployments (Production & Preview)

**This is required for your web builds to work!**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **Smite 2 Mastery**
3. Go to **Settings** → **Environment Variables**
4. Add the following variables for **ALL environments** (Production, Preview, Development):

   **Variable 1:**
   - Name: `EXPO_PUBLIC_SUPABASE_URL`
   - Value: `https://ofewccajgulkurtpdyoj.supabase.co`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

   **Variable 2:**
   - Name: `EXPO_PUBLIC_SUPABASE_KEY`
   - Value: `sb_publishable_XpsnPbvAP_u5HwEUsmB4hw_je7iay7w`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

5. **Important:** After adding variables, you MUST redeploy:
   - Go to **Deployments** tab
   - Click the **⋯** menu on the latest deployment
   - Select **Redeploy**
   - Or push a new commit to trigger a redeploy

### 2. For Expo Native Builds (iOS/Android)

**Already configured in Expo dashboard, but verify:**

1. Go to [Expo Dashboard](https://expo.dev)
2. Select your project: **Smite 2 Mastery**
3. Go to **Environment variables**
4. Verify these variables exist for all environments:
   - `EXPO_PUBLIC_SUPABASE_URL` = `https://ofewccajgulkurtpdyoj.supabase.co`
   - `EXPO_PUBLIC_SUPABASE_KEY` = `sb_publishable_XpsnPbvAP_u5HwEUsmB4hw_je7iay7w`
5. Ensure they're set for: Production, Preview, and Development

### 3. For Local Development

Create a `.env` file in the project root (this file is gitignored):

```env
EXPO_PUBLIC_SUPABASE_URL=https://ofewccajgulkurtpdyoj.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_XpsnPbvAP_u5HwEUsmB4hw_je7iay7w
```

Then restart your Expo dev server.

## Verification

After setting up, check the browser console (for web) or logs (for native) - you should see:
- ✅ `Supabase Config Check:` with `hasUrl: true` and `hasKey: true`

If you see:
- ❌ `Supabase configuration is missing!` - The variables are not set correctly

## Troubleshooting

### Vercel Web Build Issues

- **Variables not working?** Make sure you redeployed after adding them
- **Preview not working?** Ensure variables are enabled for "Preview" environment
- **Production not working?** Ensure variables are enabled for "Production" environment

### Expo Native Build Issues

- **Variables not working?** Make sure they're set in Expo dashboard (not just locally)
- **Need to rebuild?** Run `eas build --profile production` after setting variables

### Quick Test

Run this in your browser console on the deployed site:
```javascript
console.log('URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('KEY:', process.env.EXPO_PUBLIC_SUPABASE_KEY ? 'Set' : 'Missing');
```

If both show values, the configuration is working!
