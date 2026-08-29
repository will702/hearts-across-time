/* Palet & tipografi kit "kertas & tinta" — satu sumber kebenaran gaya komik
   buku harian perang. Nilai dipindahkan 1:1 dari runtime legacy
   (legacy/src/render/world.js + legacy/src/ui/dialog.js). */

export const FONT = {
  UI: '"Patrick Hand","Trebuchet MS",sans-serif',
  TITLE: '"Cinzel",Georgia,serif',
  META: '"Poppins","Trebuchet MS",sans-serif',
} as const;

/* Bentuk string CSS (untuk Phaser.GameObjects.Text) */
export const CSS = {
  paper: '#F3EADA',
  ink: '#1E1710',
  body: '#2B211A',
  bodySoft: 'rgba(43,33,26,.62)',
  bodyFaint: 'rgba(43,33,26,.58)',
  red: '#94342E',
  redDark: '#6D211D',
  redBright: '#A83E38',
  green: '#567A61',
  greenBright: '#5F9270',
  gold: '#F1D58B',
  goldBright: '#F7D984',
  goldPale: '#FFF0A0',
  goldSoft: '#F0CD82',
  brass: '#B98A3D',
  watchFace: '#E8DAB7',
  warmLift: '#E9DABC',
  screenBg: '#0a0806',
  paperHi: '#FAF3E8',
} as const;

/* Bentuk numerik 0x (untuk Graphics/Rectangle/tint Phaser) */
export const INK = 0x1e1710;
export const BODY = 0x2b211a;
export const RED = 0x94342e;
export const RED_DARK = 0x6d211d;
export const RED_BRIGHT = 0xa83e38;
export const GREEN = 0x567a61;
export const GREEN_BRIGHT = 0x5f9270;
export const GOLD = 0xf1d58b;
export const GOLD_BRIGHT = 0xf7d984;
export const GOLD_PALE = 0xfff0a0;
export const BRASS = 0xb98a3d;
export const PAPER = 0xf3eada;

/* Cap tinta label nama per pembicara (dialog.js WHO) */
export const NAME_CHIP: Record<string, number> = {
  elena: 0xa85550,
  dewasa: 0x556b7f,
  muda: 0x6b7547,
  buron: 0x7e6247,
  tua: 0x77715f,
  narrator: 0x000000,
};

export const NAME_LABEL: Record<string, string> = {
  elena: 'ELENA',
  dewasa: 'ARTHUR',
  muda: 'ARTHUR',
  buron: 'ARTHUR',
  tua: 'ARTHUR TUA',
};

/* Tint grading per era (world.js grade()) */
export const ERA_TINT: Record<string, string> = {
  '1944': 'rgba(140,70,30,.10)',
  '1968A': 'rgba(50,38,26,.22)',
  '1968B': 'rgba(28,58,70,.12)',
  '1999': 'rgba(26,60,96,.14)',
  '2088': 'rgba(96,74,52,.14)',
};

/* Warna aksen progres per era (screens.js intro era) */
export const ERA_ACCENT: Record<string, number> = {
  '1944': 0xa85550,
  '1968A': 0x6b91a8,
  '1968B': 0x5d91a9,
  '1999': 0x64a3bc,
  '2088': 0xc084fc,
};
