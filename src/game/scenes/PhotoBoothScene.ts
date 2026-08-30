import Phaser from 'phaser';
import { BONUS_IMAGE_ASSETS } from '../assetManifest';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CSS, FONT } from '../ui/theme';

type Partner = 'elena' | 'arthur';
type BoothStage = 'choose' | 'requesting' | 'camera';

const FRAME_BY_PARTNER: Record<Partner, string> = {
  // Berfoto dengan Elena berarti wajah pemain mengisi posisi Arthur.
  elena: 'bonus-photo-elena',
  arthur: 'bonus-photo-arthur',
};

export class PhotoBoothScene extends Phaser.Scene {
  private stage: BoothStage = 'choose';
  private selectedPartner: Partner = 'elena';
  private stream?: MediaStream;
  private cameraVideo?: Phaser.GameObjects.Video;
  private statusText?: Phaser.GameObjects.Text;
  private keyHandler?: (event: KeyboardEvent) => void;

  constructor() {
    super('PhotoBoothScene');
  }

  preload(): void {
    for (const key of ['bonus-photo-couple', 'bonus-photo-elena', 'bonus-photo-arthur']) {
      if (!this.textures.exists(key)) this.load.image(key, BONUS_IMAGE_ASSETS[key]);
    }
  }

  create(): void {
    this.registry.set('nativeState', 'photobooth');
    this.stage = 'choose';
    this.selectedPartner = 'elena';
    this.showPartnerChoice();
    this.keyHandler = (event) => this.handleKey(event);
    this.input.keyboard?.on('keydown', this.keyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  snapshot(): Record<string, unknown> {
    return {
      minigame: 'epilogue_photo_booth',
      stage: this.stage,
      partner: this.selectedPartner,
      cameraActive: Boolean(this.stream?.active),
      cameraError: this.statusText?.text.startsWith('KAMERA TIDAK') ?? false,
    };
  }

  private showPartnerChoice(message = 'Pilih pasangan untuk foto kenangan terakhir.'): void {
    this.stopCamera();
    this.children.removeAll(true);
    this.stage = 'choose';
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d0a08, 1);
    if (this.textures.exists('bonus-photo-couple')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bonus-photo-couple')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.72);
    }
    this.add.rectangle(GAME_WIDTH / 2, 438, 900, 178, 0x0d0a08, 0.88)
      .setStrokeStyle(2, 0xb98a3d, 0.72);
    this.add.text(GAME_WIDTH / 2, 374, 'PHOTO BOOTH • KENCAN DI TAHUN 2088', {
      color: CSS.goldBright, fontFamily: FONT.UI, fontSize: '22px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.statusText = this.add.text(GAME_WIDTH / 2, 405, message, {
      color: CSS.paper, fontFamily: FONT.UI, fontSize: '14px', align: 'center',
    }).setOrigin(0.5);

    this.addPartnerButton(330, 'elena', 'BERFOTO DENGAN ELENA');
    this.addPartnerButton(630, 'arthur', 'BERFOTO DENGAN ARTHUR');
    this.add.text(GAME_WIDTH / 2, 513, '← → PILIH  •  ENTER BUKA KAMERA  •  X KEMBALI KE JUDUL', {
      color: '#d8c7aa', fontFamily: FONT.META, fontSize: '11px',
    }).setOrigin(0.5);
    this.refreshChoice();
  }

  private addPartnerButton(x: number, partner: Partner, label: string): void {
    const button = this.add.rectangle(x, 458, 270, 46, 0x94342e, 0.94)
      .setName(`partner-${partner}`)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => { this.selectedPartner = partner; this.refreshChoice(); })
      .on('pointerup', () => { void this.requestCamera(partner); });
    const text = this.add.text(x, 458, label, {
      color: '#fff8ea', fontFamily: FONT.META, fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5);
    button.setData('label', text);
  }

  private refreshChoice(): void {
    (['elena', 'arthur'] as const).forEach((partner) => {
      const button = this.children.getByName(`partner-${partner}`) as Phaser.GameObjects.Rectangle | null;
      if (!button) return;
      const selected = partner === this.selectedPartner;
      button.setStrokeStyle(selected ? 4 : 1.5, selected ? 0xf6d57b : 0x631f1b, 1);
      button.setScale(selected ? 1.03 : 1);
      (button.getData('label') as Phaser.GameObjects.Text | undefined)?.setScale(selected ? 1.03 : 1);
    });
  }

  private async requestCamera(partner: Partner): Promise<void> {
    if (this.stage !== 'choose') return;
    this.selectedPartner = partner;
    this.stage = 'requesting';
    this.statusText?.setText('MEMINTA IZIN KAMERA… Pilih Izinkan pada browser.').setColor(CSS.goldBright);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!this.scene.isActive()) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      this.stream = stream;
      this.showCamera();
    } catch {
      if (!this.scene.isActive()) return;
      this.stopCamera();
      this.showPartnerChoice('KAMERA TIDAK TERSEDIA. Izinkan akses kamera, lalu coba lagi.');
      this.statusText?.setColor(CSS.redBright);
    }
  }

  private showCamera(): void {
    if (!this.stream) return;
    this.children.removeAll(true);
    this.stage = 'camera';
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050505, 1);
    this.cameraVideo = this.add.video(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setFlipX(true)
      .loadMediaStream(this.stream, true)
      .play(true);
    const frameKey = FRAME_BY_PARTNER[this.selectedPartner];
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, frameKey).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, 506, 920, 58, 0x0d0a08, 0.9)
      .setStrokeStyle(1.5, 0xb98a3d, 0.8);
    this.statusText = this.add.text(GAME_WIDTH / 2, 484,
      `KENCAN DENGAN ${this.selectedPartner.toUpperCase()} • Posisikan wajahmu di bingkai`, {
        color: CSS.goldBright, fontFamily: FONT.UI, fontSize: '14px', fontStyle: 'bold',
      }).setOrigin(0.5);
    this.addCameraButton(215, 138, '← GANTI', () => this.showPartnerChoice());
    this.addCameraButton(480, 224, 'AMBIL & SIMPAN FOTO', () => this.capturePhoto(), true);
    this.addCameraButton(745, 138, 'SELESAI', () => this.scene.start('TitleScene'));
  }

  private addCameraButton(
    x: number,
    width: number,
    label: string,
    onPress: () => void,
    primary = false,
  ): void {
    const button = this.add.rectangle(x, 518, width, 28, primary ? 0x94342e : 0x201b17, 0.96)
      .setStrokeStyle(primary ? 2 : 1.5, primary ? 0xf6d57b : 0xb98a3d, 0.95)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => button.setFillStyle(primary ? 0xb3443c : 0x3a2c22, 1))
      .on('pointerout', () => button.setFillStyle(primary ? 0x94342e : 0x201b17, 0.96))
      .on('pointerup', onPress);
    this.add.text(x, 518, label, {
      color: '#fff8ea', fontFamily: FONT.META, fontSize: '10px', fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private capturePhoto(): void {
    const video = this.cameraVideo?.video;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.statusText?.setText('KAMERA MASIH MENYIAPKAN GAMBAR…').setColor(CSS.redBright);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.save();
    context.translate(GAME_WIDTH, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    context.restore();
    const frame = this.textures.get(FRAME_BY_PARTNER[this.selectedPartner]).getSourceImage() as CanvasImageSource;
    context.drawImage(frame, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hearts-across-time-${this.selectedPartner}-${Date.now()}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }, 'image/png');
    this.statusText?.setText('FOTO TERSIMPAN! Kenangan tahun 2088 menjadi milikmu.').setColor(CSS.greenBright);
    if (!this.registry.get('reduceMotion')) {
      const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.9)
        .setDepth(100);
      this.tweens.add({ targets: flash, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
    }
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.code === 'KeyX' || event.key === 'Escape') {
      event.preventDefault();
      this.scene.start('TitleScene');
      return;
    }
    if (this.stage === 'requesting') return;
    if (this.stage === 'choose') {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.selectedPartner = this.selectedPartner === 'elena' ? 'arthur' : 'elena';
        this.refreshChoice();
      } else if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        void this.requestCamera(this.selectedPartner);
      }
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      this.showPartnerChoice();
    } else if (event.code === 'Space' || event.key === 'Enter') {
      event.preventDefault();
      this.capturePhoto();
    }
  }

  private stopCamera(): void {
    this.cameraVideo?.stop();
    this.cameraVideo = undefined;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
  }

  private shutdown(): void {
    this.stopCamera();
    if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
  }
}
