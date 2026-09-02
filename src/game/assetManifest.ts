import type Phaser from 'phaser';

export const IMAGE_ASSETS = {
  'title-cover': 'assets/art/ui/title-cover.webp',
  'title-bg-color': 'assets/art/ui/title-bg-color.webp',
  'title-bg-mono': 'assets/art/ui/title-bg-mono.webp',
  'title-wordmark': 'assets/art/ui/title-wordmark.webp',
  'time-vortex': 'assets/art/backgrounds/time-vortex.png',
  'bgnarator': 'assets/art/backgrounds/narrator.png',
  'bunker-underground': 'assets/art/backgrounds/bunker-underground.jpg',
  'lab-military': 'assets/art/backgrounds/lab-military.jpg',
  'lab-final': 'assets/art/backgrounds/lab-final.jpg',
  'elena-dialog': 'assets/art/characters/elena-dialog.png',
  'elena-dialog-sad': 'assets/art/characters/elena-dialog-sad.png',
  'pose-elena-hold': 'assets/art/characters/pose-elena-hold.png',
  'pose-elena-kneel': 'assets/art/characters/pose-elena-kneel.png',
  'pose-elena-resolve': 'assets/art/characters/pose-elena-resolve.png',
  'pose-arthur-muda-vial': 'assets/art/characters/pose-arthur-muda-vial.png',
  'pose-arthur-tua-reach': 'assets/art/characters/pose-arthur-tua-reach.png',
  'bg1944-far': 'assets/art/backgrounds/bg1944_far.png',
  'bg1944-mid': 'assets/art/backgrounds/bg1944_mid.png',
  'bg1944-fg': 'assets/art/backgrounds/bg1944_fg.png',
  'bg1968A-far': 'assets/art/backgrounds/bg1968A_far.png',
  'bg1968A-mid': 'assets/art/backgrounds/bg1968A_mid.png',
  'bg1968A-fg': 'assets/art/backgrounds/bg1968A_fg.png',
  'bg1968B-far': 'assets/art/backgrounds/bg1968B_far.png',
  'bg1968B-mid': 'assets/art/backgrounds/bg1968B_mid.png',
  'bg1968B-fg': 'assets/art/backgrounds/bg1968B_fg.png',
  'bg1999-far': 'assets/art/backgrounds/bg1999_far.png',
  'bg1999-mid': 'assets/art/backgrounds/bg1999_mid.png',
  'bg1999-fg': 'assets/art/backgrounds/bg1999_fg.png',
  'watch-repair-art': 'assets/art/minigames/watch-repair.png',
  'rose-bottle-broken': 'assets/art/minigames/rose-bottle-broken.png',
  'water-gem-art': 'assets/art/minigames/water-gem.jpg',
  'elena-arthur-photo': 'assets/art/minigames/elena-arthur-photo.png',
  'watch-prop': 'assets/art/props/prop_watch1944.png',
  'spotlight-prop': 'assets/art/props/prop_spotlight1944.png',
  'crate-prop': 'assets/art/props/prop_crate1944.png',
  'diary-prop': 'assets/art/props/prop_diary1968.png',
  'tape-prop': 'assets/art/props/prop_tape1968.png',
  'cryolog-prop': 'assets/art/props/prop_cryolog1999.png',
  'bonus-puzzle-board': 'assets/art/bonus/puzzle-board.jpg',
  'bonus-city-complete': 'assets/art/bonus/city-complete.jpg',
} as const;

export const BONUS_IMAGE_ASSETS = {
  'bg2088-far': 'assets/art/backgrounds/bg2088_far.png',
  'bg2088-near': 'assets/art/backgrounds/bg2088_near.png',
  'bg2088-fg': 'assets/art/backgrounds/bg2088_fg.png',
  'bonus-diff-art': 'assets/art/bonus/spot-difference.png',
  'bonus-mawar-art': 'assets/art/bonus/rose.jpg',
  'bonus-mawar2-art': 'assets/art/bonus/rose-variant.jpg',
  'bonus-dinner-bg': 'assets/art/bonus/dinner.jpg',
  'food-spaghetti': 'assets/art/bonus/spaghetti.jpg',
  'food-nasi': 'assets/art/bonus/nasi-goreng.jpg',
  'food-udang': 'assets/art/bonus/cheese-shrimp.jpg',
  'food-steak': 'assets/art/bonus/steak.jpg',
  'bonus-cats-art': 'assets/art/bonus/cats.jpg',
  'bonus-chem-glass': 'assets/art/bonus/chemistry-glass.jpg',
  'bonus-love-glass': 'assets/art/bonus/love-glass.jpg',
} as const;

export const PROP_SHEET_ASSETS = {
  'prop-flag1944': 'assets/art/props/prop_flag1944.png',
  'prop-lantern1944': 'assets/art/props/prop_lantern1944.png',
  'prop-flare1944': 'assets/art/props/prop_flare1944.png',
  'prop-bulb1968A': 'assets/art/props/prop_bulb1968A.png',
  'prop-radio1968A': 'assets/art/props/prop_radio1968A.png',
  'prop-beacon1968B': 'assets/art/props/prop_beacon1968B.png',
  'prop-steam1968B': 'assets/art/props/prop_steam1968B.png',
  'prop-consoleWave1999': 'assets/art/props/prop_consoleWave1999.png',
  'prop-frost1999': 'assets/art/props/prop_frost1999.png',
} as const;

export const BONUS_PROP_SHEET_ASSETS = {
  'prop-barrel2088': 'assets/art/props/prop_barrel2088.png',
  'prop-poster2088': 'assets/art/props/prop_poster2088.png',
} as const;

export const CHARACTER_SHEET_ASSETS = {
  'elena': 'assets/art/characters/elena_sheet.png',
  'elena-walk': 'assets/art/characters/elena-walk.png',
  'arthur-muda': 'assets/art/characters/arthur_muda_sheet.png',
  'arthur-dewasa': 'assets/art/characters/arthur_dewasa_sheet.png',
  'arthur-buron': 'assets/art/characters/arthur_buron_sheet.png',
  'arthur-tua': 'assets/art/characters/arthur_tua_sheet.png',
} as const;

export const AUDIO_ASSETS = {
  'step-mud-0': 'assets/audio/footstep00.wav',
  'step-mud-1': 'assets/audio/footstep03.wav',
  'step-mud-2': 'assets/audio/footstep05.wav',
  'step-metal': 'assets/audio/footstep08.wav',
  'flip': 'assets/audio/bookFlip1.wav',
  'flip2': 'assets/audio/bookFlip2.wav',
  'click': 'assets/audio/metalClick.wav',
  'creak': 'assets/audio/creak2.wav',
  'rain': 'assets/audio/rain.wav',
  'wind': 'assets/audio/wind.wav',
  'fire': 'assets/audio/fire.wav',
  'hum': 'assets/audio/hum.wav',
} as const;

const ALL_IMAGE_ASSETS = { ...IMAGE_ASSETS, ...BONUS_IMAGE_ASSETS } as const;
const ALL_PROP_SHEET_ASSETS = { ...PROP_SHEET_ASSETS, ...BONUS_PROP_SHEET_ASSETS } as const;

type ImageKey = keyof typeof ALL_IMAGE_ASSETS;
type PropSheetKey = keyof typeof ALL_PROP_SHEET_ASSETS;
type CharacterSheetKey = keyof typeof CHARACTER_SHEET_ASSETS;
type AudioKey = keyof typeof AUDIO_ASSETS;

export type AssetPack = Readonly<{
  images?: readonly ImageKey[];
  propSheets?: readonly PropSheetKey[];
  characterSheets?: readonly CharacterSheetKey[];
  audio?: readonly AudioKey[];
}>;

const COMMON_SFX = ['flip', 'flip2', 'click', 'creak'] as const;
const FOOTSTEPS = ['step-mud-0', 'step-mud-1', 'step-mud-2', 'step-metal'] as const;

export const ASSET_PACKS = {
  startup: {
    images: ['title-cover', 'title-bg-color', 'title-bg-mono', 'title-wordmark'],
  },
  title: {
    audio: ['wind'],
  },
  prologue: {
    images: ['bgnarator', 'elena-dialog', 'elena-dialog-sad', 'pose-elena-resolve'],
    characterSheets: ['elena'],
    audio: [...COMMON_SFX, 'wind', 'fire'],
  },
  vortex: {
    images: ['time-vortex'],
  },
  era1944: {
    images: [
      'elena-dialog', 'elena-dialog-sad', 'pose-arthur-muda-vial',
      'bg1944-far', 'bg1944-mid', 'bg1944-fg',
      'watch-prop', 'spotlight-prop', 'crate-prop',
    ],
    propSheets: ['prop-flag1944', 'prop-lantern1944', 'prop-flare1944'],
    characterSheets: ['elena', 'elena-walk', 'arthur-muda'],
    audio: [...COMMON_SFX, ...FOOTSTEPS, 'rain', 'wind'],
  },
  era1968: {
    images: [
      'bunker-underground', 'lab-military', 'elena-dialog', 'elena-dialog-sad',
      'bg1968A-far', 'bg1968A-mid', 'bg1968A-fg',
      'bg1968B-far', 'bg1968B-mid', 'bg1968B-fg',
      'rose-bottle-broken', 'diary-prop', 'tape-prop',
    ],
    propSheets: ['prop-bulb1968A', 'prop-radio1968A', 'prop-beacon1968B', 'prop-steam1968B'],
    characterSheets: ['elena', 'elena-walk', 'arthur-dewasa', 'arthur-buron'],
    audio: [...COMMON_SFX, ...FOOTSTEPS, 'hum'],
  },
  era1999: {
    images: [
      'lab-final', 'elena-dialog', 'elena-dialog-sad', 'pose-elena-hold',
      'pose-elena-kneel', 'pose-arthur-tua-reach',
      'bg1999-far', 'bg1999-mid', 'bg1999-fg',
      'water-gem-art', 'elena-arthur-photo', 'cryolog-prop',
    ],
    propSheets: ['prop-consoleWave1999', 'prop-frost1999'],
    characterSheets: ['elena', 'elena-walk', 'arthur-tua'],
    audio: [...COMMON_SFX, ...FOOTSTEPS, 'hum'],
  },
  watchRepair: {
    images: ['watch-repair-art'],
  },
  puzzleAward: {
    images: ['lab-final', 'bonus-puzzle-board', 'bonus-city-complete'],
    characterSheets: ['elena', 'arthur-tua'],
    audio: COMMON_SFX,
  },
  bonus: {
    images: [
      ...(Object.keys(BONUS_IMAGE_ASSETS) as ImageKey[]),
      'watch-repair-art', 'rose-bottle-broken', 'water-gem-art',
      'bonus-puzzle-board', 'bonus-city-complete',
    ],
    propSheets: Object.keys(BONUS_PROP_SHEET_ASSETS) as PropSheetKey[],
    characterSheets: ['elena', 'elena-walk', 'arthur-tua'],
    audio: [...COMMON_SFX, ...FOOTSTEPS, 'wind', 'fire'],
  },
} as const satisfies Record<string, AssetPack>;

export const ERA_ASSET_PACKS = {
  '1944': ASSET_PACKS.era1944,
  '1968': ASSET_PACKS.era1968,
  '1999': ASSET_PACKS.era1999,
  '2088': ASSET_PACKS.bonus,
} as const;

export function loadAssetPacks(scene: Phaser.Scene, ...packs: readonly AssetPack[]): number {
  const images = new Set(packs.flatMap(pack => pack.images ?? []));
  const propSheets = new Set(packs.flatMap(pack => pack.propSheets ?? []));
  const characterSheets = new Set(packs.flatMap(pack => pack.characterSheets ?? []));
  const audio = new Set(packs.flatMap(pack => pack.audio ?? []));
  let queued = 0;

  images.forEach((key) => {
    if (scene.textures.exists(key)) return;
    scene.load.image(key, ALL_IMAGE_ASSETS[key]);
    queued += 1;
  });
  propSheets.forEach((key) => {
    if (scene.textures.exists(key)) return;
    scene.load.spritesheet(key, ALL_PROP_SHEET_ASSETS[key], { frameWidth: 200, frameHeight: 200 });
    queued += 1;
  });
  characterSheets.forEach((key) => {
    if (scene.textures.exists(key)) return;
    scene.load.spritesheet(key, CHARACTER_SHEET_ASSETS[key], { frameWidth: 150, frameHeight: 210 });
    queued += 1;
  });
  audio.forEach((key) => {
    if (scene.cache.audio.exists(key)) return;
    scene.load.audio(key, AUDIO_ASSETS[key]);
    queued += 1;
  });

  return queued;
}

export const STATIC_ASSETS = [
  ...new Set([
    ...Object.values(ALL_IMAGE_ASSETS),
    ...Object.values(ALL_PROP_SHEET_ASSETS),
    ...Object.values(CHARACTER_SHEET_ASSETS),
    ...Object.values(AUDIO_ASSETS),
    'assets/video/intro.mp4',
    'assets/fonts/OFL-Cinzel-Poppins.txt',
  ]),
] as const;
