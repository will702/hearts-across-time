import Phaser from 'phaser';
import { createGameConfig } from './game/config';

const game = new Phaser.Game(createGameConfig());

export type NativeSnapshot = {
  activeScenes: string[];
  renderer: string;
  state: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    __HAT?: {
      version: string;
      game: Phaser.Game;
      snapshot: () => NativeSnapshot;
    };
  }
}

window.__HAT = {
  version: 'phaser-native-complete',
  game,
  snapshot: () => {
    const activeScenes = game.scene.getScenes(true).map((scene) => scene.scene.key);
    let currentData: Record<string, unknown> | undefined;

    for (const key of activeScenes) {
      const activeScene = game.scene.getScene(key) as Phaser.Scene & {
        snapshot?: () => Record<string, unknown>;
      };
      if (activeScene && typeof activeScene.snapshot === 'function') {
        currentData = activeScene.snapshot();
        break;
      }
    }

    return {
      activeScenes,
      renderer: game.renderer.type === Phaser.WEBGL ? 'WEBGL' : 'CANVAS',
      state: String(game.registry.get('nativeState') ?? 'boot'),
      ...(currentData ?? {}),
    };
  },
};
