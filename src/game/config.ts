import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { Era1944Scene } from './scenes/Era1944Scene';
import { IntroScene } from './scenes/IntroScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { WatchRepairScene } from './scenes/WatchRepairScene';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const GROUND_Y = 444;

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  const physicsDebug = new URLSearchParams(location.search).get('physicsDebug') === '1';

  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0a0806',
    banner: false,
    disableContextMenu: true,
    input: { keyboard: true, mouse: true, touch: true, activePointers: 3 },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 1600 },
        fixedStep: true,
        fps: 60,
        debug: physicsDebug,
      },
    },
    render: { antialias: true, pixelArt: false, roundPixels: false },
    scale: {
      parent: 'game',
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [
      BootScene,
      PreloadScene,
      IntroScene,
      TitleScene,
      Era1944Scene,
      UIScene,
      WatchRepairScene,
    ],
  };
}
