# Frisbee Play Designer — Local Setup (v2)

A browser-based tool for drawing and animating Ultimate Frisbee plays. Built for touch + stylus on Android tablets (also works on desktop).

> **Want to use it on your phone anywhere without running dev on your computer?**
> See **[DEPLOY.md](./DEPLOY.md)** — the app is 100% client-side and can be deployed free to Vercel, Netlify, Cloudflare Pages, or GitHub Pages in 30 seconds.

## Requirements

- **Node.js 18+** (download from https://nodejs.org — the LTS version is fine)
- Any modern browser (Chrome recommended for Android install)

> **You do NOT need Bun.** This project runs on plain Node.js + npm.

## Install & Run

1. **Unzip** `frisbee-play-designer.zip` to a folder of your choice

2. Open a terminal in that folder:
   - **Windows:** Open the folder in File Explorer, then hold Shift + right-click → "Open PowerShell window here" (or "Open in Terminal")
   - **Mac:** Right-click the folder in Finder → "New Terminal at Folder"
   - **Linux:** `cd /path/to/unzipped/folder`

3. Install dependencies:
   ```bash
   npm install
   ```
   (This takes 1–2 minutes the first time)

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open **http://localhost:3000** in your browser

## Install on Android (PWA)

The app is a Progressive Web App — you can install it to your home screen for a native-app-like experience:

1. Run `npm run dev` on your computer (as above)
2. Make sure your phone/tablet is on the same Wi-Fi as your computer
3. On Android Chrome, open `http://<your-computer-ip>:3000` (find your IP with `ipconfig` on Windows or `ifconfig` on Mac/Linux)
4. Tap the **three dots menu** → **Install app** (or "Add to Home screen")
5. Launch from your home screen — it runs full-screen, no browser chrome

## v2 Features (Touch / Stylus / Drill Edition)

- **Vertical (portrait) field** — end zones at top and bottom
- **Empty start** — add players, cones, and drawings via the toolbar
- **Players**
  - Offense: colored circles with numbers (1, 2, 3…)
  - Defense: red **X** shapes labeled X1, X2, X3…
- **Drill cones** — tap the Cone tool, then tap the field to place orange cone markers
- **Freehand drawing** — Pen tool draws naturally with finger or stylus
- **Color palette** — 8 colors (white, yellow, orange, red, green, blue, purple, black) for strokes, cones, and arrows
- **Eraser** — tap any stroke, cone, or arrow to delete it
- **Stylus-only mode** — toggle ON to ignore touch input so your palm doesn't draw while using the stylus
- **Linear disc flight** — the disc travels in a straight line between holders (no awkward arc)
- **Multi-select** — shift-tap, marquee drag, group drag, select-all (Ctrl+A)
- **Undo/redo** — Ctrl+Z / Ctrl+Shift+Z (50-step history)
- **Keyframe animation** — play / pause / scrub / 0.5× / 1× / 2× speed
- **Save plays** to browser localStorage; Export/Import as JSON
- **Export Animated GIF** — renders the full play as a looping GIF (vertical 600x900)

## Tools (left toolbar)

| Tool | What it does |
|------|--------------|
| Select | Tap to select; drag to move; drag empty area for marquee box |
| Arrow | Drag to draw a dashed cut arrow (player movement) |
| Disc | Drag to draw a throw arrow; TAP a player to assign disc |
| Cone | Tap on field to place an orange cone (drill marker) |
| Pen | Freehand draw with finger or stylus |
| Erase | Tap a stroke / cone / arrow to delete it |

## Keyboard Shortcuts (desktop)

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift+Z or Ctrl+Y | Redo |
| Ctrl/Cmd + A | Select all players |
| Delete / Backspace | Delete selected players |
| Escape | Clear selection |
| Shift + click | Add/remove player from selection |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main page (mobile-first responsive layout)
│   ├── layout.tsx            # PWA manifest + viewport meta
│   └── globals.css
├── components/
│   ├── frisbee/
│   │   ├── FieldCanvas.tsx       # Canvas + pointer interaction (touch/stylus)
│   │   ├── Toolbar.tsx           # Tools, color palette, stylus toggle
│   │   ├── Timeline.tsx          # Playback + keyframes + play management
│   │   ├── SelectedPlayerCard.tsx
│   │   ├── usePlayback.ts        # requestAnimationFrame loop
│   │   └── useKeyboardShortcuts.ts
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── frisbee/
│   │   ├── types.ts          # Player, Keyframe, Arrow, Cone, Stroke types
│   │   ├── store.ts          # Zustand store (state + actions + history)
│   │   ├── render.ts         # Canvas drawing (vertical field, X defenders, linear disc)
│   │   └── exportGif.ts      # GIF encoder using gifenc
│   └── utils.ts
└── hooks/
public/
├── manifest.json             # PWA manifest
├── icon-192.png              # PWA icon
├── icon-512.png
└── icon-512-maskable.png
```

## Tech Stack

- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Zustand for state management
- HTML5 Canvas with Pointer Events (unified mouse/touch/pen)
- gifenc for GIF encoding
- Lucide icons

## Notes

- Plays are stored in localStorage under `frisbee-plays-v2` (changed from v1)
- The GIF export runs entirely in the browser (no server needed)
- No database required
- Works offline once installed as PWA (after first load)

## Troubleshooting

### "npm : File C:\... cannot be loaded because running scripts is disabled"
Windows PowerShell blocks scripts by default. Fix with:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Or use `npm.cmd install` instead of `npm install`.

### Port 3000 already in use
```bash
npx next dev -p 3001
```

### Touch input not working on Android
Make sure Chrome has the latest version. Pointer Events are supported in all modern browsers.
