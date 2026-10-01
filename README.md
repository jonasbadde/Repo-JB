# Tea House

A small Habbo Hotel–style isometric game with a Ghibli-inspired Japanese
look: a little tea house with a tatami room, an entrance hall (genkan), a
veranda (engawa) and a garden. Plain HTML + JavaScript modules + `<canvas>`,
no build step.

Play it at https://jonasbadde.github.io/Repo-JB/

| Standing in the genkan | Walking out to the garden | Sitting at dusk |
|---|---|---|
| ![Avatar standing](docs/screenshots/standing.png) | ![Avatar walking](docs/screenshots/walking.png) | ![Avatar sitting at dusk](docs/screenshots/sitting-dusk.png) |

| Furniture menu | Moving: doesn't fit | Moving: fits (turned with R) | Picked up into the tray |
|---|---|---|---|
| ![Menu over the table](docs/screenshots/furniture-menu.png) | ![Red footprint over the cushions](docs/screenshots/furniture-blocked.png) | ![Green footprint, table turned](docs/screenshots/furniture-moving.png) | ![Tray at dusk](docs/screenshots/furniture-tray-dusk.png) |

## Controls

| Input | Does |
|---|---|
| Mouse over a tile | Highlights it; the box bottom-left names the area |
| Click a tile | Walk there along the shortest path (a blocked tile: walk next to it) |
| Click a cushion | Walk there and sit down facing the table (or the way the cushion is turned) |
| Click the table, a cushion or a paper lantern | Open its menu: **Move**, **Rotate**, **Pick up** |
| While moving furniture | It follows the mouse, green where it fits and red where it doesn't; click to put it down, `R` turns it, `Esc` puts it back |
| `R` | Turn the selected furniture a quarter turn |
| Furoshiki tray (bottom) | Picked-up furniture; click one to place it again |
| Reset room button | Put all the furniture back where it started |
| Drag, mouse wheel / trackpad, arrow keys | Scroll the view (and stop following the avatar until the next click) |
| `Home` | Recentre the view |
| Day/Dusk button or `N` | Switch the time of day |

## Run

Browsers block ES modules on `file://` URLs, so serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

(`npx serve` or the VS Code "Live Server" extension work too.)

## Tests

The pathfinding and furniture rules have checks that need nothing but Node:

```sh
node tests/pathfinding.test.mjs
node tests/furniture.test.mjs
```

## Changing the layout

The building is drawn as a text map at the top of `js/room.js`, one letter
per tile (`T` tatami, `K` tokonoma, `S` stone, `W` veranda planks, `.` moss,
`:` stepping stone, `P` pond). Change the letters and reload. Walls are
worked out from the map automatically; doorways and steps are listed just
below it. The starting furniture and what hangs on the back walls are
listed in `js/decor.js`.

## Furniture

The table, cushions and paper lanterns can be moved, turned and picked
up (the vase, stone lantern and maple stay put). Furniture goes indoors
or on the engawa, on free, level floor, never where the avatar stands,
and never where it would cut part of the floor off from the rest. Your
layout is saved in the browser, so it is still there after a reload;
**Reset room** brings back the original.

## Code layout

| File | Purpose |
|---|---|
| `js/main.js` | Canvas setup, hover picking, click to walk, day/dusk toggle, render loop |
| `js/iso.js` | Isometric projection math (grid ⇄ screen, with heights) |
| `js/room.js` | Building data: the tile map, walls, doorways, walkability |
| `js/decor.js` | Starting furniture and garden objects, back-wall panels (data only) |
| `js/furniture.js` | Furniture rules: what moves, where it may go, the tray, saving |
| `js/furnitureUI.js` | Selecting furniture, its menu, moving with a ghost, the tray |
| `js/pathfinding.js` | A* shortest path in 8 directions, following `canStepBetween` |
| `js/avatar.js` | The avatar's position, walking, stepping between heights and sitting |
| `js/avatarRenderer.js` | Draws the avatar (8 directions, walk cycle, sitting) and the path dots |
| `js/camera.js` | Scrolling with drag, wheel and arrow keys; telling clicks from drags; following the avatar |
| `js/renderer.js` | Draws everything in back-to-front (depth-sorted) order |
| `js/floorRenderer.js` | Floor tiles (tatami, stone, planks, moss, pond) and raised-floor sides |
| `js/wallRenderer.js` | Back walls, cut-down front walls and the roof |
| `js/decorRenderer.js` | Furniture and garden objects |
| `js/ground.js` | Grass plot, trees and bamboo fence around the house |
| `js/lighting.js` | Dusk tint and lantern glow |
| `js/scenery.js` | Sky backdrop and the pagoda view through the window |
| `js/palette.js` | Colours for the art style |
| `js/draw.js` | Small shared canvas helpers |

## Roadmap

1. ✅ Isometric room with hover highlight
2. ✅ Tea house: three areas with raised floors, roof, garden, decorations, scrolling, day/dusk
3. ✅ Avatar that walks to a clicked tile (A* pathfinding, sitting on cushions, camera follow)
4. ✅ Furniture: place, rotate, pick up (with a tray and a saved layout)
5. Chat bubbles
6. Multiplayer (Node + WebSocket; needs a server, so not on GitHub Pages)
