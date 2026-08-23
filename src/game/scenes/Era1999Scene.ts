import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { InputSystem } from '../systems/InputSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import type { RunState, SaveSystem } from '../systems/SaveSystem';
import { SurfaceSystem } from '../systems/SurfaceSystem';
import { ERA_1999 } from '../world/era1999';
import { WorldFactory } from '../world/WorldFactory';
import type { WorldObject } from '../world/WorldObject';
import type { WorldAction, WorldState } from '../world/worldTypes';
import type { UIScene } from './UIScene';

type EraData = { run: RunState; playerX?: number };

const AUTOSAVE_MS = 750;

export class Era1999Scene extends Phaser.Scene {
  private run!: RunState;
  private save!: SaveSystem;
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
  private touchControls = false;

  constructor() {
    super('Era1999Scene');
  }

  create(data: EraData): void {
    this.run = data.run;
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'era1999');
    this.touchControls = this.sys.game.device.input.touch || new URLSearchParams(location.search).get('touch') === '1';

    this.physics.world.setBounds(0, 0, ERA_1999.width, ERA_1999.height);
    this.cameras.main.setBounds(0, 0, ERA_1999.width, ERA_1999.height);
    this.createWorldLayers();

    this.surfaces = new SurfaceSystem(this);
    const spawnX = typeof data.playerX === 'number' ? data.playerX : ERA_1999.spawn.x;

    this.player = new Player(this, spawnX, ERA_1999.spawn.y, {
      reduceMotion: Boolean(this.registry.get('reduceMotion')),
      surfaceAt: () => 'metal',
      onStep: () => this.playFootstep(),
    });

    this.worldFactory = new WorldFactory(this);
    this.objects = this.worldFactory.createAll(ERA_1999.objects, this.worldState());
    this.surfaces.load(ERA_1999, this.player, this.objects);
    this.interactions = new InteractionSystem(this.objects);
    this.controls = new InputSystem(this);

    this.cameras.main.startFollow(this.player, true, 0.075, 0.12);
    this.cameras.main.setDeadzone(250, 150);

    this.scene.launch('UIScene', { input: this.controls, eraTitle: 'BABAK 3 — 1999' });
    this.ui = this.scene.get('UIScene') as UIScene;
    this.lastSavedX = spawnX;
    this.save.saveCycle('1999', this.run, spawnX);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  update(_time: number, delta: number): void {
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
      this.save.saveCycle('1999', this.run, this.player.x);
    }
  }

  private createWorldLayers(): void {
    this.add.rectangle(ERA_1999.width / 2, ERA_1999.height / 2, ERA_1999.width, ERA_1999.height, 0x091424).setDepth(-30);

    if (this.textures.exists('bg1999-far')) {
      this.add.image(0, 92, 'bg1999-far').setOrigin(0).setScale(0.75).setScrollFactor(0.14).setDepth(-25);
    }
    if (this.textures.exists('bg1999-mid')) {
      this.add.image(0, -312, 'bg1999-mid').setOrigin(0).setScale(0.75).setScrollFactor(0.45).setDepth(-20);
    }

    this.createAnimatedProp('prop-consoleWave1999', 380, 444, 82, 3.5, 438);
    this.createAnimatedProp('prop-frost1999', 720, 444, 88, 2, 439);

    if (this.textures.exists('bg1999-fg')) {
      this.add.image(0, 412, 'bg1999-fg').setOrigin(0).setDisplaySize(1120, 150).setDepth(1000);
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

  private worldState(): WorldState {
    return {
      watchRepaired: this.run.watchRepaired,
      roseRepaired: this.run.roseRepaired,
      gemAligned: this.run.gemAligned,
      photoRepaired: this.run.photoRepaired,
      challenges: this.run.challenges,
      inspected: this.save.data.inspected,
    };
  }

  private perform(action: WorldAction): void {
    if (action.type === 'puzzle' && action.id === 'gem') {
      this.controls.setEnabled(false);
      this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
      this.scene.launch('GemAlignScene', {
        run: this.run,
        save: this.save,
        onComplete: () => {
          this.scene.resume();
          this.controls.setEnabled(true);
          this.worldFactory.refresh(this.objects, this.worldState());
          this.registry.set('nativeState', 'era1999');
        },
      });
      this.scene.pause();
      return;
    }

    if (action.type === 'puzzle' && action.id === 'photo') {
      this.controls.setEnabled(false);
      this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
      this.scene.launch('PhotoPuzzleScene', {
        run: this.run,
        save: this.save,
        onComplete: () => {
          this.scene.resume();
          this.controls.setEnabled(true);
          this.worldFactory.refresh(this.objects, this.worldState());
          this.registry.set('nativeState', 'era1999');
        },
      });
      this.scene.pause();
      return;
    }

    if (action.type === 'challenge') {
      this.controls.setEnabled(false);
      this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
      this.scene.launch('CryoBalanceScene', {
        run: this.run,
        save: this.save,
        onComplete: () => {
          this.scene.resume();
          this.controls.setEnabled(true);
          this.worldFactory.refresh(this.objects, this.worldState());
          this.registry.set('nativeState', 'era1999');
        },
      });
      this.scene.pause();
      return;
    }

    if (action.type === 'dialog') {
      this.controls.setEnabled(false);
      this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
      this.scene.launch('DialogueScene', {
        nodeId: 'n_b3',
        run: this.run,
        onComplete: (res?: { type: string; kind?: 'loop' | 'true' }) => {
          if (res?.type === 'ending') {
            this.scene.start('PuzzleAwardScene', { kind: res.kind || 'loop', run: this.run });
          } else {
            this.scene.resume();
            this.controls.setEnabled(true);
            this.registry.set('nativeState', 'era1999');
          }
        },
      });
      this.scene.pause();
    }
  }

  private playFootstep(): void {
    if (!this.cache.audio.exists('step-metal')) return;
    this.sound.play('step-metal', { volume: 0.3, rate: 0.98 + (Math.floor(this.player.x) % 5) * 0.02 });
  }

  private shutdown(): void {
    this.scene.stop('GemAlignScene');
    this.scene.stop('PhotoPuzzleScene');
    this.scene.stop('CryoBalanceScene');
    this.scene.stop('DialogueScene');
    this.scene.stop('UIScene');
    this.controls?.destroy();
    this.surfaces?.destroy();
    this.worldFactory?.destroy(this.objects);
    this.objects = [];
    this.player?.destroy();
  }
}
