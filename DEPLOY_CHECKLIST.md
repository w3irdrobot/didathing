# GitHub Pages Deployment Checklist

Use this checklist to deploy "Did a Thing" to GitHub Pages.

## Pre-Deployment

- [ ] Test locally with `./start.sh`
- [ ] Verify app works correctly (add task, mark complete, etc.)
- [ ] Generate proper PNG icons (open `generate-icons.html`)
- [ ] Test offline mode works (DevTools → Network → Offline)
- [ ] All changes committed to git

## GitHub Setup

- [ ] Create GitHub repository:
  ```bash
  # If not already a git repo:
  git init
  git add .
  git commit -m "Initial commit"
  git branch -M main
  ```

- [ ] Add remote and push:
  ```bash
  git remote add origin https://github.com/USERNAME/didathing.git
  git push -u origin main
  ```

- [ ] Enable GitHub Pages:
  - Go to repository Settings
  - Click "Pages" in sidebar
  - Under "Source", select: **GitHub Actions**
  - Click "Save"

## Deployment

- [ ] Workflow triggers automatically on push
- [ ] Check "Actions" tab for build progress
- [ ] Wait for green checkmark (✓)
- [ ] Deployment takes ~1-2 minutes

## Post-Deployment Verification

- [ ] Visit: `https://USERNAME.github.io/didathing/`
- [ ] App loads without errors
- [ ] Check browser console (no red errors)
- [ ] Service Worker registers successfully
  - DevTools → Application → Service Workers
  - Should show "activated and running"

- [ ] Test PWA features:
  - [ ] Install prompt appears (or install icon in address bar)
  - [ ] Can install the app
  - [ ] Installed app opens standalone
  - [ ] Works offline (enable offline mode, reload)

- [ ] Test functionality:
  - [ ] Add a task
  - [ ] Mark it complete
  - [ ] Edit task
  - [ ] View completion history
  - [ ] Theme toggle works
  - [ ] Sort toggle works

- [ ] Mobile testing (if possible):
  - [ ] Visit on mobile browser
  - [ ] Add to home screen
  - [ ] Tap targets are comfortable
  - [ ] UI looks good on small screen

## Lighthouse Audit

- [ ] Open DevTools → Lighthouse
- [ ] Select "Progressive Web App"
- [ ] Click "Analyze page load"
- [ ] Should score 100/100 for PWA

## Optional: Custom Domain

If using a custom domain:

- [ ] Add `CNAME` file with domain name
- [ ] Configure DNS:
  - CNAME: `www` → `USERNAME.github.io`
  - A records for apex domain (see GitHub docs)
- [ ] Wait for DNS propagation (can take 24-48 hours)
- [ ] Enforce HTTPS in repository settings

## Troubleshooting

If something doesn't work:

**Workflow fails:**
- Check Actions tab for error details
- Verify workflow YAML is valid
- Ensure repository has Pages enabled

**Site doesn't load:**
- Wait a few minutes (first deploy can be slow)
- Check Settings → Pages shows deployed URL
- Verify workflow completed successfully

**Service Worker fails:**
- GitHub Pages uses HTTPS (good!)
- Check browser console for errors
- Verify `sw.js` is accessible at site root

**PWA not installable:**
- Ensure all icons load (check Network tab)
- Verify `manifest.webmanifest` is accessible
- Check Service Worker is active
- Must interact with page first

**404 errors:**
- Verify `.nojekyll` file exists
- Check file paths are relative (`./` not `/`)
- Hard refresh (Ctrl+Shift+R)

## Updating the App

After making changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

GitHub Actions automatically redeploys.

## Rollback

If a deployment breaks something:

```bash
# Option 1: Revert last commit
git revert HEAD
git push

# Option 2: Reset to previous commit
git reset --hard PREVIOUS_COMMIT_SHA
git push --force  # Use with caution!
```

Or use GitHub's UI to revert the commit.

---

## Success Criteria

Your deployment is successful when:

✅ App accessible at GitHub Pages URL  
✅ No console errors  
✅ Service Worker active  
✅ Works offline  
✅ PWA installable  
✅ Lighthouse PWA score: 100/100  
✅ All features functional  

**Congratulations!** 🎉 Your app is live!
