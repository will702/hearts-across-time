import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

const images: Record<string, string> = {
  'title-bg-color': 'assets/bgjudul1.png',
  'title-bg-mono': 'assets/bgjudul2.png',
  'title-cover': 'assets/title_cover_figJma.png',
  'title-plate': 'assets/title_start_plate.png',
  'bgnarator': 'assets/bgnarator.png',

  'bg1944-far': 'assets/bg1944_far.png',
  'bg1944-mid': 'assets/bg1944_mid.png',
  'bg1944-fg': 'assets/bg1944_fg.png',

  'bg1968A-far': 'assets/bg1968A_far.png',
  'bg1968A-mid': 'assets/bg1968A_mid.png',
  'bg1968A-fg': 'assets/bg1968A_fg.png',

  'bg1968B-far': 'assets/bg1968B_far.png',
  'bg1968B-mid': 'assets/bg1968B_mid.png',
  'bg1968B-fg': 'assets/bg1968B_fg.png',

  'bg1999-far': 'assets/bg1999_far.png',
  'bg1999-mid': 'assets/bg1999_mid.png',
  'bg1999-fg': 'assets/bg1999_fg.png',

  'bg2088-far': 'assets/bg2088_far.png',
  'bg2088-near': 'assets/bg2088_near.png',
  'bg2088-fg': 'assets/bg2088_fg.png',

  'watch-repair-art': 'assets/Arlogirusak.png',
  'rose-bottle-broken': 'assets/botolmawar.png',
  'water-gem-art': 'assets/permata.jpg',
  'elena-arthur-photo': 'assets/fotoelenaathur.  Background.png',

  'bonus-diff-art': 'assets/mencariperbedaan .png',
  'bonus-mawar-art': 'assets/mawar.jpg',
  'bonus-mawar2-art': 'assets/mawar2.jpg',
  'bonus-dinner-bg': 'assets/makan.jpg',
  'food-spaghetti': 'assets/spaggeti.jpg',
  'food-nasi': 'assets/nasigoreng.jpg',
  'food-udang': 'assets/udangkeju.jpg',
  'food-steak': 'assets/steak.jpg',
  'bonus-cats-art': 'assets/kucing.jpg',
  'bonus-chem-glass': 'assets/gelaskimia.jpg',
  'bonus-love-glass': 'assets/gelashati.jpg',
  'bonus-city-complete': 'assets/bonus_city_complete.jpg',
  'bonus-puzzle-board': 'assets/bonus_puzzle_board.jpg',
};

const propSheets: Record<string, string> = {
  'prop-flag1944': 'assets/prop_flag1944.png',
  'prop-lantern1944': 'assets/prop_lantern1944.png',
  'prop-flare1944': 'assets/prop_flare1944.png',
  'prop-bulb1968A': 'assets/prop_bulb1968A.png',
  'prop-radio1968A': 'assets/prop_radio1968A.png',
  'prop-beacon1968B': 'assets/prop_beacon1968B.png',
  'prop-steam1968B': 'assets/prop_steam1968B.png',
  'prop-consoleWave1999': 'assets/prop_consoleWave1999.png',
  'prop-frost1999': 'assets/prop_frost1999.png',
  'prop-barrel2088': 'assets/prop_barrel2088.png',
  'prop-poster2088': 'assets/prop_poster2088.png',
};

const charSheets: Record<string, string> = {
  'elena': 'assets/elena_sheet.png',
  'arthur-muda': 'assets/arthur_muda_sheet.png',
  'arthur-dewasa': 'assets/arthur_dewasa_sheet.png',
  'arthur-buron': 'assets/arthur_buron_sheet.png',
  'arthur-tua': 'assets/arthur_tua_sheet.png',
};

const audioFiles: Record<string, string> = {
  'step-mud-0': 'assets/audio/footstep00.wav',
  'step-mud-1': 'assets/audio/footstep03.wav',
  'step-metal': 'assets/audio/footstep08.wav',
  'flip': 'assets/audio/bookFlip1.wav',
  'flip2': 'assets/audio/bookFlip2.wav',
  'click': 'assets/audio/metalClick.wav',
  'creak': 'assets/audio/creak2.wav',
  'rain': 'assets/audio/rain.wav',
  'wind': 'assets/audio/wind.wav',
  'fire': 'assets/audio/fire.wav',
  'hum': 'assets/audio/hum.wav',
};

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

    Object.entries(images).forEach(([key, url]) => this.load.image(key, url));
    Object.entries(propSheets).forEach(([key, url]) => {
      this.load.spritesheet(key, url, { frameWidth: 200, frameHeight: 200 });
    });
    Object.entries(charSheets).forEach(([key, url]) => {
      this.load.spritesheet(key, url, { frameWidth: 150, frameHeight: 210 });
    });
    Object.entries(audioFiles).forEach(([key, url]) => {
      this.load.audio(key, url);
    });

    this.load.video('intro', 'assets/intro.mp4');
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
    makeObject('watch-fallback', 0xd1a95c, (g) => { g.fillCircle(48, 54, 24); g.lineStyle(5, 0x49341f); g.strokeCircle(48, 54, 24); g.fillRect(43, 12, 10, 22); });
    makeObject('spotlight-fallback', 0x813d32, (g) => { g.fillRect(30, 22, 36, 67); g.fillStyle(0xf4d27c); g.fillCircle(48, 24, 16); });
    makeObject('lore-fallback', 0x684a31, (g) => { g.fillRect(18, 40, 60, 44); g.lineStyle(4, 0x2b1d13); g.strokeRect(18, 40, 60, 44); });
    makeObject('arthur-fallback', 0x71624c, (g) => { g.fillCircle(48, 22, 15); g.fillRect(31, 36, 34, 52); });
    makeObject('elena-fallback', 0xd7c4a1, (g) => { g.fillCircle(48, 20, 16); g.fillStyle(0xc4897f); g.fillTriangle(48, 34, 21, 88, 75, 88); });
  }
}
