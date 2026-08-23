import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { SaveSystem } from '../systems/SaveSystem';

export class EndCardScene extends Phaser.Scene {
  private save!: SaveSystem;
  private soundManager?: SoundManager;

  constructor() {
    super('EndCardScene');
  }

  create(): void {
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'endcard');

    this.save.data.endings['true'] = 1;
    this.save.clearCycle();

    this.soundManager?.playSuccessFanfare();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090408, 1);

    if (this.textures.exists('bonus-city-complete')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bonus-city-complete')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.35);
    }

    this.add.text(GAME_WIDTH / 2, 75, 'HEARTS ACROSS TIME', {
      color: '#f6d57b', fontFamily: 'Cinzel, serif', fontSize: '36px', fontStyle: 'bold',
      stroke: '#280c0c', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 120, 'BREAK THE LOOP • TRUE ENDING', {
      color: '#fffbf0', fontFamily: 'Poppins, sans-serif', fontSize: '15px', letterSpacing: 4, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 220,
      'Elena melompat kembali ke tahun 2088.\nVial antibodi murni disuntikkan ke tubuh Arthur.\nDetak jantungnya kembali berdegup stabil.\nLingkaran kutukan waktu telah resmi terputus.', {
        color: '#fef08a', fontFamily: 'Patrick Hand, sans-serif', fontSize: '22px', align: 'center', lineSpacing: 8,
      }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 350, '“Dan suatu hari nanti... kita akan bertemu lagi sebagai dua orang biasa yang saling jatuh cinta.”', {
      color: '#fbcfe8', fontFamily: 'Cinzel, serif', fontSize: '15px', fontStyle: 'italic',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 455, 'KEMBALI KE MENU UTAMA (ENTER / SPACE)', {
      backgroundColor: '#94342ecc', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '14px', padding: { x: 28, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.goToTitle());

    this.input.keyboard?.once('keydown-SPACE', () => this.goToTitle());
    this.input.keyboard?.once('keydown-ENTER', () => this.goToTitle());
  }

  private goToTitle(): void {
    this.soundManager?.playSelect();
    this.scene.start('TitleScene');
  }
}
