import Phaser from 'phaser';
import { ASSET_PACKS, loadAssetPacks } from '../assetManifest';
import type { SoundManager } from '../audio/SoundManager';
import { Player } from '../entities/Player';
import { LORE_COMPLETION_TEXT, isLoreId, recordLoreInspection } from '../narrative/lore';
import type { CharacterId, Expression } from '../narrative/storyScript';
import { InputSystem } from '../systems/InputSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LoopEchoTrail } from '../systems/LoopEchoTrail';
import type { RunState, SaveSystem } from '../systems/SaveSystem';
import { SurfaceSystem } from '../systems/SurfaceSystem';
import { ERA_1968, era1968ArthurAsset, era1968Title } from '../world/era1968';
import { WorldFactory } from '../world/WorldFactory';
import type { WorldObject } from '../world/WorldObject';
import type { WorldAction, WorldState } from '../world/worldTypes';
import type { DialogueSceneData } from './DialogueScene';
import { EraSpeakerRig } from './eraSpeakerRig';
import type { UIScene } from './UIScene';
import { playArrivalSequence, type ArrivalBackdropFrame } from './playArrivalSequence';

type EraData = { run: RunState; playerX?: number; intro?: boolean };

const AUTOSAVE_MS = 750;
const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const FIGMA_FRAME_SCALE = VIEW_WIDTH / 3233;
const FIGMA_FRAME_TOP = (VIEW_HEIGHT - 2102 * FIGMA_FRAME_SCALE) / 2;
const figmaFrame = (x: number, y: number, width: number, height: number): ArrivalBackdropFrame => ({
  x: x * FIGMA_FRAME_SCALE,
  y: y * FIGMA_FRAME_SCALE + FIGMA_FRAME_TOP,
  width: width * FIGMA_FRAME_SCALE,
  height: height * FIGMA_FRAME_SCALE,
});
const FIGMA_1968_LAB_FRAMES: ArrivalBackdropFrame[] = [
  figmaFrame(-930, 0, 7296, 4075),
  figmaFrame(-4153, -1800, 10519, 5875),
  figmaFrame(-354, -52, 3857, 2154),
];
const FIGMA_1968_BUNKER_FRAMES: ArrivalBackdropFrame[] = [
  figmaFrame(-6763, -1029, 11220, 6262),
  figmaFrame(-6402, -3065, 11220, 6262),
  figmaFrame(-160, -162, 4195, 2341),
];
const FIGMA_1968_ELENA = figmaFrame(-557, 229, 4348, 2492);

export class Era1968Scene extends Phaser.Scene {
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
  private arrivalActive = false;
  private entryCinematicObjects: Phaser.GameObjects.GameObject[] = [];
  private entryElena?: Phaser.GameObjects.Image;

  constructor() {
    super('Era1968Scene');
  }

  preload(): void {
    loadAssetPacks(this, ASSET_PACKS.era1968);
  }

  create(data: EraData): void {
    this.run = data.run;
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'era1968');
    this.registry.set('runLoop', this.run.loop);

    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.soundManager?.setAmbience('1968');

    this.touchControls = this.sys.game.device.input.touch || new URLSearchParams(location.search).get('touch') === '1';

    this.physics.world.setBounds(0, 0, ERA_1968.width, ERA_1968.height);
    this.cameras.main.setBounds(0, 0, ERA_1968.width, ERA_1968.height);
    this.createWorldLayers();

    this.surfaces = new SurfaceSystem(this);
    const spawnX = this.validSpawnX(data.playerX);

    this.player = new Player(this, spawnX, ERA_1968.spawn.y, {
      loop: this.run.loop,
      reduceMotion: Boolean(this.registry.get('reduceMotion')),
      surfaceAt: () => 'metal',
      onStep: () => this.playFootstep(),
    });
    this.echo = new LoopEchoTrail(this, this.run, this.run.routeB1 === 'B' ? '1968B' : '1968A', ERA_1968.groundY);

    this.worldFactory = new WorldFactory(this);
    this.objects = this.worldFactory.createAll(ERA_1968.objects, this.worldState());
    const arthur = this.objects.find(object => object.definition.id === 'arthur');
    const arthurAsset = era1968ArthurAsset(this.run.routeB1);
    arthur?.visual
      .setTexture(this.textures.exists(arthurAsset) ? arthurAsset : 'arthur-fallback', 0)
      .setDisplaySize(80, 112);
    this.surfaces.load(ERA_1968, this.player, this.objects);
    this.interactions = new InteractionSystem(this.objects);
    this.controls = new InputSystem(this);

    this.cameras.main.startFollow(this.player, true, 0.075, 0.12);
    this.cameras.main.setDeadzone(250, 150);

    this.scene.launch('UIScene', { input: this.controls, eraTitle: era1968Title(this.run.routeB1), run: this.run });
    this.ui = this.scene.get('UIScene') as UIScene;
    this.lastSavedX = spawnX;
    this.save.saveCycle('1968', this.run, spawnX);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    if (data.intro) this.openEntryDialogue();
  }

  update(_time: number, delta: number): void {
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
      this.save.saveCycle('1968', this.run, this.player.x);
    }
  }

  snapshot(): Record<string, unknown> {
    const body = this.player.arcadeBody;
    const active = this.interactions.active;
    return {
      era: '1968',
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
        roseRepaired: this.run.roseRepaired,
        diaryRead: this.run.diaryRead,
        challenge1968: this.run.challenges['1968'],
      },
      save: {
        saveVersion: this.save.data.saveVersion,
        era: this.save.data.game?.era ?? null,
        playerX: this.save.data.game?.playerX ?? null,
      },
    };
  }

  private createWorldLayers(): void {
    const isLab = this.run.routeB1 === 'B';
    const bgFarKey = isLab ? 'bg1968B-far' : 'bg1968A-far';
    const bgMidKey = isLab ? 'bg1968B-mid' : 'bg1968A-mid';
    const bgFgKey = isLab ? 'bg1968B-fg' : 'bg1968A-fg';
    const fullBackdropKey = isLab ? 'lab-military' : 'bunker-underground';

    this.add.rectangle(ERA_1968.width / 2, ERA_1968.height / 2, ERA_1968.width, ERA_1968.height, isLab ? 0x111c2e : 0x221a14).setDepth(-30);

    if (this.textures.exists(fullBackdropKey)) {
      this.add.image(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, fullBackdropKey)
        .setDisplaySize(VIEW_WIDTH, VIEW_HEIGHT)
        .setScrollFactor(0)
        .setDepth(-25);
    } else if (this.textures.exists(bgFarKey)) {
      this.add.image(0, ERA_1968.height, bgFarKey)
        .setOrigin(0, 1)
        .setDisplaySize(ERA_1968.width, ERA_1968.height)
        .setScrollFactor(0.14)
        .setDepth(-25);
    }
    if (this.textures.exists(bgMidKey)) {
      const layer = this.add.image(0, ERA_1968.groundY, bgMidKey).setOrigin(0, 1);
      const source = layer.texture.getSourceImage() as HTMLImageElement;
      const fittedHeight = ERA_1968.width * source.height / source.width;
      layer.setDisplaySize(ERA_1968.width, fittedHeight).setScrollFactor(0.45).setDepth(-20);
    }

    if (isLab) {
      this.createAnimatedProp('prop-beacon1968B', 360, 444, 82, 4, 438);
      this.createAnimatedProp('prop-steam1968B', 680, 444, 104, 3, 439);
    } else {
      this.createAnimatedProp('prop-bulb1968A', 420, 444, 108, 2.5, 438);
      this.createAnimatedProp('prop-radio1968A', 740, 444, 74, 3, 439);
    }

    if (this.textures.exists(bgFgKey)) {
      this.add.image(0, ERA_1968.height, bgFgKey)
        .setOrigin(0, 1)
        .setDisplaySize(ERA_1968.width, 140)
        .setDepth(430);
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
    if (action.type === 'puzzle') {
      this.controls.setEnabled(false);
      this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
      this.scene.launch('RosePuzzleScene', {
        run: this.run,
        save: this.save,
        onComplete: () => {
          this.scene.resume();
          this.controls.setEnabled(true);
          this.worldFactory.refresh(this.objects, this.worldState());
          this.registry.set('nativeState', 'era1968');
          this.ui.showToast('Botol mawar abadi disimpan.', 3000);
        },
      });
      this.scene.pause();
      return;
    }

    if (action.type === 'challenge') {
      this.controls.setEnabled(false);
      this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
      this.scene.launch('SignalTuneScene', {
        run: this.run,
        save: this.save,
        onComplete: () => {
          this.scene.resume();
          this.controls.setEnabled(true);
          this.worldFactory.refresh(this.objects, this.worldState());
          this.registry.set('nativeState', 'era1968');
        },
      });
      this.scene.pause();
      return;
    }

    if (action.type === 'lore') {
      if (action.id === 'diary') this.openDiary();
      else this.openLore(action.id);
      return;
    }

    if (action.type === 'dialog') {
      if (!this.run.diaryRead) {
        const resumeX = 820;
        this.player.arcadeBody.reset(resumeX, ERA_1968.groundY);
        this.lastSavedX = resumeX;
        this.save.saveCycle('1968', this.run, resumeX);
        this.ui.showToast('Baca seluruh buku harian Arthur sebelum menemuinya.');
        return;
      }
      this.controls.setEnabled(false);
      this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
      this.scene.launch('DialogueScene', this.dialoguePayload(action.node, (res?: { type: string; to?: string }) => {
        if (res?.type === 'vortex' || res?.to === '1999') {
          this.scene.start('VortexScene', { to: '1999', run: this.run });
        } else {
          this.scene.resume();
          this.controls.setEnabled(true);
          this.registry.set('nativeState', 'era1968');
        }
      }));
      this.scene.pause();
    }
  }

  /** Payload DialogueScene lengkap dengan jangkar balon komik era ini. */
  private dialoguePayload(
    nodeId: string,
    onComplete: DialogueSceneData['onComplete'],
  ): DialogueSceneData {
    const arthur = this.objects.find(object => object.definition.id === 'arthur');
    const who: CharacterId = this.run.routeB1 === 'B' ? 'dewasa' : 'buron';
    const rig = new EraSpeakerRig(this.cameras.main, this.player, arthur?.visual, who);
    return {
      nodeId,
      run: this.run,
      speakerAnchor: (speaker: CharacterId) => rig.anchor(speaker),
      setSpeakerExpression: (speaker: CharacterId, expr: Expression) => rig.setExpression(speaker, expr),
      speakerVisual: speaker => rig.visual(speaker),
      resetSpeakers: () => rig.reset(),
      onComplete,
    };
  }

  private validSpawnX(savedX?: number): number {
    const x = Number.isFinite(savedX) ? Number(savedX) : ERA_1968.spawn.x;
    return Phaser.Math.Clamp(x, ERA_1968.spawn.x, ERA_1968.width - 40);
  }

  private openEntryDialogue(): void {
    const isMilitaryLab = this.run.routeB1 === 'B';
    this.arrivalActive = true;
    this.registry.set('nativeState', 'arrival1968');
    this.controls.setEnabled(false);
    this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
    this.ui.setModal(true);
    this.ui.cameras.main.setVisible(false);
    playArrivalSequence(this, {
      caption: era1968Title(this.run.routeB1),
      duration: 4600,
      startZoom: isMilitaryLab ? 2.18 : 3.25,
      startFocusX: isMilitaryLab ? 320 : 880,
      endFocusX: 520,
      groundY: ERA_1968.groundY,
      backdrop: isMilitaryLab ? 'lab-military' : 'bunker-underground',
      backdropFrames: isMilitaryLab ? FIGMA_1968_LAB_FRAMES : FIGMA_1968_BUNKER_FRAMES,
      showChrome: isMilitaryLab,
      onComplete: () => this.launchEntryDialogue(),
    });
  }

  private launchEntryDialogue(): void {
    const isMilitaryLab = this.run.routeB1 === 'B';
    this.arrivalActive = false;
    this.cameras.main.startFollow(this.player, true, 0.075, 0.12);
    this.cameras.main.setDeadzone(250, 150);
    this.createEntryDialogueBackdrop();

    const payload = this.dialoguePayload(
      isMilitaryLab ? 'lab_intro' : 'bunker_intro',
      () => {
        this.destroyEntryDialogueBackdrop();
        this.ui.cameras.main.setVisible(true);
        this.ui.setModal(false);
        this.scene.resume();
        this.controls.setEnabled(true);
        this.registry.set('nativeState', 'era1968');
      },
    );
    payload.cinematicSpeaker = true;
    payload.speakerAnchor = speaker => speaker === 'elena'
      ? { x: VIEW_WIDTH / 2, headY: 120 }
      : null;
    payload.speakerVisual = speaker => speaker === 'elena' ? this.entryElena ?? null : null;
    payload.setSpeakerExpression = (who: CharacterId, expr: Expression) => {
      const arthur = this.objects.find(object => object.definition.id === 'arthur');
      const rig = new EraSpeakerRig(this.cameras.main, this.player, arthur?.visual, 'dewasa');
      rig.setExpression(who, expr);
      if ((who === 'elena' || (who === 'narrator' && isMilitaryLab)) && this.entryElena) {
        const key = (expr === 'sad' || expr === 'shock') && this.textures.exists('elena-dialog-sad')
          ? 'elena-dialog-sad'
          : 'elena-dialog';
        if (this.textures.exists(key)) this.entryElena.setTexture(key);
      }
    };
    this.scene.launch('DialogueScene', payload);
    this.scene.pause();
  }

  /** Komposisi frame Figma 72:128 untuk dialog pembuka bunker & laboratorium 1968. */
  private createEntryDialogueBackdrop(): void {
    this.destroyEntryDialogueBackdrop();
    const isMilitaryLab = this.run.routeB1 === 'B';
    const requestedBgKey = isMilitaryLab ? 'lab-military' : 'bunker-underground';
    const bgKey = this.textures.exists(requestedBgKey) ? requestedBgKey : undefined;
    const backgroundFrame = isMilitaryLab
      ? FIGMA_1968_LAB_FRAMES[FIGMA_1968_LAB_FRAMES.length - 1]
      : FIGMA_1968_BUNKER_FRAMES[FIGMA_1968_BUNKER_FRAMES.length - 1];

    if (bgKey && backgroundFrame) {
      const background = this.add.image(backgroundFrame.x, backgroundFrame.y, bgKey)
        .setOrigin(0)
        .setDisplaySize(backgroundFrame.width, backgroundFrame.height)
        .setScrollFactor(0)
        .setDepth(2998);
      this.entryCinematicObjects.push(background);
    }

    const shade = this.add.rectangle(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      VIEW_WIDTH,
      VIEW_HEIGHT,
      0x000000,
      isMilitaryLab ? 0.34 : 0.18,
    ).setScrollFactor(0).setDepth(2999);
    this.entryCinematicObjects.push(shade);

    const elenaKey = this.textures.exists('elena-dialog') ? 'elena-dialog' : 'elena-dialog-sad';
    if (this.textures.exists(elenaKey)) {
      this.entryElena = this.add.image(FIGMA_1968_ELENA.x, FIGMA_1968_ELENA.y, elenaKey)
        .setOrigin(0)
        .setDisplaySize(FIGMA_1968_ELENA.width, FIGMA_1968_ELENA.height)
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

  private openDiary(): void {
    this.controls.setEnabled(false);
    this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
    const resume = () => {
      this.scene.resume();
      this.controls.setEnabled(true);
      this.registry.set('nativeState', 'era1968');
    };
    this.scene.launch('DiaryScene', {
      run: this.run,
      onComplete: () => {
        this.save.saveCycle('1968', this.run, this.validSpawnX(this.player.x));
        this.worldFactory.refresh(this.objects, this.worldState());
        this.ui.showToast('Seluruh halaman buku harian telah dibaca.');
        resume();
      },
      onCancel: resume,
    });
    this.scene.pause();
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
      this.registry.set('nativeState', 'era1968');
      if (discovery.completedNow) {
        this.soundManager?.playChime();
        this.ui.showToast(LORE_COMPLETION_TEXT, 4200);
      }
    }));
    this.scene.pause();
  }

  private playFootstep(): void {
    this.soundManager?.playFootstep('metal', this.player.x);
  }

  private shutdown(): void {
    this.destroyEntryDialogueBackdrop();
    if (this.player?.active) {
      this.save.saveCycle('1968', this.run, this.validSpawnX(this.player.x));
    }
    this.scene.stop('RosePuzzleScene');
    this.scene.stop('SignalTuneScene');
    this.scene.stop('DiaryScene');
    this.scene.stop('DialogueScene');
    this.scene.stop('UIScene');
    this.controls?.destroy();
    this.surfaces?.destroy();
    this.worldFactory?.destroy(this.objects);
    this.objects = [];
    this.player?.destroy();
    this.echo?.destroy();
  }
}
