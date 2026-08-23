import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { CharacterId, Expression, StoryChoiceOption, StoryOp, StorySayOp } from '../narrative/storyScript';
import { STORY_NODES } from '../narrative/storyScript';
import type { RunState, SaveSystem } from '../systems/SaveSystem';

export type DialogueSceneData = {
  nodeId: string;
  run: RunState;
  onComplete: (nextAction?: { type: string; [key: string]: unknown }) => void;
};

type LogEntry = {
  who: string;
  text: string;
};

const CHARACTER_NAMES: Record<CharacterId, string> = {
  narrator: 'NARATOR',
  elena: 'ELENA',
  muda: 'ARTHUR (1944)',
  dewasa: 'ARTHUR (1968)',
  buron: 'ARTHUR BURON (1968)',
  tua: 'ARTHUR (1999)',
};

const EXPR_FRAMES: Record<Expression, number> = {
  neutral: 0,
  smile: 1,
  sad: 2,
  shock: 3,
  angry: 4,
  mad: 5,
  warm: 6,
  happy: 7,
  closed: 0,
};

export class DialogueScene extends Phaser.Scene {
  private dataPayload!: DialogueSceneData;
  private save!: SaveSystem;
  private ops: StoryOp[] = [];
  private opIndex = 0;
  private currentSay: StorySayOp | null = null;
  private currentChoices: StoryChoiceOption[] | null = null;
  private selectedChoice = 0;

  private displayedText = '';
  private fullText = '';
  private charProgress = 0;
  private typingComplete = false;
  private fastForward = false;

  private boxContainer?: Phaser.GameObjects.Container;
  private nameText?: Phaser.GameObjects.Text;
  private dialogText?: Phaser.GameObjects.Text;
  private promptIndicator?: Phaser.GameObjects.Text;
  private choiceContainer?: Phaser.GameObjects.Container;
  private choiceButtons: Phaser.GameObjects.Container[] = [];

  private elenaAvatar?: Phaser.GameObjects.Sprite;
  private arthurAvatar?: Phaser.GameObjects.Sprite;

  private backlogModal?: Phaser.GameObjects.Container;
  private backlogOpen = false;
  private static backlogHistory: LogEntry[] = [];

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('DialogueScene');
  }

  create(data: DialogueSceneData): void {
    this.dataPayload = data;
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.registry.set('nativeState', 'dialogue');

    this.createUI();
    this.createInputHandlers();

    this.startNode(data.nodeId);
  }

  update(_time: number, delta: number): void {
    if (this.backlogOpen) return;

    if (this.keys) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.tab) || Phaser.Input.Keyboard.JustDown(this.keys.b)) {
        this.toggleBacklog();
        return;
      }
      this.fastForward = Boolean(this.keys.ctrl.isDown || this.keys.f.isDown);
    }

    if (this.currentSay && !this.typingComplete) {
      const options = (this.registry.get('options') as Record<string, unknown> | undefined) || {};
      const spdMultiplier = typeof options.textSpd === 'number' ? options.textSpd : 1.0;
      const speed = (this.fastForward ? 160 : 42) * spdMultiplier;

      this.charProgress += (speed * delta) / 1000;
      const charsToShow = Math.min(this.fullText.length, Math.floor(this.charProgress));
      this.displayedText = this.fullText.substring(0, charsToShow);
      this.dialogText?.setText(this.displayedText);

      if (charsToShow >= this.fullText.length) {
        this.typingComplete = true;
        this.promptIndicator?.setVisible(true);
      }
    }

    if (this.currentChoices && this.keys) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
        this.moveChoiceSelection(-1);
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
        this.moveChoiceSelection(1);
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.one)) {
        this.selectChoice(0);
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.two) && this.currentChoices.length > 1) {
        this.selectChoice(1);
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.three) && this.currentChoices.length > 2) {
        this.selectChoice(2);
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.space)) {
        this.selectChoice(this.selectedChoice);
      }
    } else if (this.currentSay && this.keys) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.space)) {
        this.advanceDialogue();
      }
    }
  }

  private startNode(nodeId: string): void {
    const nodeDef = STORY_NODES[nodeId];
    if (!nodeDef) {
      this.finish({ type: 'end' });
      return;
    }

    this.save.data.seen[nodeId] = 1;
    this.ops = typeof nodeDef === 'function' ? nodeDef(this.dataPayload.run) : nodeDef;
    this.opIndex = 0;
    this.step();
  }

  private step(): void {
    while (this.opIndex < this.ops.length) {
      const op = this.ops[this.opIndex++];
      if (op.t === 'say') {
        this.showSay(op);
        return;
      }
      if (op.t === 'choice') {
        this.showChoice(op.opts);
        return;
      }
      if (op.t === 'goto') {
        this.startNode(op.id);
        return;
      }
      if (op.t === 'walk') {
        this.finish({ type: 'walk', era: op.era });
        return;
      }
      if (op.t === 'item') {
        this.dataPayload.run.inventory[op.id] = 1;
        this.save.saveCycle(this.save.data.game?.era ?? '1944', this.dataPayload.run);
        continue;
      }
      if (op.t === 'fx') {
        if (op.kind === 'boom' && !this.registry.get('reduceMotion')) {
          this.cameras.main.shake(400, 0.015);
        }
        continue;
      }
      if (op.t === 'vortex') {
        this.finish({ type: 'vortex', to: op.to });
        return;
      }
      if (op.t === 'ending') {
        this.finish({ type: 'ending', kind: op.kind });
        return;
      }
    }
    this.finish({ type: 'complete' });
  }

  private showSay(op: StorySayOp): void {
    this.currentSay = op;
    this.currentChoices = null;
    this.fullText = op.text;
    this.displayedText = '';
    this.charProgress = 0;
    this.typingComplete = false;

    this.choiceContainer?.setVisible(false);
    this.boxContainer?.setVisible(true);
    this.promptIndicator?.setVisible(false);

    const name = CHARACTER_NAMES[op.who] || op.who.toUpperCase();
    this.nameText?.setText(name);

    this.updateAvatars(op.who, op.expr || 'neutral');

    DialogueScene.backlogHistory.push({ who: name, text: op.text });
    if (DialogueScene.backlogHistory.length > 30) {
      DialogueScene.backlogHistory.shift();
    }
  }

  private updateAvatars(who: CharacterId, expr: Expression): void {
    const frame = EXPR_FRAMES[expr] ?? 0;

    if (who === 'elena') {
      this.elenaAvatar?.setVisible(true).setFrame(frame).setAlpha(1);
      this.arthurAvatar?.setAlpha(0.5);
    } else if (who === 'narrator') {
      this.elenaAvatar?.setVisible(false);
      this.arthurAvatar?.setVisible(false);
    } else {
      let texture = 'arthur-muda';
      if (who === 'dewasa') texture = 'arthur-dewasa';
      if (who === 'buron') texture = 'arthur-buron';
      if (who === 'tua') texture = 'arthur-tua';

      this.arthurAvatar?.setTexture(texture).setVisible(true).setFrame(frame).setAlpha(1);
      this.elenaAvatar?.setAlpha(0.5);
    }
  }

  private showChoice(opts: StoryChoiceOption[]): void {
    this.currentSay = null;
    this.currentChoices = opts;
    this.selectedChoice = 0;

    this.boxContainer?.setVisible(false);
    this.choiceContainer?.removeAll(true);
    this.choiceButtons = [];

    const totalHeight = opts.length * 56;
    const startY = GAME_HEIGHT - 60 - totalHeight;

    opts.forEach((opt, idx) => {
      const btn = this.add.container(GAME_WIDTH / 2, startY + idx * 56);
      const bg = this.add.rectangle(0, 0, 680, 48, idx === 0 ? 0xd3a848 : 0x181410, 0.95)
        .setStrokeStyle(2, 0x6a4930)
        .setInteractive({ useHandCursor: true });

      const prefix = opt.tag ? `[${opt.tag}] ` : '';
      const text = this.add.text(-320, 0, `${idx + 1}. ${prefix}${opt.label}`, {
        color: idx === 0 ? '#100c08' : '#f5f0e8',
        fontFamily: 'Patrick Hand, sans-serif',
        fontSize: '18px',
        wordWrap: { width: 630 },
      }).setOrigin(0, 0.5);

      bg.on('pointerover', () => {
        this.selectedChoice = idx;
        this.refreshChoiceStyles();
      });
      bg.on('pointerup', () => this.selectChoice(idx));

      btn.add([bg, text]);
      this.choiceButtons.push(btn);
      this.choiceContainer?.add(btn);
    });

    this.choiceContainer?.setVisible(true);
  }

  private moveChoiceSelection(delta: number): void {
    if (!this.currentChoices) return;
    this.selectedChoice = Phaser.Math.Wrap(this.selectedChoice + delta, 0, this.currentChoices.length);
    this.refreshChoiceStyles();
  }

  private refreshChoiceStyles(): void {
    this.choiceButtons.forEach((btn, idx) => {
      const bg = btn.getAt(0) as Phaser.GameObjects.Rectangle;
      const txt = btn.getAt(1) as Phaser.GameObjects.Text;
      const isSel = idx === this.selectedChoice;
      bg.setFillStyle(isSel ? 0xd3a848 : 0x181410, 0.95);
      txt.setColor(isSel ? '#100c08' : '#f5f0e8');
    });
  }

  private selectChoice(idx: number): void {
    if (!this.currentChoices || !this.currentChoices[idx]) return;
    const opt = this.currentChoices[idx];
    if (opt.fx) {
      opt.fx(this.dataPayload.run);
    }
    this.save.data.chosen[opt.label] = 1;
    this.save.saveCycle(this.save.data.game?.era ?? '1944', this.dataPayload.run);

    this.currentChoices = null;
    this.startNode(opt.goto);
  }

  private advanceDialogue(): void {
    if (!this.typingComplete) {
      this.typingComplete = true;
      this.displayedText = this.fullText;
      this.dialogText?.setText(this.displayedText);
      this.promptIndicator?.setVisible(true);
      return;
    }
    this.currentSay = null;
    this.step();
  }

  private createUI(): void {
    this.boxContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 90);
    const boxBg = this.add.rectangle(0, 0, 840, 130, 0x0c0a08, 0.92)
      .setStrokeStyle(3, 0x6a4930)
      .setInteractive()
      .on('pointerup', () => this.advanceDialogue());

    this.nameText = this.add.text(-400, -52, '', {
      color: '#f6d57b',
      fontFamily: 'Cinzel, serif',
      fontSize: '17px',
      fontStyle: 'bold',
    });

    this.dialogText = this.add.text(-400, -22, '', {
      color: '#fffbf0',
      fontFamily: 'Patrick Hand, sans-serif',
      fontSize: '20px',
      wordWrap: { width: 800 },
    });

    this.promptIndicator = this.add.text(390, 42, '▼', {
      color: '#f6d57b',
      fontSize: '18px',
    }).setOrigin(0.5).setVisible(false);

    this.boxContainer.add([boxBg, this.nameText, this.dialogText, this.promptIndicator]);

    this.choiceContainer = this.add.container(0, 0);

    if (this.textures.exists('elena')) {
      this.elenaAvatar = this.add.sprite(90, GAME_HEIGHT - 210, 'elena', 0)
        .setScale(0.85).setOrigin(0.5, 0.5).setVisible(false);
    }
    if (this.textures.exists('arthur-muda')) {
      this.arthurAvatar = this.add.sprite(GAME_WIDTH - 90, GAME_HEIGHT - 210, 'arthur-muda', 0)
        .setScale(0.85).setOrigin(0.5, 0.5).setFlipX(true).setVisible(false);
    }
  }

  private createInputHandlers(): void {
    this.keys = this.input.keyboard?.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      ctrl: Phaser.Input.Keyboard.KeyCodes.CTRL,
      f: Phaser.Input.Keyboard.KeyCodes.F,
      tab: Phaser.Input.Keyboard.KeyCodes.TAB,
      b: Phaser.Input.Keyboard.KeyCodes.B,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private toggleBacklog(): void {
    this.backlogOpen = !this.backlogOpen;
    if (this.backlogOpen) {
      this.showBacklogModal();
    } else {
      this.backlogModal?.destroy();
      this.backlogModal = undefined;
    }
  }

  private showBacklogModal(): void {
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050403, 0.9);
    const paper = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 800, 460, 0x14100c, 0.98).setStrokeStyle(2, 0x8a6340);
    const title = this.add.text(GAME_WIDTH / 2, 65, 'RIWAYAT PERCAKAPAN (TAB / B / ESC UNTUK TUTUP)', {
      color: '#f6d57b', fontFamily: 'Cinzel, serif', fontSize: '16px',
    }).setOrigin(0.5);

    const logItems = DialogueScene.backlogHistory.slice(-10);
    const logTexts = logItems.map((entry, idx) => {
      return this.add.text(GAME_WIDTH / 2 - 370, 100 + idx * 36, `${entry.who}: ${entry.text}`, {
        color: '#f5f0e8', fontFamily: 'Patrick Hand, sans-serif', fontSize: '15px', wordWrap: { width: 740 },
      });
    });

    const closeBtn = this.add.text(GAME_WIDTH / 2, 475, 'TUTUP', {
      backgroundColor: '#94342e', color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '13px', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive().on('pointerup', () => this.toggleBacklog());

    this.backlogModal = this.add.container(0, 0, [bg, paper, title, ...logTexts, closeBtn]);
  }

  private finish(action?: { type: string; [key: string]: unknown }): void {
    this.scene.stop();
    this.dataPayload.onComplete(action);
  }
}
