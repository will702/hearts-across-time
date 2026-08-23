import Phaser from 'phaser';

import { Player } from '../entities/Player';
import { LEGACY_ENTRY_PATH } from '../narrative/storyData';
import type { StoryRunner } from '../narrative/StoryRunner';
import { InputSystem } from '../systems/InputSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import type { RunState, SaveSystem } from '../systems/SaveSystem';
import { SurfaceSystem } from '../systems/SurfaceSystem';
import { ERA_1944 } from '../world/era1944';
import { WorldFactory } from '../world/WorldFactory';
import type { WorldObject } from '../world/WorldObject';
import type { WorldAction, WorldState } from '../world/worldTypes';
import type { UIScene } from './UIScene';

type EraData = { run: RunState; playerX?: number };

const WATCH_BLOCKER_X = 398;
const WATCH_RESUME_X = 478;
const AUTOSAVE_MS = 750;

export class Era1944Scene extends Phaser.Scene {
  private run!: RunState;
  private save!: SaveSystem;
  private runner!: StoryRunner;
  private player!: Player;
  private controls!: InputSystem;
  private surfaces!: SurfaceSystem;
  private interactions!: InteractionSystem;
  private worldFactory!: WorldFactory;
  private objects: WorldObject[] = [];
  private ui!: UIScene;
  private lastSavedX = Number.NaN;
  private autosaveElapsed = 0;
  private lookAhead = 0;
  private handingOff = false;
  private touchControls = false;

  constructor() {
    super('Era1944Scene');
  }

  create(data: EraData): void {
    this.run = data.run;
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.runner = this.registry.get('storyRunner') as StoryRunner;
    this.registry.set('nativeState', 'era1944');
    this.touchControls = this.sys.game.device.input.touch
      || new URLSearchParams(location.search).get('touch') === '1';

    this.physics.world.setBounds(0, 0, ERA_1944.width, ERA_1944.height);
    this.cameras.main.setBounds(0, 0, ERA_1944.width, ERA_1944.height);
    this.createWorldLayers();

    this.surfaces = new SurfaceSystem(this);
    const spawnX = this.validSpawnX(data.playerX);
    this.player = new Player(this, spawnX, ERA_1944.spawn.y, {
      reduceMotion: Boolean(this.registry.get('reduceMotion')),
      surfaceAt: (x, y) => this.surfaces.materialAt(x, y, ERA_1944.defaultSurface),
      onStep: (surface) => this.playFootstep(surface),
    });
    this.worldFactory = new WorldFactory(this);
    this.objects = this.worldFactory.createAll(ERA_1944.objects, this.worldState());
    this.surfaces.load(ERA_1944, this.player, this.objects);
    this.interactions = new InteractionSystem(this.objects);
    this.controls = new InputSystem(this);

    this.cameras.main.startFollow(this.player, true, 0.075, 0.12);
    this.cameras.main.setDeadzone(250, 150);
    this.scene.launch('UIScene', { input: this.controls });
    this.ui = this.scene.get('UIScene') as UIScene;
    this.lastSavedX = spawnX;
    this.save.saveCycle('1944', this.run, spawnX);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  update(_time: number, delta: number): void {
    if (this.handingOff) return;
    const input = this.controls.read();
    this.player.updatePlayer(input, delta);
    const body = this.player.arcadeBody;
    const action = this.interactions.update(
      this.worldState(),
      { x: body.center.x, y: body.bottom },
      input,
    );

    const active = this.interactions.active;
    this.ui.setPrompt(active?.prompt?.[this.touchControls ? 'touch' : 'keyboard'] ?? '');
    if (action) this.perform(action);

    const targetLookAhead = Phaser.Math.Clamp(body.velocity.x * 0.22, -72, 72);
    this.lookAhead = Phaser.Math.Linear(this.lookAhead, targetLookAhead, 0.08);
    this.cameras.main.setFollowOffset(this.lookAhead, 0);

    this.autosaveElapsed += Math.min(delta, 50);
    if (this.autosaveElapsed >= AUTOSAVE_MS && Math.abs(this.player.x - this.lastSavedX) >= 2) {
      this.autosaveElapsed = 0;
      this.lastSavedX = this.player.x;
      this.save.saveCycle('1944', this.run, this.player.x);
    }
  }

  snapshot(): Record<string, unknown> {
    const body = this.player.arcadeBody;
    const active = this.interactions.active;
    return {
      era: '1944',
      player: {
        x: Number(this.player.x.toFixed(2)),
        y: Number(body.bottom.toFixed(2)),
        vx: Number(body.velocity.x.toFixed(2)),
        blocked: { left: body.blocked.left, right: body.blocked.right, down: body.blocked.down },
        footCollider: { width: Number(body.width.toFixed(2)), height: Number(body.height.toFixed(2)) },
      },
      camera: {
        scrollX: Number(this.cameras.main.scrollX.toFixed(2)),
        lookAhead: Number(this.lookAhead.toFixed(2)),
      },
      interaction: active
        ? { id: active.id, prompt: active.prompt?.[this.touchControls ? 'touch' : 'keyboard'] ?? '' }
        : null,
      touchControls: this.touchControls,
      run: {
        watchRepaired: this.run.watchRepaired,
        challenge1944: this.run.challenges['1944'],
      },
      save: {
        saveVersion: this.save.data.saveVersion,
        era: this.save.data.game?.era ?? null,
        playerX: this.save.data.game?.playerX ?? null,
      },
    };
  }

  private createWorldLayers(): void {
    this.add.rectangle(ERA_1944.width / 2, ERA_1944.height / 2, ERA_1944.width, ERA_1944.height, 0x443426)
      .setDepth(-30);

    if (this.textures.exists('bg1944-far')) {
      this.add.image(0, 92, 'bg1944-far').setOrigin(0).setScale(0.75).setScrollFactor(0.14).setDepth(-25);
    }
    const hasPaintedGround = this.textures.exists('bg1944-mid');
    if (hasPaintedGround) {
      this.add.image(0, -312, 'bg1944-mid').setOrigin(0).setScale(0.75).setScrollFactor(0.45).setDepth(-20);
    }

    if (!hasPaintedGround) {
      this.add.rectangle(ERA_1944.width / 2, 472, ERA_1944.width, 136, 0x4a3b2c).setDepth(-12);
      const ground = this.add.graphics().setDepth(-11);
      ground.fillStyle(0x392b20, 0.8);
      for (let x = 30; x < ERA_1944.width; x += 152) ground.fillRoundedRect(x, 414 + (x % 304 ? 50 : 0), 70, 9, 4);
      ground.fillStyle(0x6b3d2b, 0.3);
      for (let x = 95; x < ERA_1944.width; x += 230) ground.fillEllipse(x, 493 + (x % 3) * 5, 72, 13);
    }

    this.createAnimatedProp('prop-flag1944', 390, 444, 132, 5, 438);
    this.createAnimatedProp('prop-lantern1944', 620, 436, 94, 3.2, 439);

    if (this.textures.exists('bg1944-fg')) {
      this.add.image(0, 412, 'bg1944-fg').setOrigin(0).setDisplaySize(1470, 200).setDepth(1000);
    }
  }

  private createAnimatedProp(key: string, x: number, y: number, height: number, fps: number, depth: number): void {
    if (!this.textures.exists(key)) return;
    const sprite = this.add.sprite(x, y, key, 0).setOrigin(0.5, 1).setDisplaySize(height, height).setDepth(depth);
    if (this.registry.get('reduceMotion')) return;
    const animation = `${key}-native`;
    if (!this.anims.exists(animation)) {
      this.anims.create({ key: animation, frames: this.anims.generateFrameNumbers(key, { frames: [0, 1, 2] }), frameRate: fps, repeat: -1 });
    }
    sprite.play(animation);
  }

  private validSpawnX(savedX?: number): number {
    const x = Number.isFinite(savedX) ? Number(savedX) : ERA_1944.spawn.x;
    const bounded = Phaser.Math.Clamp(x, ERA_1944.spawn.x, ERA_1944.width - 40);
    return this.run.watchRepaired ? bounded : Math.min(bounded, WATCH_BLOCKER_X - 24);
  }

  private worldState(): WorldState {
    return {
      watchRepaired: this.run.watchRepaired,
      challenges: this.run.challenges,
      inspected: this.save.data.inspected,
    };
  }

  private perform(action: WorldAction): void {
    if (action.type === 'watchrepair') {
      this.openWatchRepair();
      return;
    }
    if (action.type === 'lore') {
      this.save.save({
        ...this.save.data,
        inspected: { ...this.save.data.inspected, [action.id]: 1 },
      });
      this.worldFactory.refresh(this.objects, this.worldState());
      this.ui.showToast(action.id === 'lore_crate'
        ? 'Jejak ditemukan: peti obat dan ampul tanpa label.'
        : 'Jejak ditemukan: sisa suar masih menyimpan panas.');
      return;
    }
    this.handoffToLegacy();
  }

  private openWatchRepair(): void {
    this.controls.setEnabled(false);
    this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
    this.ui.setPrompt('');
    this.scene.launch('WatchRepairScene', {
      run: this.run,
      save: this.save,
      onComplete: () => {
        this.scene.resume();
        this.controls.setEnabled(true);
        this.player.arcadeBody.reset(WATCH_RESUME_X, ERA_1944.groundY);
        this.lastSavedX = WATCH_RESUME_X;
        this.worldFactory.refresh(this.objects, this.worldState());
        this.registry.set('nativeState', 'era1944');
        this.ui.showToast('Arloji Arthur kembali berdetak. Jalan terbuka.');
      },
    });
    this.scene.pause();
  }

  private handoffToLegacy(): void {
    if (!this.runner.transition('1944', 'legacy', this.run)) return;
    this.handingOff = true;
    this.controls.setEnabled(false);
    this.player.arcadeBody.stop();
    this.save.saveCycle('1944', this.run, this.player.x);
    location.assign(LEGACY_ENTRY_PATH);
  }

  private playFootstep(surface: string): void {
    const key = surface === 'metal'
      ? 'step-metal'
      : Math.floor(this.player.x / 30) % 2 ? 'step-mud-1' : 'step-mud-0';
    if (!this.cache.audio.exists(key)) return;
    const options = this.registry.get('options') as Record<string, unknown> | undefined;
    const value = Number(options?.volSfx ?? options?.vol ?? 0.9);
    const volume = Phaser.Math.Clamp(Number.isFinite(value) ? value : 0.9, 0, 1) ** 2.2 * 0.34;
    this.sound.play(key, { volume, rate: 0.96 + (Math.floor(this.player.x) % 5) * 0.02 });
  }

  private shutdown(): void {
    if (!this.handingOff && this.player?.active) this.save.saveCycle('1944', this.run, this.player.x);
    this.scene.stop('WatchRepairScene');
    this.scene.stop('UIScene');
    this.controls?.destroy();
    this.surfaces?.destroy();
    this.worldFactory?.destroy(this.objects);
    this.objects = [];
    this.player?.destroy();
  }
}
