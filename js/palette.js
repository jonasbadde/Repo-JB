// Warm, soft colours inspired by Ghibli backgrounds.
export const PALETTE = {
  skyTop: '#8fc3e0',
  skyBottom: '#f7dcb4',
  cloud: 'rgba(255, 255, 255, 0.85)',
  hillFar: '#a9c8a4',
  hillNear: '#7fae7d',

  // Evening sky, faded in over the day sky by the day/dusk toggle.
  eveningTop: '#3d3f6e',
  eveningMiddle: '#c7708a',
  eveningBottom: '#f4a96b',
  star: 'rgba(255, 248, 225, 0.9)',
  duskTint: '#8074a8', // the whole scene is multiplied by this at dusk
  glow: '#ffc478', // warm lantern light

  tatami: '#cfc47e',
  tatamiAlt: '#c4b972',
  tatamiWeave: 'rgba(110, 100, 40, 0.18)',
  tatamiEdge: '#3f5a3a', // the green cloth border ("heri")
  tatamiLight: '#dcd291', // sunny side of a mat
  heriPattern: 'rgba(225, 215, 160, 0.35)', // woven pattern on the heri
  tatamiWorn: 'rgba(255, 250, 220, 0.12)', // paler patches where people walk

  shoji: '#f6efdc',
  shojiShade: '#e9dfc6', // left wall is a little darker (light comes from the right)
  paperFibre: 'rgba(150, 125, 85, 0.13)', // fibres in washi paper
  latticeLight: 'rgba(255, 244, 220, 0.6)', // lit edge of a lattice strip
  clear: 'rgba(255, 244, 220, 0)', // fully see-through, for the ends of gradients
  plaster: '#d9c39a',
  wood: '#6b4430',
  woodDark: '#3b2418',
  woodLight: '#9a6a48',
  floorSlab: '#5a3a28',
  plasterShade: '#cdb68c', // inside the tokonoma alcove
  plasterSpeck: 'rgba(120, 95, 60, 0.25)',
  goldFleck: 'rgba(235, 200, 110, 0.75)', // gold leaf on the fusuma
  glazeShine: 'rgba(255, 250, 235, 0.75)',

  // Sliding fusuma doors: thick paper with an ink-and-gold mountain painting.
  fusuma: '#efe4c8',
  fusumaInk: 'rgba(80, 100, 95, 0.55)',
  fusumaMist: 'rgba(217, 184, 102, 0.55)',

  // Hanging scroll (kakejiku) in the tokonoma.
  scrollMount: '#5b6b5a',
  scrollPaper: '#f3ead2',
  scrollInk: '#2f2a26',

  // Floors outside the tatami room.
  stone: '#b7b0a3',
  stoneAlt: '#aaa396',
  stoneJoint: 'rgba(70, 60, 50, 0.35)',
  planks: '#a8774f',
  planksAlt: '#9c6d47',
  plankGap: 'rgba(50, 30, 20, 0.45)',
  knot: 'rgba(60, 35, 20, 0.55)',
  nail: 'rgba(40, 35, 35, 0.7)',
  stoneBevelLight: 'rgba(255, 252, 240, 0.35)',
  stoneSpeck: 'rgba(80, 70, 60, 0.35)',
  straw: '#d8c58e', // straw sandals

  // Garden and surroundings.
  moss: '#86a868',
  mossAlt: '#7d9f60',
  mossSpeck: 'rgba(60, 90, 40, 0.35)',
  grassFar: '#9cbc82',
  gravel: '#cfc6b2',
  steppingStone: '#9d978c',
  steppingStoneTop: '#b4aea2',
  water: '#5f9fb0',
  waterDeep: '#467f94',
  waterShine: 'rgba(255, 255, 255, 0.45)',
  pondRim: '#8d8679',
  foundation: '#8a8378', // stone footings under the raised floors
  foundationDark: '#6f685e',
  underFloor: '#2e2219', // shadowy gap under the engawa
  bamboo: '#b5a15a',
  bambooDark: '#8a7a3e',
  bambooTie: '#4a3a24',
  shadow: 'rgba(30, 30, 20, 0.22)',
  soil: '#7a5a3c', // the cut edge of the ground the house stands on
  soilDark: '#5e4430',
  tuft: 'rgba(70, 105, 50, 0.5)',
  treeDark: '#557f52',
  treeLight: '#6f9a66',
  trunk: '#5a4232',

  // Furniture and garden objects.
  lacquer: '#4a2a1f', // low table top
  lacquerShine: 'rgba(255, 228, 200, 0.22)', // reflection on the lacquer
  woodGrain: 'rgba(30, 15, 8, 0.22)',
  cushionLight: '#a65e6e', // the puffed-up middle of a cushion
  cushionSeam: 'rgba(55, 18, 28, 0.45)',
  thread: '#e8d9b0', // the tie in the middle of a zabuton
  cushion: '#8e4b5a',
  cushionSide: '#6e3846',
  vase: '#3e5c6b',
  blossom: '#f2b8c6',
  lanternPaper: '#f7e6bf',
  lanternPaperShade: '#e8d2a3',
  lanternLight: '#ffd27a', // the lit opening of the stone lantern
  lanternStone: '#a29c90',
  lanternStoneShade: '#837d72',
  lanternStoneTop: '#b8b2a6',
  maple: '#c8553d',
  mapleLight: '#e07a4f',
  mapleDark: '#9e3b2e',
  mapleShadow: '#933a2c',
  barkLight: 'rgba(160, 125, 100, 0.6)',
  lichen: 'rgba(150, 165, 95, 0.75)',
  koi: '#e8793f',
  koiWhite: '#f6efe4',
  waterSky: 'rgba(200, 230, 245, 0.35)', // the sky reflected on the pond
  mossLight: 'rgba(190, 215, 140, 0.16)',
  mossDeep: 'rgba(55, 85, 40, 0.13)',
  treeShadow: '#46694a',

  // Roof.
  roofTile: '#5d6470', // grey-blue fired clay (kawara)
  roofTileDark: '#454b55',
  roofRidge: '#3a3f48',
  roofTileLight: 'rgba(170, 182, 200, 0.55)', // glaze catching the sky
  roofCourseShadow: 'rgba(25, 28, 35, 0.25)',

  duskTop: '#f0a46b',
  duskBottom: '#fbe3a8',
  sun: '#fff4cf',
  mountain: '#b98c8a',
  pagoda: '#4a2a2a',

  // The avatar: an indigo yukata with a moss-green obi, wooden geta.
  yukata: '#3b4a7a',
  yukataShade: '#2b365e',
  yukataLight: 'rgba(140, 155, 210, 0.7)', // the robe's edge catching the light
  obiStripe: 'rgba(225, 235, 190, 0.6)',
  hairSheen: 'rgba(150, 130, 120, 0.7)',
  yukataPattern: 'rgba(244, 236, 216, 0.6)', // hemp-leaf (asanoha) marks
  collar: '#f4ecd8',
  obiKnot: '#5f8048',
  skin: '#f3d6b8',
  skinShade: '#e3b894',
  blush: 'rgba(224, 120, 120, 0.45)',
  hair: '#2f2622',
  hairTie: '#d9b866',
  eye: '#2f2a26',
  pathDot: '#fff3c4', // the planned walk, shown briefly on the floor

  // Light and small life.
  contactShadow: 'rgba(40, 25, 15, 0.35)', // soft shadow right under furniture
  cornerShade: 'rgba(40, 25, 15, 0.22)', // where floor meets wall
  sunPatch: 'rgba(255, 238, 190, 0.32)', // daylight through the shoji
  sunBeam: 'rgba(255, 236, 190, 0.16)', // daylight hanging in the air
  dust: 'rgba(255, 246, 220, 0.8)',
  steam: 'rgba(255, 255, 250, 0.35)',
  grainLight: '#fff8e6',
  grainDark: '#3b2418',
  teapot: '#5b4636',
  teapotShine: 'rgba(255, 230, 200, 0.35)',
  teacup: '#efe6d2',
  tea: '#8c8a3c',

  // Moving furniture: the footprint shows where it can (or can't) go.
  placeOk: 'rgba(150, 205, 120, 0.45)',
  placeOkStroke: '#d8f0c4',
  placeBad: 'rgba(225, 110, 90, 0.45)',

  hoverFill: 'rgba(255, 244, 200, 0.45)',
  hoverStroke: '#fff3c4',
  hoverBlocked: '#f0b4a0', // outline for tiles you can't walk on
};
