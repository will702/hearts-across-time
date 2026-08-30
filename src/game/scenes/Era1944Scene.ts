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
import { playArrivalSequence, type ArrivalBackdropFrame } from './playArrivalSequence';

type EraData = { run: RunState; playerX?: number; intro?: boolean };

const WATCH_BLOCKER_X = 398;
const WATCH_RESUME_X = 478;
const AUTOSAVE_MS = 750;
const BOMB_FLASH_MIN_MS = 4_500;
const BOMB_FLASH_MAX_MS = 8_500;
const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const TRENCH_WALKWAY_TEXTURE = 'world-1944-trench-walkway';
const FIGMA_FRAME_SCALE = VIEW_WIDTH / 3233;
const FIGMA_FRAME_TOP = (VIEW_HEIGHT - 2102 * FIGMA_FRAME_SCALE) / 2;
const figmaFrame = (x: number, y: number, width: number, height: number): ArrivalBackdropFrame => ({
  x: x * FIGMA_FRAME_SCALE,
  y: y * FIGMA_FRAME_SCALE + FIGMA_FRAME_TOP,
  width: width * FIGMA_FRAME_SCALE,
  height: height * FIGMA_FRAME_SCALE,
});
const FIGMA_1944_INTRO_FRAMES: ArrivalBackdropFrame[] = [
  figmaFrame(0, -2951, 9053, 5053),
  figmaFrame(-1956, -1451, 8393, 4684),
  figmaFrame(-1395, 0, 4628, 2583),
];
const FIGMA_1944_ELENA = figmaFrame(-557, 229, 4348, 2492);

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
  private entryCinematicObjects: Phaser.GameObjects.GameObject[] = [];
  private entryElena?: Phaser.GameObjects.Image;
  private bombFlash?: Phaser.GameObjects.Rectangle;
  private nextBombFlashAt = Number.POSITIVE_INFINITY;

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
    this.createBattleAtmosphere();

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
      backdrop: 'bg1944-mid',
      backdropFrames: FIGMA_1944_INTRO_FRAMES,
      showChrome: false,
      onComplete: () => this.launchEntryDialogue(),
    });
  }

  private launchEntryDialogue(): void {
    this.arrivalActive = false;
    this.cameras.main.startFollow(this.player, true, 0.075, 0.12);
    this.cameras.main.setDeadzone(250, 150);
    this.createEntryDialogueBackdrop();
    const payload = this.dialoguePayload('war_intro', () => {
      this.destroyEntryDialogueBackdrop();
      this.ui.setModal(false);
      this.scene.resume();
      this.controls.setEnabled(true);
      this.registry.set('nativeState', 'era1944');
    });
    payload.cinematicSpeaker = true;
    payload.speakerAnchor = who => who === 'elena'
      ? { x: VIEW_WIDTH / 2, headY: 120 }
      : null;
    payload.speakerVisual = who => who === 'elena' ? this.entryElena ?? null : null;
    payload.setSpeakerExpression = (who: CharacterId, expr: Expression) => {
      const arthur = this.objects.find(object => object.definition.id === 'arthur');
      const rig = new EraSpeakerRig(this.cameras.main, this.player, arthur?.visual, 'muda');
      rig.setExpression(who, expr);
      if ((who === 'elena' || who === 'narrator') && this.entryElena) {
        const key = (expr === 'sad' || expr === 'shock') && this.textures.exists('elena-dialog-sad')
          ? 'elena-dialog-sad'
          : 'elena-dialog';
        if (this.textures.exists(key)) this.entryElena.setTexture(key);
      }
    };
    this.scene.launch('DialogueScene', payload);
    this.scene.pause();
  }

  /** Komposisi frame Figma 68:54: crop ledakan, vignette, dan Elena besar di tengah. */
  private createEntryDialogueBackdrop(): void {
    this.destroyEntryDialogueBackdrop();
    const frame = FIGMA_1944_INTRO_FRAMES[FIGMA_1944_INTRO_FRAMES.length - 1];
    if (frame && this.textures.exists('bg1944-mid')) {
      const background = this.add.image(frame.x, frame.y, 'bg1944-mid')
        .setOrigin(0)
        .setDisplaySize(frame.width, frame.height)
        .setScrollFactor(0)
        .setDepth(2998);
      this.entryCinematicObjects.push(background);
    }

    const shade = this.add.graphics().setScrollFactor(0).setDepth(2999);
    shade.fillGradientStyle(0x090504, 0x090504, 0x090504, 0x090504, 0.42, 0.42, 0, 0);
    shade.fillRect(0, 0, VIEW_WIDTH, 180);
    shade.fillGradientStyle(0x080403, 0x080403, 0x080403, 0x080403, 0, 0, 0.5, 0.5);
    shade.fillRect(0, 300, VIEW_WIDTH, VIEW_HEIGHT - 300);
    this.entryCinematicObjects.push(shade);

    const elenaKey = this.textures.exists('elena-dialog-sad') ? 'elena-dialog-sad' : 'elena-dialog';
    if (this.textures.exists(elenaKey)) {
      this.entryElena = this.add.image(FIGMA_1944_ELENA.x, FIGMA_1944_ELENA.y, elenaKey)
        .setOrigin(0)
        .setDisplaySize(FIGMA_1944_ELENA.width, FIGMA_1944_ELENA.height)
        .setScrollFactor(0)
        .setDepth(3000);
      this.entryCinematicObjects.push(this.entryElena);
    }
  }

  private destroyEntryDialogueBackdrop(): void {
    this.entryCinematicObjects.forEach(object => object.destroy());
    this.entryCinematicObjects = [];
    this.entryElena = undefined;
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
    this.updateBattleAtmosphere(time);
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
      this.add.image(0, ERA_1944.height, 'bg1944-far').setOrigin(0, 1).setDisplaySize(ERA_1944.width, ERA_1944.height).setScrollFactor(0.14).setDepth(-25);
    }
    const hasPaintedGround = this.textures.exists('bg1944-mid');
    if (hasPaintedGround) {
      this.add.image(0, ERA_1944.height, 'bg1944-mid').setOrigin(0, 1).setDisplaySize(ERA_1944.width, ERA_1944.height).setScrollFactor(0.45).setDepth(-20);
    }

    if (!hasPaintedGround) {
      this.add.rectangle(ERA_1944.width / 2, 472, ERA_1944.width, 136, 0x4a3b2c).setDepth(-12);
      const ground = this.add.graphics().setDepth(-11);
      ground.fillStyle(0x392b20, 0.8);
      for (let x = 30; x < ERA_1944.width; x += 152) ground.fillRoundedRect(x, 414 + (x % 304 ? 50 : 0), 70, 9, 4);
      ground.fillStyle(0x6b3d2b, 0.3);
      for (let x = 95; x < ERA_1944.width; x += 230) ground.fillEllipse(x, 493 + (x % 3) * 5, 72, 13);
    }

    this.createTrenchWalkway();
    this.createAnimatedProp('prop-flag1944', 390, 444, 132, 5, 438);
    this.createAnimatedProp('prop-lantern1944', 620, 436, 94, 3.2, 439);

    if (this.textures.exists('bg1944-fg')) {
      this.add.image(0, ERA_1944.height, 'bg1944-fg').setOrigin(0, 1).setDisplaySize(ERA_1944.width, 140).setDepth(430);
    }
  }

  /** Jalur papan parit memberi bidang pijak yang jelas tanpa mengubah collider tanah. */
  private createTrenchWalkway(): void {
    const textureHeight = 58;
    if (!this.textures.exists(TRENCH_WALKWAY_TEXTURE)) {
      const walkway = this.add.graphics();

      // Dasar lumpur tidak rata agar menyatu dengan sapuan watercolor latar.
      walkway.fillStyle(0x2a211b, 0.68);
      walkway.beginPath();
      walkway.moveTo(0, 15);
      for (let x = 0; x <= ERA_1944.width; x += 70) {
        walkway.lineTo(x, 16 + Math.sin(x * 0.031) * 4);
      }
      for (let x = ERA_1944.width; x >= 0; x -= 85) {
        walkway.lineTo(x, 49 + Math.sin(x * 0.024) * 4);
      }
      walkway.closePath();
      walkway.fillPath();

      walkway.fillStyle(0x68503d, 0.32);
      for (let x = 28; x < ERA_1944.width; x += 113) {
        walkway.fillEllipse(x, 24 + (x % 5), 62 + (x % 23), 10);
      }

      // Papan pijak yang jarang dan patah, bukan deretan pagar yang menutup layar.
      for (let x = 42, index = 0; x < ERA_1944.width; x += 205, index += 1) {
        const top = 19 + (index % 3) * 3;
        const bottom = top + 16;
        const skew = index % 2 === 0 ? 3 : -2;
        const color = [0x594337, 0x47372f, 0x654c3d][index % 3];
        walkway.fillStyle(color, 0.62);
        walkway.lineStyle(1, 0x211915, 0.62);
        const points = [
          new Phaser.Math.Vector2(x, top),
          new Phaser.Math.Vector2(x + 112, top + skew),
          new Phaser.Math.Vector2(x + 108, bottom + skew),
          new Phaser.Math.Vector2(x + 2, bottom),
        ];
        walkway.fillPoints(points, true);
        walkway.strokePoints(points, true, true);
        walkway.lineStyle(1, 0xb08a6b, 0.12);
        walkway.lineBetween(x + 10, top + 5, x + 100, top + 5 + skew);
      }

      // Genangan dan noda lumpur menurunkan kesan bentuk vektor yang terlalu bersih.
      walkway.fillStyle(0x101716, 0.34);
      for (let x = 74; x < ERA_1944.width; x += 211) {
        walkway.fillEllipse(x, 43 + (x % 3), 72, 7);
      }
      walkway.fillStyle(0x967257, 0.14);
      for (let x = 31; x < ERA_1944.width; x += 137) {
        walkway.fillEllipse(x, 19 + (x % 4), 17, 4);
      }

      walkway.generateTexture(TRENCH_WALKWAY_TEXTURE, ERA_1944.width, textureHeight);
      walkway.destroy();
    }

    this.add.image(0, ERA_1944.groundY - 29, TRENCH_WALKWAY_TEXTURE)
      .setName('trench-walkway')
      .setOrigin(0)
      .setDepth(420);
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

  /** Kilatan ledakan jauh: singkat, hangat, dan tidak mengganggu HUD atau input. */
  private createBattleAtmosphere(): void {
    this.bombFlash = this.add.rectangle(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      VIEW_WIDTH,
      VIEW_HEIGHT,
      0xffd58a,
    )
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0)
      .setDepth(850);

    // Kilatan pertama segera terasa setelah intro/dialog selesai.
    this.nextBombFlashAt = this.time.now + 2_500;
  }

  private updateBattleAtmosphere(time: number): void {
    if (
      !this.bombFlash
      || this.arrivalActive
      || time < this.nextBombFlashAt
    ) return;

    this.triggerBombFlash();
    this.scheduleNextBombFlash(time);
  }

  private scheduleNextBombFlash(fromTime: number): void {
    this.nextBombFlashAt = fromTime + Phaser.Math.Between(BOMB_FLASH_MIN_MS, BOMB_FLASH_MAX_MS);
  }

  private triggerBombFlash(): void {
    if (!this.bombFlash) return;
    const reduced = Boolean(this.registry.get('reduceMotion'));
    this.tweens.killTweensOf(this.bombFlash);
    this.bombFlash
      .setFillStyle(Phaser.Math.RND.pick([0xffe2a8, 0xffc66d, 0xfff0ca]), 1)
      .setAlpha(reduced ? 0.12 : 0.3);
    this.tweens.add({
      targets: this.bombFlash,
      alpha: 0,
      duration: reduced ? 900 : 520,
      ease: 'Cubic.easeOut',
    });
    if (!reduced) this.cameras.main.shake(180, 0.0025);
    this.soundManager?.playBoom();
  }

  private shutdown(): void {
    this.destroyEntryDialogueBackdrop();
    if (this.player?.active) this.save.saveCycle('1944', this.run, this.player.x);
    this.scene.stop('WatchRepairScene');
    this.scene.stop('SpotlightChallengeScene');
    this.scene.stop('DialogueScene');
    this.scene.stop('UIScene');
    this.controls?.destroy();
    if (this.bombFlash) {
      this.tweens.killTweensOf(this.bombFlash);
      this.bombFlash.destroy();
      this.bombFlash = undefined;
    }
    this.grade?.destroy();
    this.grade = undefined;
    this.surfaces?.destroy();
    this.worldFactory?.destroy(this.objects);
    this.objects = [];
    this.player?.destroy();
    this.echo?.destroy();
  }
}
