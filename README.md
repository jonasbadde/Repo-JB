# Tea House

A small Habbo Hotel–style isometric room game with a Ghibli-inspired
Japanese look. Plain HTML + JavaScript modules + `<canvas>`, no build step.

## Run

Browsers block ES modules on `file://` URLs, so serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

(`npx serve` or the VS Code "Live Server" extension work too.)

## Code layout

| File | Purpose |
|---|---|
| `js/iso.js` | Isometric projection math (grid ⇄ screen) |
| `js/room.js` | Room data model (size, tiles) |
| `js/palette.js` | Colours for the art style |
| `js/scenery.js` | Sky backdrop and the pagoda view through the window |
| `js/roomRenderer.js` | Draws walls, floor and the hover highlight |
| `js/main.js` | Canvas setup, input, render loop |

## Roadmap

1. ✅ Isometric room with hover highlight
2. Avatar that walks to a clicked tile (pathfinding)
3. Furniture: place, rotate, pick up
4. Chat bubbles
5. Multiplayer (Node + WebSocket)
