# Did a Thing

A super-simple, offline-first PWA for tracking when you did things and managing repeating cycles.

## Concept

Everything in "Did a Thing" is a **cycle** — a repeating sequence of phases (states):

- **Single-step things**: Track simple tasks (e.g., "Water plants"). Each time you mark it done, you're re-entering the same phase, resetting the timer.
- **Multi-phase cycles**: Track things with multiple phases (e.g., creatine loading → maintenance → pause). Advance through phases in sequence; when you reach the end, it loops back to the start.

## Features

- ✅ Track single-step tasks and see how long since you last did them
- ✅ Create multi-phase cycles (e.g., workout programs, supplement cycles)
- ✅ Quick "Did it now" / "Next phase" button
- ✅ Full history of all transitions
- ✅ Export/import your data (JSON)
- ✅ Wipe all data with confirmation
- ✅ Auto dark/light theme (Catppuccin Mocha/Latte)
- ✅ Works offline (PWA with Service Worker)
- ✅ Install to home screen on mobile
- ✅ Zero external dependencies
- ✅ All data stays on your device (IndexedDB)

## How to Run

### Quick Start

```bash
./start.sh
```

Then open `http://localhost:8000` in your browser.

### Local Development

1. Start a local web server (required for ES modules and Service Worker):

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have http-server installed)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

2. Open your browser to `http://localhost:8000`

### Deploy to GitHub Pages

This project includes automatic deployment to GitHub Pages:

1. **Enable GitHub Pages** in your repository settings:
   - Go to Settings → Pages
   - Source: GitHub Actions

2. **Push to main branch:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

3. **Wait for deployment:**
   - GitHub Actions will automatically deploy
   - Check the "Actions" tab for progress
   - Your app will be live at: `https://yourusername.github.io/didathing/`

The workflow (`.github/workflows/deploy.yml`) automatically deploys on every push to `main`.

### Important Notes

- **Do not** open `index.html` directly with `file://` - ES modules and Service Workers require HTTP(S)
- The app needs to be served over HTTP for the Service Worker to register
- For production, use HTTPS (required for PWA installation)
- GitHub Pages uses HTTPS by default, so PWA installation works out of the box

## Creating Proper PNG Icons

The included PNG icons are currently SVG copies. For best results, generate proper PNGs:

### Option 1: Use the Icon Generator

1. Open `generate-icons.html` in a browser
2. Right-click each canvas and save as:
   - First canvas → `icons/icon-192.png`
   - Second canvas → `icons/icon-512.png`

### Option 2: Use ImageMagick (if installed)

```bash
# Install ImageMagick
sudo apt install imagemagick  # Debian/Ubuntu
brew install imagemagick      # macOS

# Generate icons (run from project root)
convert -size 192x192 -background '#3b82f6' icons/icon.svg icons/icon-192.png
convert -size 512x512 -background '#3b82f6' icons/icon.svg icons/icon-512.png
```

### Option 3: Use any image editor

Open `icons/icon.svg` and export as PNG at 192×192 and 512×512.

## What to Try

1. **Add a task**: Click the "+" button and add something like "Water plants"
2. **Mark it done**: Click "Did it now" to record a completion
3. **View history**: Click the task name to see completion history
4. **Edit completions**: Add or remove completion entries
5. **Delete accidentally**: Remove a completion if you marked it by mistake
6. **Sort tasks**: Toggle between "Recent" (least recently done first) and "A-Z"
7. **Theme switching**: Click the theme toggle (top right) to cycle through dark → light → auto
8. **Install as PWA**:
   - Chrome/Edge: Click the install icon in the address bar
   - Safari iOS: Share → Add to Home Screen
   - Firefox: Should show install prompt when criteria met

## Testing PWA Installation

### Desktop (Chrome/Edge)

1. Open DevTools → Application → Manifest (verify manifest loads)
2. Check Service Worker is registered
3. Click install icon in address bar

### Mobile

#### Android (Chrome)

1. Visit the site (must be HTTPS in production)
2. Click "Add to Home Screen" banner or
3. Menu → "Install app" or "Add to Home Screen"

#### iOS (Safari)

1. Visit the site
2. Tap Share button
3. Scroll and tap "Add to Home Screen"
4. Confirm

### Offline Testing

1. Install the app
2. Open DevTools → Network → Check "Offline"
3. Reload - app should still work
4. Add/edit tasks - changes persist locally

## Architecture

- **No build step** - vanilla HTML/CSS/JS with ES modules
- **No frameworks** - plain JavaScript for simplicity
- **IndexedDB** - for persistent local storage
- **Hash routing** - simple client-side routing
- **Service Worker** - offline caching
- **CSS Variables** - for theming

## File Structure

```
├── index.html              # Entry point
├── styles.css              # All styles with CSS variables
├── app.js                  # Router, UI rendering, event handlers
├── db.js                   # IndexedDB wrapper
├── time.js                 # Time formatting utilities
├── sw.js                   # Service Worker for offline support
├── manifest.webmanifest    # PWA manifest
├── icons/
│   ├── icon.svg            # Vector icon
│   ├── icon-192.png        # 192×192 icon
│   └── icon-512.png        # 512×512 icon
└── generate-icons.html     # Tool to generate PNG icons

```

## Data Model

### Tasks
- `id`: Auto-increment primary key
- `title`: Task name
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### Completions
- `id`: Auto-increment primary key
- `taskId`: Foreign key to task
- `completedAt`: Timestamp

**Indexes**: `taskId`, `completedAt`, composite `taskId_completedAt` for efficient queries

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+ (iOS 14+)

Requires:
- ES6 modules
- IndexedDB
- Service Workers
- CSS custom properties

## License

AGPLv3

## Examples

### Single-Step Thing
**"Water plants"** - A simple task you do repeatedly.
- Add it as a "Single step"
- Click "Did it now" each time you water
- Shows "Last done 2d" (or "Never")

### Multi-Phase Cycle
**"Creatine cycle"** - A supplement cycle with phases:
1. Loading (2 weeks): 20g/day
2. Maintenance (6 weeks): 5g/day  
3. Pause (2 weeks): 0g/day

Then it repeats.

- Add it as a "Cycle"
- Define phases: Loading, Maintenance, Pause
- Click "Next phase" when transitioning
- Shows current phase and time in phase

### Other Cycle Examples
- **Workout split**: Push / Pull / Legs / Rest (repeat)
- **Meditation practice**: Beginner / Intermediate / Advanced
- **Reading habit**: Read / Reflect / Apply (weekly cycle)

## Usage

### Add a Thing

1. Click the **+** button
2. Enter a name (e.g., "Water plants")
3. Choose type:
   - **Single step**: Just track when you do it
   - **Cycle**: Multiple phases
4. For cycles, add phase names (at least 2)
5. Click "Add Thing"

### Mark Progress

- **Single-step**: Click "Did it now" to record a completion
- **Multi-phase**: Click "Next phase" to advance to the next state

### View/Edit History

- Click a thing's name to edit
- View completion/transition history
- Delete individual entries to correct mistakes
- Edit the thing name
- Delete the thing entirely

### Advanced Features

Click the ⚙ icon on the list screen:

- **Export Data**: Download all your data as JSON
- **Delete All Data**: Wipe everything (requires typing "DELETE" to confirm)

## What to Try

1. **Add a simple task**:
   - "Take vitamins" (single step)
   - Mark it done a few times
   - View the history

2. **Add a cycle**:
   - "Workout split" (cycle)
   - Phases: Push, Pull, Legs, Rest
   - Advance through a few phases
   - View transition history

3. **Export your data**:
   - Go to Advanced (⚙)
   - Click "Export Data"
   - Open the JSON to see your data structure

4. **Install as PWA**:
   - Chrome: Click install icon in address bar
   - Mobile: "Add to Home Screen"
   - Works offline!

