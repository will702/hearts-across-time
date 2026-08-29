/* Jangkar pembicara era → koordinat layar untuk balon kata komik, plus
   pergantian ekspresi karakter dunia selama dialog (baris sheet 8 ekspresi,
   4 kolom). Dipakai era scene saat meluncurkan DialogueScene. */
import type Phaser from 'phaser';
import type { CharacterId, Expression } from '../narrative/storyScript';

export const EXPR_FRAMES: Record<Expression, number> = {
  neutral: 0,
  smile: 4,
  sad: 8,
  shock: 12,
  angry: 16,
  mad: 20,
  warm: 24,
  happy: 28,
  closed: 4,
};

export interface SpeakerAnchor {
  x: number;
  headY: number;
}

export class EraSpeakerRig {
  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly arthur?: Phaser.GameObjects.Image,
    private readonly arthurWho: CharacterId = 'muda',
  ) {}

  /** Posisi kepala pembicara dalam koordinat layar (kamera era diam saat dialog). */
  anchor(who: CharacterId): SpeakerAnchor | null {
    if (who === 'elena') {
      return {
        x: this.player.x - this.camera.scrollX,
        headY: this.player.y - this.player.displayHeight - this.camera.scrollY - 6,
      };
    }
    if (who === this.arthurWho && this.arthur) {
      const top = this.arthur.y - this.arthur.displayHeight;
      return { x: this.arthur.x - this.camera.scrollX, headY: top - this.camera.scrollY - 6 };
    }
    return null;
  }

  /** Visual dunia pembicara (untuk animasi bounce bicara di DialogueScene). */
  visual(who: CharacterId): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | null {
    if (who === 'elena') return this.player;
    if (who === this.arthurWho && this.arthur) return this.arthur;
    return null;
  }

  setExpression(who: CharacterId, expr: Expression): void {
    const frame = EXPR_FRAMES[expr] ?? 0;
    if (who === 'elena') {
      if (this.player.texture.key === 'elena') {
        this.player.anims.stop();
        this.player.setFrame(frame);
      }
      return;
    }
    if (who === this.arthurWho && this.arthur && this.arthur.texture.key.startsWith('arthur-')) {
      this.arthur.setFrame(frame);
    }
  }

  reset(): void {
    this.setExpression('elena', 'neutral');
    if (this.arthur && this.arthur.texture.key.startsWith('arthur-')) this.arthur.setFrame(0);
  }
}
