import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { Player } from '../entities/Player';
import { LORE_COMPLETION_TEXT, isLoreId, recordLoreInspection } from '../narrative/lore';
import type { CharacterId, Expression } from '../narrative/storyScript';
import { EraGradeSystem } from '../systems/EraGradeSystem';
import { InputSystem } from '../systems/InputSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LoopEchoTrail } from '../systems/LoopEchoTrail';
import type { RunState, SaveSystem } from '../systems/SaveSystem';
import { SurfaceSystem } from '../systems/SurfaceSystem';
import { ERA_1944 } from '../world/era1944';
import { WorldFactory } from '../world/WorldFactory';
import type { WorldObject } from '../world/WorldObject';
import type { WorldAction, WorldState } from '../world/worldTypes';
import type { DialogueSceneData } from './DialogueScene';
import { EraSpeakerRig } from './eraSpeakerRig';
import type { UIScene } from './UIScene';
import { playArrivalSequence } from './playArrivalSequence';

type EraData = { run: RunState; playerX?: number; intro?: boolean };

const WATCH_BLOCKER_X = 398;
const WATCH_RESUME_X = 478;
const AUTOSAVE_MS = 750;

export class Era1944Scene extends Phaser.Scene {
  private run!: RunState;
  private save!: SaveSystem;
  private soundManager?: SoundManager;
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
  private echo?: LoopEchoTrail;
  private grade?: EraGradeSystem;
  private arrivalActive = false;

  constructor() {
    super('Era1944Scene');
  }

  create(data: EraData): void {
    this.run = data.run;
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'era1944');
    this.registry.set('runLoop', this.run.loop);

    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.soundManager?.setAmbience('1944');

    this.touchControls = this.sys.game.device.input.touch
      || new URLSearchParams(location.search).get('touch') === '1';

    this.physics.world.setBounds(0, 0, ERA_1944.width, ERA_1944.height);
    this.cameras.main.setBounds(0, 0, ERA_1944.width, ERA_1944.height);
    this.createWorldLayers();
    this.grade = new EraGradeSystem(this, '1944');

    this.surfaces = new SurfaceSystem(this);
    const spawnX = this.validSpawnX(data.playerX);
    this.player = new Player(this, spawnX, ERA_1944.spawn.y, {
      loop: this.run.loop,
      reduceMotion: Boolean(this.registry.get('reduceMotion')),
      surfaceAt: (x, y) => this.surfaces.materialAt(x, y, ERA_1944.defaultSurface),
      onStep: (surface) => this.playFootstep(surface),
    });
    this.echo = new LoopEchoTrail(this, this.run, '1944', ERA_1944.groundY);
    this.worldFactory = new WorldFactory(this);
    this.objects = this.worldFactory.createAll(ERA_1944.objects, this.worldState());
    this.surfaces.load(ERA_1944, this.player, this.objects);
    this.interactions = new InteractionSystem(this.objects);
    this.controls = new InputSystem(this);

    this.cameras.main.startFollow(this.player, true, 0.075, 0.12);
    this.cameras.main.setDeadzone(250, 150);
    this.scene.launch('UIScene', { input: this.controls, eraTitle: 'BABAK 1 — GARIS DEPAN, 1944', run: this.run });
    this.ui = this.scene.get('UIScene') as UIScene;
    this.lastSavedX = spawnX;
    this.save.saveCycle('1944', this.run, spawnX);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    if (data.intro) this.startEraIntro();
  }

  private startEraIntro(): void {
    this.arrivalActive = true;
    this.registry.set('nativeState', 'arrival1944');
    this.controls.setEnabled(false);
    this.player.arcadeBody.setVelocityX(0);
    this.ui.setModal(true);
    playArrivalSequence(this, {
      caption: '1944 — GARIS DEPAN',
      duration: 3250,
      startZoom: 3.25,
      startFocusX: 210,
      endFocusX: 575,
      groundY: ERA_1944.groundY,
      onComplete: () => this.launchEntryDialogue(),
    });
  }

  private launchEntryDialogue(): void {
    this.arrivalActive = false;
    this.cameras.main.startFollow(this.player, true, 0.075, 0.12);
    this.cameras.main.setDeadzone(250, 150);
    this.ui.setModal(false);
    this.scene.launch('DialogueScene', this.dialoguePayload('war_intro', () => {
      this.scene.resume();
      this.controls.setEnabled(true);
      this.registry.set('nativeState', 'era1944');
    }));
    this.scene.pause();
  }

  /** Payload DialogueScene lengkap dengan jangkar balon komik era ini. */
  private dialoguePayload(
    nodeId: string,
    onComplete: DialogueSceneData['onComplete'],
  ): DialogueSceneData {
    const arthur = this.objects.find(object => object.definition.id === 'arthur');
    const rig = new EraSpeakerRig(this.cameras.main, this.player, arthur?.visual, 'muda');
    return {
      nodeId,
      run: this.run,
      speakerAnchor: (who: CharacterId) => rig.anchor(who),
      setSpeakerExpression: (who: CharacterId, expr: Expression) => rig.setExpression(who, expr),
      speakerVisual: who => rig.visual(who),
      resetSpeakers: () => rig.reset(),
      onComplete,
    };
  }

  update(time: number, delta: number): void {
    this.grade?.update(time);
    const input = this.controls.read();
    this.player.updatePlayer(input, delta);
    if (this.arrivalActive) return;
    this.echo?.update(this.player.x, delta);
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
      arrivalActive: this.arrivalActive,
      echo: this.echo?.snapshot(),
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
    if (this.textures.exists('bg1944-mid')) {
      this.add.image(0, -312, 'bg1944-mid').setOrigin(0).setScale(0.75).setScrollFactor(0.35).setDepth(-20);
    }

    // 1:1 Solid Trench Ground Floor (Duckboards, mud ruts, puddle glints, timber planks)
    const ground = this.add.graphics().setDepth(-6);
    // Base solid mud layer
    ground.fillStyle(0x3a2c20, 1);
    ground.fillRect(0, ERA_1944.groundY, ERA_1944.width, ERA_1944.height - ERA_1944.groundY);

    // Weathered timber duckboard planks running across the frontline trench
    for (let x = 0; x < ERA_1944.width; x += 32) {
      const plankW = 28;
      const plankH = 14;
      const isAlt = (x / 32) % 2 === 0;
      // Plank shadow
      ground.fillStyle(0x221810, 0.7);
      ground.fillRect(x + 2, ERA_1944.groundY + 1, plankW, plankH + 2);
      // Plank body
      ground.fillStyle(isAlt ? 0x5a422d : 0x4d3725, 1);
      ground.fillRoundedRect(x, ERA_1944.groundY, plankW, plankH, 2);
      // Wood grain / nail rivets
      ground.fillStyle(0x352417, 0.85);
      ground.fillRect(x + 4, ERA_1944.groundY + 3, 2, 2);
      ground.fillRect(x + plankW - 6, ERA_1944.groundY + 3, 2, 2);
      ground.fillRect(x + 4, ERA_1944.groundY + 10, 2, 2);
      ground.fillRect(x + plankW - 6, ERA_1944.groundY + 10, 2, 2);
      // Plank top edge highlight
      ground.fillStyle(0x75593e, 0.4);
      ground.fillRect(x + 1, ERA_1944.groundY, plankW - 2, 1.5);
    }

    // Wet mud ruts & watercolor puddle glints between timber sections
    ground.fillStyle(0x2d1f14, 0.85);
    for (let x = 40; x < ERA_1944.width; x += 180) {
      ground.fillEllipse(x + 20, ERA_1944.groundY + 18, 64, 12);
    }
    ground.fillStyle(0x6b4f35, 0.35);
    for (let x = 110; x < ERA_1944.width; x += 220) {
      ground.fillEllipse(x, ERA_1944.groundY + 22, 78, 14);
    }

    this.createAnimatedProp('prop-flag1944', 390, 444, 132, 5, 438);
    this.createAnimatedProp('prop-lantern1944', 620, 436, 94, 3.2, 439);

    if (this.textures.exists('bg1944-fg')) {
      this.add.image(0, ERA_1944.groundY - 14, 'bg1944-fg').setOrigin(0).setDisplaySize(1470, 200).setDepth(445);
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
      roseRepaired: this.run.roseRepaired,
      gemAligned: this.run.gemAligned,
      photoRepaired: this.run.photoRepaired,
      challenges: this.run.challenges,
      inspected: this.save.data.inspected,
    };
  }

  private perform(action: WorldAction): void {
    if (action.type === 'watchrepair') {
      this.openWatchRepair();
      return;
    }
    if (action.type === 'challenge') {
      this.openSpotlightChallenge();
      return;
    }
    if (action.type === 'lore') {
      this.openLore(action.id);
      return;
    }
    if (action.type === 'dialog') {
      this.openArthurDialogue();
    }
  }

  private openLore(id: string): void {
    if (!isLoreId(id)) return;
    const discovery = recordLoreInspection(
      this.save.data.inspected,
      id,
      Boolean(this.save.data.loreToastDone),
    );
    this.save.save({
      ...this.save.data,
      inspected: discovery.inspected,
      loreToastDone: Boolean(this.save.data.loreToastDone) || discovery.completedNow,
    });
    this.worldFactory.refresh(this.objects, this.worldState());
    this.controls.setEnabled(false);
    this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
    this.ui.setPrompt('');
    this.scene.launch('DialogueScene', this.dialoguePayload(id, () => {
      this.scene.resume();
      this.controls.setEnabled(true);
      this.registry.set('nativeState', 'era1944');
      if (discovery.completedNow) {
        this.soundManager?.playChime();
        this.ui.showToast(LORE_COMPLETION_TEXT, 4200);
      }
    }));
    this.scene.pause();
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
        this.ui.showToast('Arloji Arthur disimpan. Jalan terbuka.', 3000);
      },
    });
    this.scene.pause();
  }

  private openSpotlightChallenge(): void {
    this.controls.setEnabled(false);
    this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
    this.ui.setPrompt('');
    this.scene.launch('SpotlightChallengeScene', {
      run: this.run,
      save: this.save,
      onComplete: () => {
        this.scene.resume();
        this.controls.setEnabled(true);
        this.player.arcadeBody.reset(765, ERA_1944.groundY);
        this.lastSavedX = 765;
        this.worldFactory.refresh(this.objects, this.worldState());
        this.registry.set('nativeState', 'era1944');
      },
    });
    this.scene.pause();
  }

  private openArthurDialogue(): void {
    this.controls.setEnabled(false);
    this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
    this.scene.launch('DialogueScene', this.dialoguePayload('n_b1', (res?: { type: string; to?: string }) => {
      if (res?.type === 'vortex' || res?.to === '1968') {
        this.scene.start('VortexScene', { to: '1968', run: this.run });
      } else {
        this.scene.resume();
        this.controls.setEnabled(true);
        this.registry.set('nativeState', 'era1944');
      }
    }));
    this.scene.pause();
  }

  private playFootstep(surface: string): void {
    this.soundManager?.playFootstep(surface, this.player.x);
  }

  private shutdown(): void {
    if (this.player?.active) this.save.saveCycle('1944', this.run, this.player.x);
    this.scene.stop('WatchRepairScene');
    this.scene.stop('SpotlightChallengeScene');
    this.scene.stop('DialogueScene');
    this.scene.stop('UIScene');
    this.controls?.destroy();
    this.grade?.destroy();
    this.grade = undefined;
    this.surfaces?.destroy();
    this.worldFactory?.destroy(this.objects);
    this.objects = [];
    this.player?.destroy();
    this.echo?.destroy();
  }
}
