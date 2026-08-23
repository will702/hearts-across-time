import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { SaveSystem } from '../systems/SaveSystem';

export class EndCardScene extends Phaser.Scene {
  private save!: SaveSystem;

  constructor() {
    super('EndCardScene');
  }

  create(): void {
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'endcard');

    this.save.data.endings['true'] = 1;
    this.save.clearCycle();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090408, 1);

    if (this.textures.exists('bonus-city-complete')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bonus-city-complete')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.35);
    }

    this.add.text(GAME_WIDTH / 2, 85, 'HEARTS ACROSS TIME', {
      color: '#f6d57b', fontFamily: 'Cinzel, serif', fontSize: '36px', fontStyle: 'bold',
      stroke: '#280c0c', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 130, 'BREAK THE LOOP • TRUE ENDING', {
      color: '#fffbf0', fontFamily: 'Poppins, sans-serif', fontSize: '15px', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 230,
      'Elena melompat kembali ke tahun 2088.\nVial antibodi murni disuntikkan ke tubuh Arthur.\nDetak jantungnya kembali berdegup.\nLingkaran kutukan waktu telah resmi terputus.', {
        color: '#fef08a', fontFamily: 'Patrick Hand, sans-serif', fontSize: '22px', align: 'center', lineSpacing: 8,
      }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 360, 'Dan suatu hari nanti... kita akan bertemu lagi sebagai dua orang biasa yang saling jatuh cinta.', {
      color: '#fbcfe8', fontFamily: 'Cinzel, serif', fontSize: '14px', fontStyle: 'italic',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 455, 'MENU UTAMA (ENTER / SPACE)', {
      backgroundColor: '#94342ecc', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '14px', padding: { x: 28, y: 11 },
    }).setOrigin(0.5).setInteractive().on('pointerup', () => this.scene.start('TitleScene'));

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('TitleScene'));
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('TitleScene'));
  }
}
