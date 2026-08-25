import type Phaser from 'phaser';
import type { RunState } from './SaveSystem';

export type EchoKey = '1944' | '1968A' | '1968B' | '1999';
type EchoState = {
  current: Partial<Record<EchoKey, number[]>>;
  previous: Partial<Record<EchoKey, number[]>>;
};

const ECHOES = new WeakMap<RunState, EchoState>();

function echoState(run: RunState): EchoState {
  let state = ECHOES.get(run);
  if (!state) {
    state = { current: {}, previous: {} };
    ECHOES.set(run, state);
  }
  return state;
}

export function beginEchoTrail(run: RunState, key: EchoKey): number[] {
  const trail: number[] = [];
  echoState(run).current[key] = trail;
  return trail;
}

export function previousEchoTrail(run: RunState, key: EchoKey): readonly number[] {
  return echoState(run).previous[key] ?? [];
}

export function archiveEchoTrails(run: RunState): void {
  const state = echoState(run);
  state.previous = state.current;
  state.current = {};
}

export class LoopEchoTrail {
  private readonly record: number[];
  private readonly previous: readonly number[];
  private readonly ghost?: Phaser.GameObjects.Sprite;
  private elapsed = 0;
  private sampleElapsed = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    run: RunState,
    key: EchoKey,
    groundY: number,
  ) {
    this.previous = previousEchoTrail(run, key);
    this.record = beginEchoTrail(run, key);
    const texture = scene.textures.exists('elena') ? 'elena' : 'elena-fallback';
    if (this.previous.length >= 8 && scene.textures.exists(texture)) {
      this.ghost = scene.add.sprite(this.previous[0], groundY, texture, 0)
        .setOrigin(0.5, 1)
        .setDisplaySize(80, 112)
        .setDepth(groundY - 1)
        .setAlpha(0.28)
        .setTint(0xb9e6ff);
      if (scene.anims.exists('elena-walk-neutral')) this.ghost.play('elena-walk-neutral');
    }
  }

  update(playerX: number, deltaMs: number): void {
    const delta = Math.min(deltaMs, 50) / 1000;
    this.elapsed += delta;
    this.sampleElapsed += delta;
    if (this.sampleElapsed >= 0.12 && this.record.length < 600) {
      this.sampleElapsed -= 0.12;
      this.record.push(playerX);
    }

    if (!this.ghost || this.previous.length < 2) return;
    this.ghost.setVisible(!this.scene.registry.get('reduceMotion'));
    const position = (this.elapsed / 0.12) % this.previous.length;
    const index = Math.floor(position);
    const next = (index + 1) % this.previous.length;
    this.ghost.x = this.previous[index] + (this.previous[next] - this.previous[index]) * (position - index);
  }

  snapshot(): { recorded: number; previous: number; visible: boolean } {
    return { recorded: this.record.length, previous: this.previous.length, visible: Boolean(this.ghost?.visible) };
  }

  destroy(): void {
    this.ghost?.destroy();
  }
}
