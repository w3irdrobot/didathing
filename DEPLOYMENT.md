# Deployment Guide

## GitHub Pages (Recommended)

GitHub Pages provides free HTTPS hosting, perfect for PWAs.

### Initial Setup

1. **Create a GitHub repository** (if you haven't already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/didathing.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Settings → Pages
   - Under "Source", select: **GitHub Actions**

3. **Wait for deployment**:
   - The workflow runs automatically on push
   - Check the "Actions" tab for build status
   - First deployment takes ~1-2 minutes

4. **Access your app**:
   - URL: `https://yourusername.github.io/didathing/`
   - Or your custom domain if configured

### Workflow Details

The `.github/workflows/deploy.yml` workflow:
- Triggers on every push to `main`
- Can also be manually triggered via "Actions" tab
- Deploys the entire project (no build needed!)
- Takes ~1-2 minutes to deploy

### Custom Domain (Optional)

1. Add a `CNAME` file with your domain:
   ```bash
   echo "yourdomain.com" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

2. Configure DNS:
   - Add CNAME record: `www` → `yourusername.github.io`
   - Add A records for apex domain (see [GitHub docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site))

3. Enable HTTPS in repository settings (GitHub handles SSL automatically)

### Updating the App

Just push to main:
```bash
git add .
git commit -m "Update feature"
git push
```

GitHub Actions automatically deploys the latest version.

## Other Hosting Options

### Netlify

1. **Drag and drop** the entire project folder to [netlify.com/drop](https://netlify.com/drop)
2. Or connect your GitHub repo for automatic deployments
3. Free HTTPS included

### Vercel

```bash
npm i -g vercel
vercel
```

Follow prompts. Free HTTPS included.

### Cloudflare Pages

1. Connect your GitHub repository
2. Build settings:
   - Build command: (leave empty)
   - Output directory: `/`
3. Deploy

### Static Web Hosts

Any static host works:
- Firebase Hosting
- Surge.sh
- Render
- AWS S3 + CloudFront
- Azure Static Web Apps

**Requirements:**
- Must serve over HTTPS (for PWA features)
- Serve all files from project root
- No build step needed

## Self-Hosting

### Using Docker

Create a `Dockerfile`:

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
```

Build and run:
```bash
docker build -t didathing .
docker run -p 8080:80 didathing
```

### Using NGINX

NGINX config:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/didathing;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable HTTPS (required for PWA)
    # Add SSL configuration here
}
```

### Using Apache

`.htaccess`:
```apache
# Enable HTTPS redirect
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Fallback to index.html for hash routing
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## HTTPS Requirements

PWAs **require HTTPS** for:
- Service Worker registration
- Install prompt
- Full offline functionality

**Exceptions:**
- `localhost` (for development)
- `127.0.0.1` (for development)

All recommended hosts (GitHub Pages, Netlify, Vercel, etc.) provide free HTTPS.

## Testing Production Build

Before deploying, test locally with HTTPS:

### Using ngrok (easiest)
```bash
./start.sh 8000 &
ngrok http 8000
```

Access via the HTTPS URL ngrok provides.

### Using mkcert (local HTTPS)
```bash
# Install mkcert
brew install mkcert  # macOS
# or your package manager

# Create local CA
mkcert -install

# Generate certificate
mkcert localhost 127.0.0.1

# Serve with HTTPS (requires http-server)
npx http-server -S -C localhost+1.pem -K localhost+1-key.pem
```

## Post-Deployment Checklist

After deploying:

- [ ] Visit your deployed URL
- [ ] Check browser console for errors
- [ ] Verify Service Worker registers (DevTools → Application → Service Workers)
- [ ] Test offline mode (DevTools → Network → Offline, reload)
- [ ] Test PWA install prompt appears
- [ ] Install the app and verify it works standalone
- [ ] Test on mobile device (Android + iOS)
- [ ] Run Lighthouse audit (should score 100 for PWA)
- [ ] Verify icons load correctly
- [ ] Test manifest.json loads (visit `https://yoururl.com/manifest.webmanifest`)

## Troubleshooting

### Service Worker Not Registering

- Ensure HTTPS is enabled (or using localhost)
- Check browser console for errors
- Verify `sw.js` is accessible at root level
- Clear browser cache and reload

### PWA Install Prompt Not Showing

- Must be served over HTTPS
- Must have valid `manifest.webmanifest`
- All required icons must load
- Service Worker must be registered
- User must engage with site (interact with page)

### Icons Not Loading

- Check paths in `manifest.webmanifest`
- Verify icon files exist in `icons/` folder
- Generate proper PNGs using `generate-icons.html`
- Check browser console for 404 errors

### Offline Mode Not Working

- Service Worker must register successfully
- Check cache in DevTools → Application → Cache Storage
- Verify all files are cached
- Try unregistering and re-registering Service Worker

## Monitoring

After deployment, monitor:

1. **GitHub Actions** (for GitHub Pages)
   - Check build logs for errors
   - Monitor deployment status

2. **Browser Console** (on deployed site)
   - Look for Service Worker errors
   - Check for failed asset loads

3. **Lighthouse** (Chrome DevTools → Lighthouse)
   - Run PWA audit
   - Should score 100/100
   - Check for warnings

## Rollback

If a deployment breaks something:

### GitHub Pages
```bash
git revert HEAD
git push
```

Or use GitHub's "Revert" button on the commit.

### Other Hosts
- Netlify/Vercel: Use their dashboard to rollback
- Manual: Deploy previous working version

---

**You're all set!** 🚀

The app is designed to be deployment-friendly with zero configuration needed.
