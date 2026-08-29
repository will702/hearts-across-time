import Phaser from 'phaser';
import {
  AUDIO_ASSETS,
  CHARACTER_SHEET_ASSETS,
  IMAGE_ASSETS,
  PROP_SHEET_ASSETS,
} from '../assetManifest';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export class PreloadScene extends Phaser.Scene {
  private readonly failed = new Set<string>();

  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const box = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 360, 18, 0x1a1510);
    const bar = this.add.rectangle(GAME_WIDTH / 2 - 176, GAME_HEIGHT / 2, 0, 10, 0xd3a848).setOrigin(0, 0.5);
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 34, 'MEMUAT JEJAK WAKTU…', {
      color: '#f5f0e8', fontFamily: 'Poppins, sans-serif', fontSize: '13px', letterSpacing: 2,
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => bar.setSize(352 * value, 10));
    this.load.on('loaderror', (file: Phaser.Loader.File) => this.failed.add(file.key));
    this.load.once('complete', () => { box.destroy(); bar.destroy(); label.destroy(); });

    Object.entries(IMAGE_ASSETS).forEach(([key, url]) => this.load.image(key, url));
    Object.entries(PROP_SHEET_ASSETS).forEach(([key, url]) => {
      this.load.spritesheet(key, url, { frameWidth: 200, frameHeight: 200 });
    });
    Object.entries(CHARACTER_SHEET_ASSETS).forEach(([key, url]) => {
      this.load.spritesheet(key, url, { frameWidth: 150, frameHeight: 210 });
    });
    Object.entries(AUDIO_ASSETS).forEach(([key, url]) => {
      this.load.audio(key, url);
    });

    this.load.video('intro', 'assets/video/intro.mp4');
    this.load.font('Cinzel', 'assets/fonts/cinzel.ttf', 'truetype');
    this.load.font('Poppins', 'assets/fonts/poppins-regular.ttf', 'truetype');
    this.load.font('Patrick Hand', 'assets/fonts/patrick-hand.woff2', 'woff2');
  }

  create(): void {
    this.createFallbackTextures();
    this.registry.set('loadErrors', [...this.failed]);
    const query = new URLSearchParams(location.search);
    const skipIntro = query.get('qa') === '1' || query.get('skipIntro') === '1' || this.failed.has('intro');
    this.scene.start(skipIntro ? 'TitleScene' : 'IntroScene');
  }

  private createFallbackTextures(): void {
    if (!this.textures.exists('title-bg-color')) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillGradientStyle(0x071021, 0x101c35, 0x28182f, 0x05070d, 1);
      graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      graphics.generateTexture('title-bg-color', GAME_WIDTH, GAME_HEIGHT);
      graphics.destroy();
    }

    const makeObject = (key: string, color: number, draw: (graphics: Phaser.GameObjects.Graphics) => void): void => {
      if (this.textures.exists(key)) return;
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(color, 1);
      draw(graphics);
      graphics.generateTexture(key, 96, 96);
      graphics.destroy();
    };
    makeObject('watch-fallback', 0xd1a95c, (g) => {
      g.fillStyle(0x1f1712, 0.28);
      g.fillEllipse(48, 84, 62, 10);
      g.lineStyle(4, 0x3b2a20, 1);
      g.strokeCircle(48, 15, 8);
      g.fillStyle(0x8b6332, 1);
      g.fillRoundedRect(42, 21, 12, 10, 3);
      g.fillStyle(0x3d2a1d, 1);
      g.fillCircle(48, 57, 31);
      g.fillStyle(0xb9823e, 1);
      g.fillCircle(48, 57, 27);
      g.fillStyle(0xead8a9, 1);
      g.fillCircle(48, 57, 22);
      g.lineStyle(2, 0x69482b, 0.9);
      for (let i = 0; i < 12; i += 1) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        g.beginPath();
        g.moveTo(48 + Math.cos(angle) * 16, 57 + Math.sin(angle) * 16);
        g.lineTo(48 + Math.cos(angle) * 20, 57 + Math.sin(angle) * 20);
        g.strokePath();
      }
      g.lineStyle(3, 0x35261e, 1);
      g.beginPath();
      g.moveTo(48, 57);
      g.lineTo(48, 43);
      g.moveTo(48, 57);
      g.lineTo(60, 63);
      g.strokePath();
      g.fillStyle(0x35261e, 1);
      g.fillCircle(48, 57, 3);
      g.lineStyle(1, 0x7b5332, 0.7);
      g.beginPath();
      g.moveTo(56, 38);
      g.lineTo(52, 47);
      g.lineTo(57, 51);
      g.strokePath();
      g.lineStyle(2, 0xffefc7, 0.45);
      g.strokeCircle(44, 53, 22);
    });
    makeObject('spotlight-fallback', 0x813d32, (g) => {
      g.fillStyle(0xf5d889, 0.18);
      g.fillTriangle(55, 20, 95, 5, 95, 52);
      g.fillStyle(0x1f1712, 0.3);
      g.fillEllipse(49, 87, 65, 9);
      g.lineStyle(5, 0x352b25, 1);
      g.beginPath();
      g.moveTo(48, 53);
      g.lineTo(31, 86);
      g.moveTo(48, 53);
      g.lineTo(65, 86);
      g.moveTo(48, 53);
      g.lineTo(48, 84);
      g.strokePath();
      g.fillStyle(0x34312e, 1);
      g.beginPath();
      g.moveTo(19, 24);
      g.lineTo(56, 17);
      g.lineTo(75, 27);
      g.lineTo(67, 47);
      g.lineTo(30, 51);
      g.lineTo(17, 40);
      g.closePath();
      g.fillPath();
      g.lineStyle(3, 0x1d1713, 1);
      g.strokePath();
      g.fillStyle(0x806d50, 1);
      g.fillEllipse(66, 33, 25, 30);
      g.fillStyle(0xf2cf73, 1);
      g.fillEllipse(69, 32, 17, 22);
      g.fillStyle(0xffedb0, 0.8);
      g.fillEllipse(72, 28, 7, 9);
      g.lineStyle(3, 0x47392d, 1);
      g.beginPath();
      g.moveTo(29, 52);
      g.lineTo(38, 58);
      g.lineTo(59, 56);
      g.lineTo(66, 48);
      g.strokePath();
      g.fillStyle(0x7d2f2a, 0.85);
      g.fillRoundedRect(36, 52, 24, 8, 3);
    });
    makeObject('lore-fallback', 0x684a31, (g) => {
      g.fillStyle(0x1f1712, 0.28);
      g.fillEllipse(48, 85, 68, 10);
      g.lineStyle(4, 0x3b291d, 1);
      g.beginPath();
      g.moveTo(31, 36);
      g.lineTo(34, 27);
      g.lineTo(62, 27);
      g.lineTo(66, 36);
      g.strokePath();
      g.fillStyle(0x3b291d, 1);
      g.fillRoundedRect(13, 35, 70, 49, 4);
      g.fillStyle(0x805b37, 1);
      g.fillRoundedRect(17, 39, 62, 41, 2);
      g.fillStyle(0xa87947, 0.55);
      g.fillRect(19, 42, 58, 10);
      g.fillStyle(0x553b29, 0.8);
      g.fillRect(17, 55, 62, 5);
      g.fillRect(44, 39, 7, 41);
      g.lineStyle(2, 0x3b291d, 0.9);
      g.strokeRect(17, 39, 62, 41);
      g.fillStyle(0xe1d0a2, 0.95);
      g.fillRoundedRect(55, 62, 18, 13, 2);
      g.fillStyle(0x7b2e2a, 1);
      g.fillRect(62, 64, 4, 9);
      g.fillRect(58, 67, 12, 3);
      g.fillStyle(0xd6b37a, 0.8);
      g.fillCircle(23, 45, 2);
      g.fillCircle(73, 45, 2);
      g.fillCircle(23, 75, 2);
      g.fillCircle(73, 75, 2);
      g.lineStyle(1, 0xc89a5e, 0.45);
      g.beginPath();
      g.moveTo(20, 53);
      g.lineTo(75, 51);
      g.moveTo(20, 63);
      g.lineTo(75, 61);
      g.strokePath();
    });
    makeObject('arthur-fallback', 0x71624c, (g) => { g.fillCircle(48, 22, 15); g.fillRect(31, 36, 34, 52); });
    makeObject('elena-fallback', 0xd7c4a1, (g) => { g.fillCircle(48, 20, 16); g.fillStyle(0xc4897f); g.fillTriangle(48, 34, 21, 88, 75, 88); });

    // Fallback untuk potret karakter dialog jika file belum dimuat
    const portraitColors: Record<string, { bg: number; skin: number; hair: number }> = {
      elena: { bg: 0x8a3832, skin: 0xf5dfc6, hair: 0xd4c29a },
      muda: { bg: 0x5a6838, skin: 0xf5dfc6, hair: 0x6e5236 },
      dewasa: { bg: 0x3d5a73, skin: 0xf5dfc6, hair: 0x625a52 },
      buron: { bg: 0x5a4632, skin: 0xf2d8bd, hair: 0x54402e },
      tua: { bg: 0x6e6858, skin: 0xf0d8c2, hair: 0xd6d2c4 },
    };
    Object.entries(portraitColors).forEach(([char, cols]) => {
      const fbKey = `portrait-${char}-fallback`;
      if (!this.textures.exists(fbKey)) {
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(cols.bg, 1);
        g.fillRect(0, 0, 128, 160);
        g.fillStyle(cols.skin, 1);
        g.fillCircle(64, 58, 32);
        g.fillRect(44, 90, 40, 70);
        g.fillStyle(cols.hair, 1);
        g.fillCircle(64, 46, 34);
        g.generateTexture(fbKey, 128, 160);
        g.destroy();
      }
    });
  }
}
