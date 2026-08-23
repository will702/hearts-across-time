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
  version: 'phaser-native-1',
  game,
  snapshot: () => {
    const activeScenes = game.scene.getScenes(true).map((scene) => scene.scene.key);
    const scene = game.scene.getScene('Era1944Scene') as Phaser.Scene & {
      snapshot?: () => Record<string, unknown>;
    };
    const title = game.scene.getScene('TitleScene') as Phaser.Scene & {
      snapshot?: () => Record<string, unknown>;
    };
    const watch = game.scene.getScene('WatchRepairScene') as Phaser.Scene & {
      snapshot?: () => Record<string, unknown>;
    };
    const current = watch?.scene.isActive()
      ? watch.snapshot?.()
      : scene?.scene.isActive()
        ? scene.snapshot?.()
        : title?.scene.isActive()
          ? title.snapshot?.()
          : undefined;

    return {
      activeScenes,
      renderer: game.renderer.type === Phaser.WEBGL ? 'WEBGL' : 'CANVAS',
      state: String(game.registry.get('nativeState') ?? 'boot'),
      ...(current ?? {}),
    };
  },
};
