# Important Production Notices & Best Practices

## 🚨 Critical Items Before Going Live

### 1. FLASK_SECRET Key
**NEVER reuse or commit this to Git**
- Generate new key for production:
  ```bash
  python -c 'import secrets; print(secrets.token_urlsafe(32))'
  ```
- This key encrypts user sessions
- Changing it logs out all users

### 2. Spotify OAuth Credentials
**DO NOT share these credentials**
- Keep `SPOTIPY_CLIENT_SECRET` private
- Never expose in frontend code
- Regenerate if accidentally committed
- Each application instance should have unique credentials (or at least unique redirect URIs)

### 3. CORS Configuration
**Only allow trusted domains**
Current configuration allows:
- `https://rewrap-puce.vercel.app` (frontend)
- Backend's `FRONTEND_URL` environment variable
- Development: `http://127.0.0.1:5173`

Update in `app.py` if you change domains.

---

## 📦 Deployment Platform Specific Notes

### Render Backend
- **Cold Starts:** First request may take 5-10 seconds (free tier)
- **Persistence:** Session data stored in `/var/data` directory
- **Auto-Deploy:** Enable GitHub integration for auto-deploy on push
- **Logs:** Check Render dashboard for real-time logs
- **Scaling:** Upgrade if you get request errors

### Vercel Frontend
- **Build Time:** Usually 2-3 minutes
- **Auto-Deploy:** Automatically deploys on git push to main
- **CDN:** Built-in global CDN (no extra config needed)
- **Serverless:** Function invocation for API routes (not used in this app)
- **Analytics:** Optional Vercel analytics integration

---

## 🔄 Update Workflow for Future Changes

### For Code Changes
```bash
# 1. Make changes locally
# 2. Test locally
git add .
git commit -m "Description of changes"
git push origin main

# 3. CI/CD automatically deploys
# - Render detects push → rebuilds backend
# - Vercel detects push → rebuilds frontend
# 4. Check deployment status in dashboard
# 5. Test in production
```

### For Environment Variables Only
```bash
# NO need to push code
# 1. Go to Render/Vercel dashboard
# 2. Update environment variable
# 3. Click "Deploy" or "Redeploy"
# 4. Wait for completion
```

### For Secret Rotation (IMPORTANT)
1. Generate new `FLASK_SECRET`
2. Update in Render environment
3. Redeploy backend
4. **All users will be logged out** - expected behavior
5. Each user needs to login again

---

## 📊 Monitoring & Maintenance

### Daily
- Check for error spikes in logs
- Verify users can login

### Weekly
- Review API response times
- Check for failed requests
- Monitor error rate

### Monthly
- Update dependencies (careful!)
- Review security updates
- Check Spotify API rate limits

---

## Performance Optimization Tips

### Frontend
- Images are already optimized (Spotify provides them)
- Bundle size: ~250KB (acceptable)
- Consider adding service workers for offline support

### Backend
- Session timeout: Browser close (configurable)
- Token auto-refresh: Yes
- Database: Not used (stateless except for session)
- Rate limiting: Not implemented (add if needed)

---

## Security Best Practices

### Never Do This 🚫
```javascript
// WRONG - Exposing API keys in frontend
const API_KEY = "sk_live_xxxxx";

// WRONG - Hardcoded URLs
const API_URL = "https://api.example.com";

// WRONG - Committing .env file
git add .env  // DON'T DO THIS
```

### Always Do This ✅
```javascript
// RIGHT - Use environment variables
const API_URL = import.meta.env.VITE_API_BASE_URL;

// RIGHT - Use .env.example as template
// Add to .gitignore
echo ".env" >> .gitignore

// RIGHT - Use secrets management
// Store in Render/Vercel dashboard, not git
```

---

## API Rate Limiting Status

### Spotify API
- **Rate Limit:** 429 Too Many Requests
- **Current Implementation:** None (relies on Spotify's limits)
- **Future Consideration:** Implement queue system if needed

### Backend Endpoints
- **Recommendation:** Add rate limiting if public
- **Current Status:** No rate limiting (assumes logged-in users only)

---

## Backup & Disaster Recovery

### What Gets Backed Up
- ✅ Code (GitHub)
- ✅ Environment variables (documented in password manager)
- ❌ User session data (ephemeral, expires on browser close)
- ❌ User data (stored in Spotify, not your database)

### Recovery Procedures
1. **Code Lost:** Recover from GitHub
2. **Env Variables Lost:** Have backup copy in password manager
3. **Deployment Broken:** Revert to previous git commit
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

---

## Troubleshooting Guide

### Issue: "Session Expired" on Login
**Solution:** Clear browser cookies and login again

### Issue: CORS Error
```
Access-Control-Allow-Origin does not match
```
**Solution:** Verify `FRONTEND_URL` environment variable matches exactly

### Issue: Blank Dashboard
**Solution:** 
1. Check browser console for errors
2. Check Render logs for backend errors
3. Verify user data endpoint: `/me`

### Issue: Playlist Creation Fails
**Solution:**
1. Verify Spotify token is still valid
2. Check track URIs are valid
3. Check Spotify rate limits

### Issue: Very Slow Response Time
**Solution:**
1. Check Render instance status
2. Consider upgrading from free tier
3. Check Spotify API response times

---

## Future Enhancement Ideas

- [ ] Database for user data caching
- [ ] Advanced analytics (most played over time)
- [ ] Social sharing features
- [ ] Playlist recommendations
- [ ] Export to CSV/JSON
- [ ] Dark/light mode toggle
- [ ] Multiple profile support
- [ ] Favorite tracks/artists
- [ ] Genre-based recommendations

---

## Support & Documentation

- **Spotify API:** https://developer.spotify.com/documentation/web-api
- **Flask:** https://flask.palletsprojects.com/
- **React:** https://react.dev/
- **Vite:** https://vitejs.dev/
- **Render:** https://render.com/docs
- **Vercel:** https://vercel.com/docs

---

## Version Information

- **Flask:** 3.1.1
- **React:** 19.1.0
- **Vite:** 7.0.4
- **Spotipy:** 2.25.1
- **Python:** 3.8+
- **Node.js:** 16+

---

**Last Updated:** March 20, 2026  
**Status:** Production Ready ✅

Questions? Check the logs first! 📋
