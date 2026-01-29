# Testing Guide

## Quick Start

```bash
./start.sh
# Or specify a port:
./start.sh 3000
```

Then open http://localhost:8000 in your browser.

## Test Checklist

### Basic Functionality

- [ ] **Empty State**
  - Open app, should show "No things yet" message
  - FAB (+) button visible in bottom right

- [ ] **Add Task**
  - Click FAB
  - Enter "Water plants" 
  - Click "Add Thing"
  - Should redirect to list with new task
  - Task shows "Never • Created Just now"

- [ ] **Mark Complete**
  - Click "Did it now" button
  - Time should change to "Last done Just now"
  - Time should be green (recent)

- [ ] **Duplicate Detection**
  - Try to add "Water plants" again
  - Should show confirmation dialog
  - Can choose to add anyway or cancel

- [ ] **Multiple Tasks**
  - Add several tasks (e.g., "Take vitamins", "Exercise", "Call mom")
  - All should appear in list
  - Sorting should work

### Edit Functionality

- [ ] **Edit Task Name**
  - Click task name to open edit screen
  - Change title
  - Click "Save"
  - New title appears in list

- [ ] **Completion History**
  - Click task with completions
  - Should see "Completion History" section
  - Completions listed newest first
  - Shows formatted date/time

- [ ] **Add Past Completion**
  - In edit screen, click "Add completion..."
  - Select a past date/time
  - Click "Add"
  - Should appear in history list

- [ ] **Delete Completion**
  - Click "Delete" on a completion
  - Confirm dialog appears
  - Completion removed from list
  - Last completion time updates if needed

- [ ] **Delete Task**
  - Scroll to "Delete Thing" button
  - Click delete
  - Confirm dialog appears
  - Task removed from list

### Sorting

- [ ] **Default Sort (Recent)**
  - Tasks with no completions at top
  - Then least recently done
  - Then more recently done at bottom

- [ ] **Alphabetical Sort**
  - Click "Sort: Recent" button
  - Changes to "Sort: A-Z"
  - Tasks sorted alphabetically

- [ ] **Persistence**
  - Change sort order
  - Refresh page
  - Sort order should persist

### Time Display

- [ ] **Live Updates**
  - Mark task complete
  - Should show "Just now"
  - Wait 60+ seconds
  - Should update to "1m"
  - Timer continues running

- [ ] **Different Time Scales**
  - Create completions at various times using "Add completion"
  - Test displays:
    - < 1 min: "Just now"
    - < 1 hour: "5m", "45m"
    - < 1 day: "1h", "12h"
    - < 30 days: "1d", "15d"
    - < 1 year: "1mo", "11mo"
    - >= 1 year: "1y", "2y"

### Theme

- [ ] **System Preference**
  - If your OS is in dark mode, app should load in dark mode
  - If your OS is in light mode, app should load in light mode

- [ ] **Manual Toggle**
  - Click theme button (top right)
  - Should toggle: dark → light → auto (system) → dark
  - Theme persists on reload

- [ ] **Theme Colors**
  - Check both themes have good contrast
  - Interactive elements clearly visible
  - Focus states visible

### Accessibility

- [ ] **Keyboard Navigation**
  - Tab through all interactive elements
  - Focus visible on all elements
  - Enter/Space activates buttons
  - Can navigate entire app without mouse

- [ ] **Touch Targets**
  - All buttons at least 44×44px (tap-friendly)
  - Easy to tap on mobile without misclicks

- [ ] **Screen Reader** (if available)
  - Headers properly announced
  - Buttons have clear labels
  - Form inputs have labels

### PWA Features

- [ ] **Manifest**
  - Open DevTools → Application → Manifest
  - Verify all fields populated correctly
  - Icons show properly

- [ ] **Service Worker**
  - Open DevTools → Application → Service Workers
  - Should show "activated and running"
  - Cache Storage should show cached files

- [ ] **Install Prompt**
  - Chrome: Look for install icon in address bar
  - Click to install
  - App opens in standalone window

- [ ] **Offline Mode**
  - With app open, enable offline mode (DevTools → Network → Offline)
  - Reload page
  - App should still load
  - Can navigate between screens
  - Data persists

- [ ] **Add to Home Screen (Mobile)**
  - iOS: Share → Add to Home Screen
  - Android: Menu → Install app
  - Icon appears on home screen
  - Tapping opens in standalone mode

### Data Persistence

- [ ] **Refresh Page**
  - Add tasks and completions
  - Refresh browser
  - All data should remain

- [ ] **Close and Reopen**
  - Close browser completely
  - Reopen to app
  - All data should remain

- [ ] **IndexedDB**
  - DevTools → Application → IndexedDB
  - Should see "DidAThingDB"
  - Contains "tasks" and "completions" stores

### Edge Cases

- [ ] **Empty Task Name**
  - Try to add task with only spaces
  - Should show validation error

- [ ] **Very Long Task Name**
  - Add task with 200+ characters
  - Should display without breaking layout

- [ ] **Special Characters**
  - Add task with emojis, symbols: "💧 Water plants 🌱"
  - Should save and display correctly

- [ ] **Many Tasks**
  - Add 50+ tasks
  - List should remain performant
  - Scrolling smooth

- [ ] **Delete Last Completion**
  - Task with only one completion
  - Delete that completion
  - Should show "Never" again

## Performance Tests

### Load Time
- Clear cache, reload
- Should load in < 1 second on good connection

### Interaction Response
- All button clicks respond immediately
- No noticeable lag

### Memory
- Open DevTools → Performance Monitor
- Use app for 5 minutes
- Memory should remain stable (no leaks)

## Browser Testing

Test in multiple browsers:
- [ ] Chrome/Edge (Desktop)
- [ ] Firefox (Desktop)
- [ ] Safari (Desktop, if on Mac)
- [ ] Chrome (Android)
- [ ] Safari (iOS)

## Known Limitations

- SVG icons used as PNG placeholders (generate proper PNGs for production)
- No data export/import
- No sync between devices
- No backup/restore
- Single device only

## Troubleshooting

**Service Worker not registering:**
- Must use HTTP/HTTPS (not file://)
- Check browser console for errors

**App not installing:**
- Requires HTTPS in production
- Check manifest.webmanifest is valid JSON
- Verify all icons exist and load

**Data not persisting:**
- Check IndexedDB in DevTools
- Verify no browser extensions blocking storage
- Check available storage space

**Modules not loading:**
- Ensure using HTTP server (not file://)
- Check browser supports ES6 modules
- Check browser console for CORS errors
