/* Balon kata komik 7-Days + strip narator — port Phaser dari
   legacy/src/ui/dialog.js (drawBubble/drawNarr). Teks diketik progresif;
   panel kertas dipanggang ulang hanya saat ukuran baris berubah. */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CSS, FONT, NAME_CHIP, NAME_LABEL, RED } from './theme';
import { addInkTag, addPaperPanel, backOut, ensureTailTexture, measureText, wrapLines } from './paper';

export interface SpeechInfo {
  who: string;
  x: number;
  headY: number;
}

const POP_MS = 220;

export class ComicBubble {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private content: Phaser.GameObjects.Container;
  private panel?: Phaser.GameObjects.Image;
  private tail?: Phaser.GameObjects.Image;
  private tag?: Phaser.GameObjects.Container;
  private bodyText: Phaser.GameObjects.Text;
  private caret: Phaser.GameObjects.Rectangle;

  private fullText = '';
  private shownChars = 0;
  private textScale = 1;
  private narrator = false;
  private speaker: SpeechInfo | null = null;
  private currentW = 0;
  private currentH = 0;

  constructor(scene: Phaser.Scene, depth = 0) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(depth).setVisible(false);
    this.content = scene.add.container(0, 0);
    this.root.add(this.content);
    this.bodyText = scene.add.text(0, 0, '', {
      color: CSS.body,
      fontFamily: FONT.UI,
      fontSize: '17px',
    });
    this.caret = scene.add.rectangle(0, 0, 5, 8, RED).setVisible(false);
    this.content.add([this.bodyText, this.caret]);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  show(text: string, speaker: SpeechInfo | null, textScale: number): void {
    this.fullText = text;
    this.shownChars = 0;
    this.textScale = textScale;
    this.narrator = speaker === null || speaker.who === 'narrator';
    this.speaker = this.narrator ? null : speaker;
    this.currentW = 0;
    this.currentH = 0;
    this.panel?.destroy();
    this.tail?.destroy();
    this.tag?.destroy();
    this.panel = undefined;
    this.tail = undefined;
    this.tag = undefined;
    this.root.setVisible(true).setAlpha(1);
    this.layout();
    this.popIn();
  }

  hide(): void {
    this.root.setVisible(false);
    this.scene.tweens.killTweensOf(this.root);
    this.speaker = null;
    this.fullText = '';
  }

  /** Progres ketik 0..1; mengembalikan true bila teks lengkap. */
  setProgress(progress: number): boolean {
    const n = Phaser.Math.Clamp(progress, 0, 1);
    const chars = Math.ceil(this.fullText.length * n);
    if (chars !== this.shownChars) {
      this.shownChars = chars;
      this.layout();
    }
    return chars >= this.fullText.length;
  }

  private fontSpec(): { font: string; size: number; lh: number; bold: boolean } {
    const ts = this.textScale;
    if (this.narrator) {
      const bracket = /^\[/.test(this.fullText);
      const size = Math.round((bracket ? 18.5 : 17.5) * ts);
      return { font: `${bracket ? 'bold ' : ''}${size}px ${FONT.UI}`, size, lh: Math.round(23 * ts), bold: bracket };
    }
    const size = Math.round(16.5 * ts);
    return { font: `${size}px ${FONT.UI}`, size, lh: Math.round(21 * ts), bold: false };
  }

  private layout(): void {
    const spec = this.fontSpec();
    const shown = this.fullText.slice(0, this.shownChars);
    const maxW = this.narrator ? 640 : 340;
    const lines = wrapLines(shown, spec.font, maxW);

    let bw: number, bh: number, bx: number, by: number;
    if (this.narrator) {
      bw = 700;
      bh = lines.length * spec.lh + 32;
      bx = (GAME_WIDTH - bw) / 2;
      by = GAME_HEIGHT - bh - 24;
    } else {
      const widest = lines.length ? Math.max(...lines.map((l) => measureText(l, spec.font))) : 0;
      bw = Math.max(widest, 60) + 30;
      bh = lines.length * spec.lh + 18;
      const x = this.speaker?.x ?? GAME_WIDTH / 2;
      const headY = this.speaker?.headY ?? GAME_HEIGHT / 2;
      bx = Phaser.Math.Clamp(x - bw / 2, 14, GAME_WIDTH - bw - 14);
      by = headY - bh - 30;
      if (by < 54) by = headY + 64;
    }

    if (bw !== this.currentW || bh !== this.currentH) {
      this.currentW = bw;
      this.currentH = bh;
      this.panel?.destroy();
      this.panel = addPaperPanel(this.scene, bx, by, bw, bh, { radius: this.narrator ? 6 : 7 });
      this.content.add(this.panel);
      this.content.sendToBack(this.panel);
      if (!this.narrator && this.speaker) {
        const tailKey = ensureTailTexture(this.scene);
        if (!this.tail) {
          this.tail = this.scene.add.image(0, 0, tailKey).setOrigin(0, 0);
          this.content.add(this.tail);
        } else {
          this.tail.setTexture(tailKey);
        }
        if (!this.tag) {
          const who = this.speaker.who;
          this.tag = addInkTag(this.scene, 0, 0, NAME_LABEL[who] ?? 'ARTHUR', NAME_CHIP[who] ?? 0x556b7f);
          this.content.add(this.tag);
        }
      }
    }

    if (!this.narrator && this.speaker) {
      const tx = Phaser.Math.Clamp(this.speaker.x, bx + 26, bx + bw - 26);
      this.tail?.setPosition(tx - 13, by + bh - 5);
      this.tag?.setPosition(bx + 12, by - 9);
    }

    // teks
    this.bodyText.setFontFamily(FONT.UI);
    this.bodyText.setFontSize(spec.size);
    this.bodyText.setFontStyle(spec.bold ? 'bold' : 'normal');
    this.bodyText.setColor(spec.bold ? CSS.red : CSS.body);
    this.bodyText.setAlign(this.narrator ? 'center' : 'left');
    this.bodyText.setLineSpacing(spec.lh - Math.round(spec.size * 1.2));
    this.bodyText.setText(lines.join('\n'));
    if (this.narrator) {
      const widest = lines.length ? Math.max(...lines.map((l) => measureText(l, spec.font))) : 0;
      this.bodyText.setPosition(GAME_WIDTH / 2 - widest / 2, by + 15);
    } else {
      this.bodyText.setPosition(bx + 15, by + 10);
    }

    // kursor ketik merah: ujung kanan baris terakhir (dialog.js)
    const done = this.shownChars >= this.fullText.length;
    if (!done && !this.narrator && lines.length) {
      const last = lines[lines.length - 1];
      const lw = measureText(last, spec.font);
      this.caret.setPosition(bx + 15 + lw + 6, by + bh - 13).setVisible(true);
      this.content.bringToTop(this.caret);
    } else {
      this.caret.setVisible(false);
    }

    // geser konten relatif pusat agar pop scale berputar di tengah panel
    this.root.setPosition(bx + bw / 2, by + bh / 2);
    this.content.setPosition(-(bx + bw / 2), -(by + bh / 2));
  }

  private popIn(): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(0.55);
    const tween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: POP_MS,
    });
    tween.on('update', () => {
      this.root.setScale(Math.max(0.001, backOut(Phaser.Math.Clamp(tween.getValue() ?? 0, 0, 1))));
    });
  }
}
