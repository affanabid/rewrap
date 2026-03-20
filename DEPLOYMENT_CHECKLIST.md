# Quick Deployment Checklist

## Pre-Deployment ✅

### Code Cleanup
- [ ] Run `npm run lint` in frontend directory (fix any errors)
- [ ] Remove commented code
- [ ] No console.log() statements (except console.error for logging)
- [ ] No hardcoded API URLs
- [ ] No hardcoded secrets or credentials

### Local Testing
- [ ] Test login flow locally
- [ ] Test playlist creation
- [ ] Test logout
- [ ] Verify responsive design on mobile
- [ ] Check profile dropdown menu works
- [ ] Verify footer links work

### Build Testing
```bash
# Frontend
cd frontend
npm run build
npm run preview
# Test at http://localhost:4173

# Backend (optional)
python app.py  # Should not have debug=True
```

### Git Cleanup
- [ ] Commit all changes
- [ ] Push to main branch
- [ ] Verify GitHub shows latest commits

---

## Deployment Order (IMPORTANT)

### Step 1: Deploy Backend First
1. Push code to GitHub (if not already done)
2. Go to Render Dashboard
3. Click on rewrap service (or similar)
4. Add/update environment variables:
   ```
   FLASK_SECRET=<generate new strong secret>
   SPOTIPY_CLIENT_ID=<your spotify id>
   SPOTIPY_CLIENT_SECRET=<your spotify secret>
   FRONTEND_URL=<leave as https://rewrap-puce.vercel.app for now>
   ENV=prod
   ```
5. Click "Deploy" or wait for auto-deploy
6. Wait for deployment to complete (~2-3 minutes)
7. **Note your backend URL** (e.g., https://rewrap-xxxxx.onrender.com)

### Step 2: Deploy Frontend
1. Go to Vercel Dashboard
2. Click on rewrap project (or similar)
3. Add environment variable:
   ```
   VITE_API_BASE_URL=https://rewrap-xxxxx.onrender.com
   ```
4. Trigger redeploy (Settings → Deployments → Redeploy)
5. Wait for deployment to complete (~1-2 minutes)
6. **Note your frontend URL** (e.g., https://rewrap-puce.vercel.app)

### Step 3: Update Backend with Frontend URL
1. Go back to Render Dashboard
2. Update environment variable:
   ```
   FRONTEND_URL=https://rewrap-puce.vercel.app
   ```
3. Redeploy backend
4. Wait for completion

### Step 4: Update Spotify Developer Dashboard
1. Go to Spotify Developer Dashboard
2. Find your application
3. Go to Settings
4. Update "Redirect URIs" to:
   ```
   https://your-backend-url/callback
   ```
5. Click Save

---

## Post-Deployment Verification ✅

### Test Login Flow
1. Open frontend URL in browser
2. Click "Continue with Spotify"
3. You should be redirected to Spotify login
4. Login with your Spotify account
5. Click "Agree" to authorize
6. You should be redirected back to dashboard

### Test Data Loading
- [ ] Top artists display correctly
- [ ] Top tracks display correctly
- [ ] Charts display correctly
- [ ] Time range dropdown works

### Test Playlist Creation
- [ ] Click "Create Playlist" button
- [ ] Modal opens in center
- [ ] Enter playlist name
- [ ] Click "Create"
- [ ] Notification appears
- [ ] Click to open playlist in Spotify

### Test Profile Menu
- [ ] Click profile picture in top right
- [ ] Dropdown menu appears
- [ ] Shows user name
- [ ] Click "Sign out" works

### Monitor Logs
- [ ] No errors in Render backend logs
- [ ] No errors in browser console
- [ ] No CORS errors

---

## If Something Goes Wrong 🆘

### CORS Error
- [ ] Check `FRONTEND_URL` matches your Vercel domain exactly
- [ ] Check it includes `https://`
- [ ] Redeploy backend after changing env var

### 401 Unauthorized
- [ ] Check session cookies are being saved
- [ ] Clear browser cookies and try again
- [ ] Check backend logs for errors

### Blank Page / Not Loading
- [ ] Check browser console for JavaScript errors
- [ ] Verify `VITE_API_BASE_URL` is correct in Vercel
- [ ] Check network tab to see API requests
- [ ] Verify backend URL is correct

### "Cannot find module" errors
- [ ] Run `npm install` in frontend directory
- [ ] Delete `node_modules` folder and run `npm install` again
- [ ] Check `package.json` has all dependencies

---

## Environment Variables Quick Reference

### Backend (Render)
```
FLASK_SECRET=<strong random string>
SPOTIPY_CLIENT_ID=<from spotify dashboard>
SPOTIPY_CLIENT_SECRET=<from spotify dashboard>
SPOTIPY_REDIRECT_URI=https://your-render-url/callback
FRONTEND_URL=https://your-vercel-url.app
ENV=prod
```

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://your-render-url
```

---

## Final Checklist Before Going Live

- [ ] Both frontend and backend deployed
- [ ] All environment variables set on deployment platforms
- [ ] Login flow works end-to-end
- [ ] Data displays correctly
- [ ] Playlist creation works
- [ ] Profile menu works
- [ ] Footer displays correctly with your info
- [ ] Responsive design verified on mobile
- [ ] No console errors
- [ ] Spotify redirect URI updated in developer dashboard

---

**Status:** Ready to Deploy 🚀

Once all steps are complete, you're live in production!
