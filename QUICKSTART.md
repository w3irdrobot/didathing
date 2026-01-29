# Quick Start Guide

## Run Locally (30 seconds)

1. **Start the server:**
   ```bash
   ./start.sh
   ```

2. **Open your browser:**
   ```
   http://localhost:8000
   ```

3. **Try it out:**
   - Click the `+` button
   - Add "Water plants"
   - Click "Did it now"
   - Watch the timer update!

## Install as App

### Desktop (Chrome/Edge)
- Look for the install icon (⊕) in the address bar
- Click it to install

### Mobile
- **Android:** Menu → "Install app" or "Add to Home Screen"
- **iOS:** Share button → "Add to Home Screen"

## Deploy to GitHub Pages

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/didathing.git
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to Settings → Pages
   - Source: **GitHub Actions**

3. **Done!** Your app will be live at:
   ```
   https://yourusername.github.io/didathing/
   ```

See `DEPLOYMENT.md` for more hosting options.

## Next Steps

- Read `README.md` for full documentation
- See `TESTING.md` for comprehensive testing guide
- See `DEPLOYMENT.md` for deployment details
- Open `generate-icons.html` to create proper PNG icons

## Architecture Highlights

✅ **Zero dependencies** - Pure vanilla JS  
✅ **No build step** - Just serve and go  
✅ **Offline-first** - Works without internet  
✅ **Privacy-focused** - All data stays local  
✅ **Mobile-optimized** - Touch-friendly UI  
✅ **Accessible** - Keyboard nav, focus states  
✅ **Themeable** - Auto dark/light mode  

Total codebase: ~45 KB (uncompressed)

---

**Enjoy tracking your things! 🎯**
