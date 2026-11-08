/* Kit kertas & tinta (gaya komik perang) — port Phaser dari sketchRR/inkTag
   legacy (legacy/src/render/world.js). Panel dipanggang menjadi CanvasTexture
   sekali per ukuran lalu dipakai seperti texture biasa. */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CSS, FONT } from './theme';

const TAU = Math.PI * 2;
const SHADOW_PAD = 18; // ruang untuk blur bayangan 11 + offset 3 + goresan jitter

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}

function rrPathPts(x: number, y: number, w: number, h: number, r: number, step = 13): number[][] {
  const pts: number[][] = [];
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const seg = (x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < n; i++) pts.push([lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
  };
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * r / step) + 1);
    for (let i = 0; i < n; i++) {
      const a = lerp(a0, a1, i / n);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  seg(x + r, y, x + w - r, y); arc(x + w - r, y + r, -Math.PI / 2, 0);
  seg(x + w, y + r, x + w, y + h - r); arc(x + w - r, y + h - r, 0, Math.PI / 2);
  seg(x + w - r, y + h, x + r, y + h); arc(x + r, y + h - r, Math.PI / 2, Math.PI);
  seg(x, y + h - r, x, y + r); arc(x + r, y + r, Math.PI, Math.PI * 1.5);
  return pts;
}

/* Tekstur butir kertas 256×256 (dipakai panel & overlay multiply) */
let paperTile: HTMLCanvasElement | null = null;
function getPaperTile(): HTMLCanvasElement {
  if (paperTile) return paperTile;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const px = cv.getContext('2d')!;
  const r = mulberry32(77);
  px.fillStyle = '#FFFFFF';
  px.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2200; i++) {
    const v = 222 + ((r() * 33) | 0);
    px.fillStyle = `rgb(${v},${Math.max(0, v - 5 - ((r() * 9) | 0))},${Math.max(0, v - 14 - ((r() * 16) | 0))})`;
    px.fillRect((r() * 256) | 0, (r() * 256) | 0, 1, 1);
  }
  for (let i = 0; i < 140; i++) {
    px.strokeStyle = `rgba(120,100,70,${0.025 + r() * 0.045})`;
    px.lineWidth = 0.8;
    const x = r() * 256, y = r() * 256, a = r() * TAU, l = 3 + r() * 9;
    px.beginPath(); px.moveTo(x, y); px.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); px.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const x = r() * 256, y = r() * 256, rad = 10 + r() * 28;
    const g = px.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(146,116,74,${0.04 + r() * 0.03})`);
    g.addColorStop(1, 'rgba(146,116,74,0)');
    px.fillStyle = g; px.beginPath(); px.arc(x, y, rad, 0, TAU); px.fill();
  }
  paperTile = cv;
  return cv;
}

export interface PaperPanelOptions {
  radius?: number;
  fill?: string;
  ink?: string;
  shadow?: boolean;
  pad?: number;
}

/** Panel kertas + goresan tinta ganda — dipanggang ke CanvasTexture (cache per ukuran). */
export function ensurePaperTexture(scene: Phaser.Scene, w: number, h: number, opt: PaperPanelOptions = {}): { key: string; pad: number } {
  const radius = opt.radius ?? 7;
  const key = `paper-${Math.round(w)}x${Math.round(h)}-r${radius}-${opt.shadow === false ? 'n' : 's'}`;
  const pad = opt.pad ?? SHADOW_PAD;
  if (!scene.textures.exists(key)) {
    const ct = scene.textures.createCanvas(key, Math.ceil(w + pad * 2), Math.ceil(h + pad * 2));
    if (ct) {
      const c = ct.getContext() as unknown as CanvasRenderingContext2D;
      drawSketchRR(c, pad, pad, w, h, radius, opt);
      ct.refresh();
    }
  }
  return { key, pad };
}

/** sketchRR legacy: isi kertas + bayangan + serat multiply + goresan tinta 2 pass. */
export function drawSketchRR(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, opt: PaperPanelOptions = {}): void {
  const ink = opt.ink ?? CSS.ink;
  const base = opt.fill ?? CSS.paper;
  c.save();
  if (opt.shadow !== false) {
    c.shadowColor = 'rgba(0,0,0,.32)';
    c.shadowBlur = 11;
    c.shadowOffsetY = 3;
  }
  c.fillStyle = base;
  rr(c, x, y, w, h, r);
  c.fill();
  c.shadowColor = 'transparent';
  c.save();
  rr(c, x, y, w, h, r);
  c.clip();
  c.globalCompositeOperation = 'multiply';
  const pat = c.createPattern(getPaperTile(), 'repeat');
  if (pat) { c.fillStyle = pat; c.fillRect(x - 2, y - 2, w + 4, h + 4); }
  c.restore();
  const seed = mulberry32(((((Math.round(x) * 71) ^ (Math.round(y) * 193) ^ (Math.round(w) * 389) ^ (Math.round(h) * 997)) >>> 0) || 5));
  const pts = rrPathPts(x, y, w, h, Math.min(r, w / 2, h / 2));
  for (let k = 0; k < 2; k++) {
    c.strokeStyle = k ? 'rgba(30,23,16,.45)' : ink;
    c.lineWidth = k ? 1 : 2.1;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    const dx = k ? 0.9 : 0, dy = k ? -0.7 : 0, j = k ? 2.8 : 1.7;
    c.beginPath();
    pts.forEach(([qx, qy], i) => {
      const sx = qx + (seed() - 0.5) * j + dx, sy = qy + (seed() - 0.5) * j + dy;
      if (i) c.lineTo(sx, sy); else c.moveTo(sx, sy);
    });
    c.closePath();
    c.stroke();
  }
  c.restore();
}

/** Tambahkan panel kertas sebagai Image; (x,y) = sudut kiri-atas area panel. */
export function addPaperPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, opt: PaperPanelOptions = {}): Phaser.GameObjects.Image {
  const { key, pad } = ensurePaperTexture(scene, w, h, opt);
  return scene.add.image(x - pad, y - pad, key).setOrigin(0, 0);
}

/** Cap tinta label nama (inkTag legacy) — texture chip + teks label di Container miring. */
export function addInkTag(scene: Phaser.Scene, x: number, y: number, label: string, chip: number, rot = -0.028): Phaser.GameObjects.Container {
  const key = `inktag-${label}`;
  const font = `bold 12px ${FONT.UI}`;
  const tw = Math.ceil(measureText(label, font)) + 16;
  if (!scene.textures.exists(key)) {
    const ct = scene.textures.createCanvas(key, Math.ceil(tw + 6), 25);
    if (ct) {
      const c = ct.getContext() as unknown as CanvasRenderingContext2D;
      c.fillStyle = `#${chip.toString(16).padStart(6, '0')}`;
      rr(c, 3, 3, tw, 19, 4);
      c.fill();
      c.strokeStyle = CSS.ink;
      c.lineWidth = 1.4;
      rr(c, 3, 3, tw, 19, 4);
      c.stroke();
      c.strokeStyle = 'rgba(30,23,16,.4)';
      c.lineWidth = 0.8;
      rr(c, 3.9, 3.9, tw, 19, 4);
      c.stroke();
      ct.refresh();
    }
  }
  const container = scene.add.container(x, y);
  const img = scene.add.image(0, 0, key).setOrigin(0, 0);
  const text = scene.add.text(3 + tw / 2, 12.5, label, {
    color: CSS.paper,
    fontFamily: FONT.UI,
    fontStyle: 'bold',
    fontSize: '12px',
  }).setOrigin(0.5);
  container.add([img, text]);
  container.setRotation(rot);
  return container;
}

/** Ekor bubble goresan pena (dialog.js drawBubble) — texture 26×18. */
export function ensureTailTexture(scene: Phaser.Scene): string {
  const key = 'bubble-tail';
  if (!scene.textures.exists(key)) {
    const ct = scene.textures.createCanvas(key, 26, 20);
    if (ct) {
      const c = ct.getContext() as unknown as CanvasRenderingContext2D;
      c.fillStyle = CSS.paper;
      c.beginPath();
      c.moveTo(4, 3.5);
      c.lineTo(22, 3.5);
      c.lineTo(13, 17.5);
      c.closePath();
      c.fill();
      for (let k = 0; k < 2; k++) {
        c.strokeStyle = k ? 'rgba(30,23,16,.5)' : CSS.ink;
        c.lineWidth = k ? 1 : 2;
        c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(4 + k, 3 + (k ? 0.4 : 0));
        c.lineTo(13 + k * 1.2, 16.5 + k);
        c.lineTo(22 + k * 1.6, 3 + (k ? -0.1 : 0));
        c.stroke();
      }
      ct.refresh();
    }
  }
  return key;
}

let measureCanvas: HTMLCanvasElement | null = null;
export function measureText(text: string, font: string): number {
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const c = measureCanvas.getContext('2d')!;
  c.font = font;
  return c.measureText(text).width;
}

/** Pecah teks menjadi baris dengan lebar maksimum (wrap legacy dialog.js). */
export function wrapLines(text: string, font: string, maxW: number): string[] {
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const c = measureCanvas.getContext('2d')!;
  c.font = font;
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (c.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** easeOB legacy — pop masuk spring (backOut). */
export function backOut(t: number): number {
  return 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
}

/** Tile butir kertas sebagai texture (overlay multiply era grading). */
export function ensurePaperFillTexture(scene: Phaser.Scene): string {
  const key = 'ui-paper-fill';
  if (!scene.textures.exists(key)) {
    const ct = scene.textures.createCanvas(key, 256, 256);
    if (ct) {
      (ct.getContext() as unknown as CanvasRenderingContext2D).drawImage(getPaperTile(), 0, 0);
      ct.refresh();
    }
  }
  return key;
}

/** 3 frame grain film 160×160 (world.js grainCvs). */
export function ensureGrainFrameTextures(scene: Phaser.Scene): string[] {
  const keys: string[] = [];
  for (let g = 0; g < 3; g++) {
    const key = `ui-grain-${g}`;
    keys.push(key);
    if (scene.textures.exists(key)) continue;
    const ct = scene.textures.createCanvas(key, 160, 160);
    if (ct) {
      const c = ct.getContext() as unknown as CanvasRenderingContext2D;
      const id = c.createImageData(160, 160);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = 110 + Math.random() * 80;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
        id.data[i + 3] = 26;
      }
      c.putImageData(id, 0, 0);
      ct.refresh();
    }
  }
  return keys;
}

/** Selaput beku 1999 (world.js getFrost) — statis, aman reduceMotion. */
export function ensureFrostTexture(scene: Phaser.Scene): string {
  const key = 'ui-frost';
  if (!scene.textures.exists(key)) {
    const ct = scene.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT);
    if (ct) {
      const c = ct.getContext() as unknown as CanvasRenderingContext2D;
      const r = mulberry32(199);
      for (let i = 0; i < 96; i++) {
        const edge = (r() * 4) | 0;
        let x: number, y: number, a: number;
        if (edge === 0) { x = -4; y = r() * GAME_HEIGHT; a = (r() - 0.5) * 0.9; }
        else if (edge === 1) { x = GAME_WIDTH + 4; y = r() * GAME_HEIGHT; a = Math.PI + (r() - 0.5) * 0.9; }
        else if (edge === 2) { x = r() * GAME_WIDTH; y = -4; a = Math.PI / 2 + (r() - 0.5) * 0.9; }
        else { x = r() * GAME_WIDTH; y = GAME_HEIGHT + 4; a = -Math.PI / 2 + (r() - 0.5) * 0.9; }
        const len = 14 + r() * 46;
        c.save();
        c.translate(x, y);
        c.rotate(a);
        c.globalAlpha = 0.18 + r() * 0.4;
        c.strokeStyle = 'rgba(208,233,252,.75)';
        c.lineWidth = 0.8 + r();
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(len, 0);
        for (let k = 1; k <= 3; k++) {
          const bx = (len * k) / 3, bl = (4 - k) * (2.5 + r() * 3);
          c.moveTo(bx, -bl);
          c.lineTo(bx, bl);
        }
        c.stroke();
        c.restore();
      }
      const g = c.createRadialGradient(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT * 0.44, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT * 0.92);
      g.addColorStop(0, 'rgba(180,220,250,0)');
      g.addColorStop(0.72, 'rgba(190,225,252,.05)');
      g.addColorStop(1, 'rgba(205,235,255,.17)');
      c.fillStyle = g;
      c.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ct.refresh();
    }
  }
  return key;
}
