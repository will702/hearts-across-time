import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { Player } from '../entities/Player';
import { LORE_COMPLETION_TEXT, isLoreId, recordLoreInspection } from '../narrative/lore';
import type { CharacterId, Expression } from '../narrative/storyScript';
import { InputSystem } from '../systems/InputSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LoopEchoTrail } from '../systems/LoopEchoTrail';
import { shouldPersistCycleOnShutdown } from '../systems/replayRules';
import type { EndingKey, RunState, SaveSystem } from '../systems/SaveSystem';
import { SurfaceSystem } from '../systems/SurfaceSystem';
import { ERA_1999 } from '../world/era1999';
import { WorldFactory } from '../world/WorldFactory';
import type { WorldObject } from '../world/WorldObject';
import type { WorldAction, WorldState } from '../world/worldTypes';
import type { DialogueSceneData } from './DialogueScene';
import { EraSpeakerRig } from './eraSpeakerRig';
import type { UIScene } from './UIScene';
import { playArrivalSequence } from './playArrivalSequence';

type EraData = { run: RunState; playerX?: number; intro?: boolean };

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const FIGMA_FRAME_SCALE = VIEW_WIDTH / 3233;
const FIGMA_FRAME_TOP = (VIEW_HEIGHT - 2102 * FIGMA_FRAME_SCALE) / 2;
const figmaFrame = (x: number, y: number, width: number, height: number) => ({
  x: x * FIGMA_FRAME_SCALE,
  y: y * FIGMA_FRAME_SCALE + FIGMA_FRAME_TOP,
  width: width * FIGMA_FRAME_SCALE,
  height: height * FIGMA_FRAME_SCALE,
});
const FIGMA_1999_ELENA = figmaFrame(-557, 229, 4348, 2492);
const AUTOSAVE_MS = 750;

export class Era1999Scene extends Phaser.Scene {
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
  private endingCommitted = false;
  private echo?: LoopEchoTrail;
  private arrivalActive = false;
  private entryCinematicObjects: Phaser.GameObjects.GameObject[] = [];
  private entryElena?: Phaser.GameObjects.Image;

  constructor() {
    super('Era1999Scene');
  }

  create(data: EraData): void {
    this.run = data.run;
    this.endingCommitted = false;
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'era1999');
    this.registry.set('runLoop', this.run.loop);

    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.soundManager?.setAmbience('1999');

    this.touchControls = this.sys.game.device.input.touch || new URLSearchParams(location.search).get('touch') === '1';

    this.physics.world.setBounds(0, 0, ERA_1999.width, ERA_1999.height);
    this.cameras.main.setBounds(0, 0, ERA_1999.width, ERA_1999.height);
    this.createWorldLayers();

    this.surfaces = new SurfaceSystem(this);
    const spawnX = this.validSpawnX(data.playerX);

    this.player = new Player(this, spawnX, ERA_1999.spawn.y, {
      loop: this.run.loop,
      reduceMotion: Boolean(this.registry.get('reduceMotion')),
      surfaceAt: () => 'metal',
      onStep: () => this.playFootstep(),
    });
    this.echo = new LoopEchoTrail(this, this.run, '1999', ERA_1999.groundY);

    this.worldFactory = new WorldFactory(this);
    this.objects = this.worldFactory.createAll(ERA_1999.objects, this.worldState());
    this.surfaces.load(ERA_1999, this.player, this.objects);
    this.interactions = new InteractionSystem(this.objects);
    this.controls = new InputSystem(this);

    this.cameras.main.startFollow(this.player, true, 0.075, 0.12);
    this.cameras.main.setDeadzone(250, 150);

    this.scene.launch('UIScene', { input: this.controls, eraTitle: 'BABAK 3 — RUANG OBSERVASI KAPSUL, 1999', run: this.run });
    this.ui = this.scene.get('UIScene') as UIScene;
    this.lastSavedX = spawnX;
    this.save.saveCycle('1999', this.run, spawnX);

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
      this.save.saveCycle('1999', this.run, this.player.x);
    }
  }

  snapshot(): Record<string, unknown> {
    const body = this.player.arcadeBody;
    const active = this.interactions.active;
    return {
      era: '1999',
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
        gemAligned: this.run.gemAligned,
        photoRepaired: this.run.photoRepaired,
        challenge1999: this.run.challenges['1999'],
      },
      save: {
        saveVersion: this.save.data.saveVersion,
        era: this.save.data.game?.era ?? null,
        playerX: this.save.data.game?.playerX ?? null,
      },
    };
  }

  private createWorldLayers(): void {
    this.add.rectangle(ERA_1999.width / 2, ERA_1999.height / 2, ERA_1999.width, ERA_1999.height, 0x091424).setDepth(-30);

    if (this.textures.exists('bg1999-far')) {
      this.add.image(0, 0, 'bg1999-far').setOrigin(0).setScale(0.75).setScrollFactor(0.14).setDepth(-25);
    }
    if (this.textures.exists('bg1999-mid')) {
      this.add.image(0, ERA_1999.groundY, 'bg1999-mid').setOrigin(0, 1).setScrollFactor(0.45).setDepth(-20);
    }

    this.createAnimatedProp('prop-consoleWave1999', 380, 444, 82, 3.5, 438);
    this.createAnimatedProp('prop-frost1999', 720, 444, 88, 2, 439);

    if (this.textures.exists('bg1999-fg')) {
      this.add.image(0, ERA_1999.groundY - 14, 'bg1999-fg').setOrigin(0).setDisplaySize(1120, 152).setDepth(430);
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
          this.ui.showToast('Permata air disimpan.', 3000);
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
          this.ui.showToast('Foto Elena dan Arthur disimpan.', 3000);
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

    if (action.type === 'lore') {
      this.openLore(action.id);
      return;
    }

    if (action.type === 'dialog') {
      this.controls.setEnabled(false);
      this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
      this.scene.launch('DialogueScene', this.dialoguePayload(action.node, (res?: { type: string; kind?: EndingKey }) => {
        if (res?.type === 'ending' && res.kind) {
          this.endingCommitted = true;
          this.save.clearCycle();
          this.scene.start('PuzzleAwardScene', { key: res.kind, run: this.run });
        } else {
          this.scene.resume();
          this.controls.setEnabled(true);
          this.registry.set('nativeState', 'era1999');
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
    const rig = new EraSpeakerRig(this.cameras.main, this.player, arthur?.visual, 'tua');
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

  private validSpawnX(savedX?: number): number {
    const x = Number.isFinite(savedX) ? Number(savedX) : ERA_1999.spawn.x;
    return Phaser.Math.Clamp(x, ERA_1999.spawn.x, ERA_1999.width - 40);
  }

  private openEntryDialogue(): void {
    this.arrivalActive = true;
    this.registry.set('nativeState', 'arrival1999');
    this.controls.setEnabled(false);
    this.player.arcadeBody.setAccelerationX(0).setVelocityX(0);
    this.ui.setModal(true);
    playArrivalSequence(this, {
      caption: '1999 — LABORATORIUM KRIOGENIK TERAKHIR',
      duration: 5200,
      startZoom: 2.24,
      startFocusX: 640,
      endFocusX: 500,
      groundY: ERA_1999.groundY,
      backdrop: 'lab-final',
      onComplete: () => this.launchEntryDialogue(),
    });
  }

  private launchEntryDialogue(): void {
    this.arrivalActive = false;
    this.cameras.main.startFollow(this.player, true, 0.075, 0.12);
    this.cameras.main.setDeadzone(250, 150);
    this.createEntryDialogueBackdrop();

    const payload = this.dialoguePayload('final_lab_intro', () => {
      this.destroyEntryDialogueBackdrop();
      this.ui.setModal(false);
      this.scene.resume();
      this.controls.setEnabled(true);
      this.registry.set('nativeState', 'era1999');
    });
    payload.cinematicSpeaker = true;
    payload.speakerAnchor = speaker => speaker === 'elena'
      ? { x: VIEW_WIDTH / 2, headY: 120 }
      : null;
    payload.speakerVisual = speaker => speaker === 'elena' ? this.entryElena ?? null : null;
    payload.setSpeakerExpression = (who: CharacterId, expr: Expression) => {
      const arthur = this.objects.find(object => object.definition.id === 'arthur');
      const rig = new EraSpeakerRig(this.cameras.main, this.player, arthur?.visual, 'tua');
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

  /** Komposisi frame Figma 72:128 untuk dialog pembuka laboratorium 1999. */
  private createEntryDialogueBackdrop(): void {
    this.destroyEntryDialogueBackdrop();
    const bgKey = this.textures.exists('lab-final')
      ? 'lab-final'
      : this.textures.exists('bg1999-mid')
        ? 'bg1999-mid'
        : undefined;

    if (bgKey) {
      const background = this.add.image(0, 0, bgKey)
        .setOrigin(0)
        .setDisplaySize(VIEW_WIDTH, VIEW_HEIGHT)
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
      0.34,
    ).setScrollFactor(0).setDepth(2999);
    this.entryCinematicObjects.push(shade);

    const elenaKey = this.textures.exists('elena-dialog-sad') ? 'elena-dialog-sad' : 'elena-dialog';
    if (this.textures.exists(elenaKey)) {
      this.entryElena = this.add.image(FIGMA_1999_ELENA.x, FIGMA_1999_ELENA.y, elenaKey)
        .setOrigin(0)
        .setDisplaySize(FIGMA_1999_ELENA.width, FIGMA_1999_ELENA.height)
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
      this.registry.set('nativeState', 'era1999');
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
    if (shouldPersistCycleOnShutdown(this.endingCommitted) && this.player?.active) {
      this.save.saveCycle('1999', this.run, this.validSpawnX(this.player.x));
    }
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
    this.echo?.destroy();
  }
}
