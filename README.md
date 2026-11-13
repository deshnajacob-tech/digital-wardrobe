# Closet – Digital Wardrobe

Photograph your clothes, have the background cut out automatically, and dress up an avatar that looks like you.

No build step and no dependencies: plain HTML, CSS and JavaScript. All photos and outfits stay on your device (IndexedDB).

## Features

- **Digitize clothes**: take a photo with the camera or upload several from your gallery (drag & drop works on desktop too).
- **Background removal**: auto-removes plain backgrounds (floor, bed, wall). You can fix the result with the magic wand, erase and restore brushes, and undo. The piece is then cropped to a transparent PNG.
- **Wardrobe**: items sorted into tops, bottoms, dresses, outerwear, shoes, hats and accessories. You can filter, rename, recategorize and delete them.
- **Dress up**: tap a piece to put it on. It snaps to the right spot on the body, and clashing pieces swap out (e.g. a dress replaces a top and bottom). Drag to move. Pinch and twist to resize and rotate (mouse wheel / shift+wheel on desktop). The toolbar can also mirror an item and change its layer order. Shuffle builds a random outfit.
- **Outfits**: save looks, reopen them later, share or download them as images.
- **Avatar**: skin tone, body shape, hair style and colour, eye colour, basics colour.
- **Installable PWA** that works offline once it has loaded.

## Running it

Opening `index.html` directly works for a quick look. Use a local server for the full experience: offline mode and "Add to Home Screen" need http(s).

```sh
# any static server works, e.g.
python -m http.server 8080
# then open http://localhost:8080
```

To use it on your phone, host the folder on any static host with HTTPS (GitHub Pages, Netlify, Cloudflare Pages…). Then open it on the phone and choose **Add to Home Screen**. The camera button opens the phone's camera directly.

## Tips for good cut-outs

- Lay the item flat on a plain, contrasting surface and photograph it straight from above.
- Avoid harsh shadows. If some background is left, raise **Sensitivity** and tap it with the wand.
- Photograph shoes as a pair and tops with the sleeves spread out. They will line up with the avatar better.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | App shell, views and dialogs |
| `css/styles.css` | Styles (light & dark) |
| `js/config.js` | Categories / placement rules, helpers |
| `js/db.js` | IndexedDB storage |
| `js/avatar.js` | SVG avatar generator |
| `js/editor.js` | Photo background-removal editor |
| `js/stage.js` | Dress-up stage, gestures, image export |
| `js/app.js` | Views, wardrobe, outfits, avatar settings |
| `sw.js`, `manifest.webmanifest` | Offline + install support |
