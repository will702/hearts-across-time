import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { CharacterId, Expression, StoryChoiceOption, StoryOp, StorySayOp } from '../narrative/storyScript';
import { STORY_NODES } from '../narrative/storyScript';
import type { GameOptions } from '../options';
import { shouldAutoAdvanceSeenDialogue } from '../systems/replayRules';
import type { RunState, SaveSystem } from '../systems/SaveSystem';
import { ComicBubble, type SpeechInfo } from '../ui/ComicBubble';
import { addPaperPanel, backOut, measureText, wrapLines } from '../ui/paper';
import { CSS, FONT, INK, RED } from '../ui/theme';

export type SpeakerAnchorResolver = (who: CharacterId) => { x: number; headY: number } | null;
export type SpeakerExpressionSetter = (who: CharacterId, expr: Expression) => void;
export type SpeakerVisualAccessor = (who: CharacterId) => Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | null;

export type DialogueSceneData = {
  nodeId: string;
  run: RunState;
  speakerAnchor?: SpeakerAnchorResolver;
  setSpeakerExpression?: SpeakerExpressionSetter;
  speakerVisual?: SpeakerVisualAccessor;
  resetSpeakers?: () => void;
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

const CHOICE_PANEL_W = 560;
const CHOICE_ROW_H = 58;

export class DialogueScene extends Phaser.Scene {
  private dataPayload!: DialogueSceneData;
  private save!: SaveSystem;
  private soundManager?: SoundManager;
  private ops: StoryOp[] = [];
  private opIndex = 0;
  private currentSay: StorySayOp | null = null;
  private currentChoices: StoryChoiceOption[] | null = null;
  private selectedChoice = 0;

  private typingProgress = 0;
  private lastBeepChar = 0;
  private typingComplete = false;
  private fastForward = false;
  private touchFastForward = false;
  private nodeWasSeen = false;
  private fastForwardElapsed = 0;
  private appliedTextScale = 0;
  private lineStart = 0;
  private bounceBaseY = 0;
  private bounceVisual?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | null;

  private bubble!: ComicBubble;
  private choiceRoot?: Phaser.GameObjects.Container;
  private choiceMarker?: Phaser.GameObjects.Graphics;
  private choiceButtons: { zone: Phaser.GameObjects.Zone; label: Phaser.GameObjects.Text; bullet?: Phaser.GameObjects.Text }[] = [];
  private enterHint?: Phaser.GameObjects.Text;
  private fastForwardButton?: Phaser.GameObjects.Text;
  private advanceZone?: Phaser.GameObjects.Zone;

  // Living atmosphere character portraits (legacy polaroid/journal style)
  private portraitLeft?: {
    container: Phaser.GameObjects.Container;
    image: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    baseX: number;
    baseY: number;
  };
  private portraitRight?: {
    container: Phaser.GameObjects.Container;
    image: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    baseX: number;
    baseY: number;
  };

  private backlogModal?: Phaser.GameObjects.Container;
  private backlogOpen = false;
  private backlogOffset = 0;
  private static backlogHistory: LogEntry[] = [];

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('DialogueScene');
  }

  create(data: DialogueSceneData): void {
    this.dataPayload = data;
    this.touchFastForward = false;
    this.fastForward = false;
    this.fastForwardElapsed = 0;
    this.save = this.registry.get('saveSystem') as SaveSystem;
    this.soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    this.registry.set('nativeState', 'dialogue');

    this.bubble = new ComicBubble(this, 10);
    this.createUI();
    this.createInputHandlers();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.startNode(data.nodeId);
  }

  update(time: number, delta: number): void {
    const scale = (this.registry.get('options') as GameOptions | undefined)?.textScale ?? 1;
    this.applyTextScale(scale);
    this.updatePortraitBob(time);
    if (this.keys) {
      const backlogKey = Phaser.Input.Keyboard.JustDown(this.keys.tab)
        || Phaser.Input.Keyboard.JustDown(this.keys.b)
        || (this.backlogOpen && Phaser.Input.Keyboard.JustDown(this.keys.esc));
      if (backlogKey) {
        this.toggleBacklog();
        return;
      }
      if (this.backlogOpen) {
        if (Phaser.Input.Keyboard.JustDown(this.keys.up)) this.scrollBacklog(-1);
        else if (Phaser.Input.Keyboard.JustDown(this.keys.down)) this.scrollBacklog(1);
        return;
      }
      this.fastForward = this.touchFastForward || this.keys.ctrl.isDown || this.keys.f.isDown;
    } else {
      this.fastForward = this.touchFastForward;
    }
    if (this.backlogOpen) return;

    if (this.currentSay && shouldAutoAdvanceSeenDialogue(this.nodeWasSeen, this.fastForward)) {
      if (!this.typingComplete) this.revealCurrentLine();
      this.fastForwardElapsed += delta;
      if (this.fastForwardElapsed >= 70) {
        this.fastForwardElapsed = 0;
        this.advanceDialogue();
      }
      return;
    }
    this.fastForwardElapsed = 0;

    if (this.currentSay && !this.typingComplete) {
      const spdMultiplier = (this.registry.get('options') as GameOptions | undefined)?.textSpd ?? 1;
      const speed = (this.fastForward ? 160 : 42) * spdMultiplier;

      this.typingProgress += (speed * delta) / 1000;
      const charsToShow = Math.min(this.currentSay.text.length, Math.floor(this.typingProgress));
      this.typingComplete = this.bubble.setProgress(charsToShow / Math.max(1, this.currentSay.text.length));
      if (Math.floor(charsToShow / 3) > Math.floor(this.lastBeepChar / 3)) {
        this.soundManager?.playTypewriterBeep();
      }
      this.lastBeepChar = charsToShow;
      this.updateTalkingBounce(time);
      if (this.typingComplete) this.stopTalkingBounce();
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

    this.nodeWasSeen = Boolean(this.save.data.seen[nodeId]);
    this.save.data.seen[nodeId] = 1;
    this.save.save(this.save.data);
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
        this.notifyItemAdded(op.label);
        continue;
      }
      if (op.t === 'fx') {
        if (op.kind === 'boom') this.soundManager?.playBoom();
        if (op.kind === 'chime') this.soundManager?.playChime();
        if (op.kind === 'flash') this.soundManager?.playFlash();
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
    this.typingProgress = 0;
    this.lastBeepChar = 0;
    this.typingComplete = false;
    this.fastForwardElapsed = 0;
    this.lineStart = this.time.now;

    this.hideChoicePanel();
    this.fastForwardButton?.setVisible(this.nodeWasSeen);

    const name = CHARACTER_NAMES[op.who] || op.who.toUpperCase();
    DialogueScene.backlogHistory.push({ who: name, text: op.text });
    if (DialogueScene.backlogHistory.length > 30) {
      DialogueScene.backlogHistory.shift();
    }

    const anchor = this.dataPayload.speakerAnchor?.(op.who) ?? null;
    const speaker: SpeechInfo | null = anchor && op.who !== 'narrator'
      ? { who: op.who, x: anchor.x, headY: anchor.headY }
      : null;
    const scale = (this.registry.get('options') as GameOptions | undefined)?.textScale ?? 1;
    this.bubble.show(op.text, speaker, scale);

    this.dataPayload.setSpeakerExpression?.(op.who, op.expr || 'neutral');
    this.startTalkingBounce(op.who);
    this.updatePortraits(op.who, op.expr || 'neutral');
  }

  private showChoice(opts: StoryChoiceOption[]): void {
    this.currentSay = null;
    this.currentChoices = opts;
    this.touchFastForward = false;
    this.fastForward = false;
    this.selectedChoice = 0;
    this.soundManager?.duckMusic(0.5, 0.4);
    this.soundManager?.playSelect();

    this.bubble.hide();
    this.stopTalkingBounce();
    this.hidePortraits();
    this.fastForwardButton?.setVisible(false);
    this.buildChoicePanel(opts);
  }

  /** Panel pilihan kertas ala legacy drawChoices: spidol merah di baris aktif. */
  private buildChoicePanel(opts: StoryChoiceOption[]): void {
    this.destroyChoicePanel();

    const bw = CHOICE_PANEL_W;
    const bh = opts.length * CHOICE_ROW_H + 22;
    const bx = (GAME_WIDTH - bw) / 2;
    const by = GAME_HEIGHT - bh - 24;
    const cx = bx + bw / 2;
    const cy = by + bh / 2;

    const root = this.add.container(cx, cy).setDepth(10);
    this.choiceRoot = root;
    const panel = addPaperPanel(this, bx, by, bw, bh, { radius: 8 });
    root.add(this.shiftTo(panel, cx, cy));

    this.choiceMarker = this.add.graphics();
    root.add(this.shiftTo(this.choiceMarker, cx, cy));

    const labelFont = `15px ${FONT.UI}`;
    opts.forEach((opt, idx) => {
      const oy = by + 14 + idx * CHOICE_ROW_H;
      const labelLines = wrapLines(opt.label, labelFont, opt.tag ? bw - 64 : bw - 142).slice(0, 2);

      if (opt.tag) {
        const tagFont = `bold 11.5px ${FONT.UI}`;
        const tagW = measureText(opt.tag, tagFont) + 14;
        const chip = this.add.graphics();
        const chipColor = Phaser.Display.Color.HexStringToColor(opt.tagCol || '#556B7F').color;
        chip.fillStyle(chipColor, 1);
        chip.fillRoundedRect(bx + 26, oy + 6, tagW, 17, 4);
        chip.lineStyle(1.2, INK, 1);
        chip.strokeRoundedRect(bx + 26, oy + 6, tagW, 17, 4);
        root.add(this.shiftTo(chip, cx, cy));
        const tagText = this.add.text(bx + 26 + 7, oy + 14.5, opt.tag, {
          color: CSS.paper,
          fontFamily: FONT.UI,
          fontStyle: 'bold',
          fontSize: '11.5px',
        }).setOrigin(0, 0.5);
        root.add(this.shiftTo(tagText, cx, cy));
        const label = this.add.text(bx + 26, oy + 33, labelLines.join('\n'), {
          color: CSS.body,
          fontFamily: FONT.UI,
          fontSize: '15px',
          lineSpacing: 1,
        });
        root.add(this.shiftTo(label, cx, cy));
        this.choiceButtons.push({ zone: this.makeRowZone(bx, oy, bw, idx), label });
        return;
      }

      const bullet = this.add.text(bx + 28, oy + 26, '•', {
        color: CSS.body,
        fontFamily: FONT.UI,
        fontSize: '14.5px',
      }).setOrigin(0.5);
      root.add(this.shiftTo(bullet, cx, cy));
      const ly = labelLines.length > 1 ? 18 : 26;
      const label = this.add.text(bx + 48, oy + ly, labelLines.join('\n'), {
        color: CSS.body,
        fontFamily: FONT.UI,
        fontSize: '14.5px',
        lineSpacing: 1,
      });
      root.add(this.shiftTo(label, cx, cy));
      this.choiceButtons.push({ zone: this.makeRowZone(bx, oy, bw, idx), label, bullet });

      if (this.save.data.chosen[opt.label]) {
        const prev = this.add.text(bx + bw - 16, oy + 14, '⟲ pernah dipilih', {
          color: 'rgba(43,33,26,.55)',
          fontFamily: FONT.UI,
          fontSize: '12px',
        }).setOrigin(1, 0.5);
        root.add(this.shiftTo(prev, cx, cy));
      }
    });

    this.refreshChoiceStyles();

    // pop masuk spring di sekitar pusat panel
    root.setScale(0.6);
    const tween = this.tweens.addCounter({ from: 0, to: 1, duration: 240 });
    tween.on('update', () => {
      root.setScale(Math.max(0.001, backOut(Phaser.Math.Clamp(tween.getValue() ?? 0, 0, 1))));
    });
  }

  private makeRowZone(bx: number, oy: number, bw: number, idx: number): Phaser.GameObjects.Zone {
    const zone = this.add.zone(bx + bw / 2, oy + 26, bw - 20, 52).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      if (this.selectedChoice !== idx) {
        this.selectedChoice = idx;
        this.soundManager?.playSelect();
        this.refreshChoiceStyles();
      }
    });
    zone.on('pointerup', () => this.selectChoice(idx));
    return zone;
  }

  /** Geser objek dari koordinat layar ke offset relatif pusat panel. */
  private shiftTo(obj: Phaser.GameObjects.GameObject, cx: number, cy: number): Phaser.GameObjects.GameObject {
    const transformable = obj as unknown as { x: number; y: number };
    transformable.x -= cx;
    transformable.y -= cy;
    return obj;
  }

  private refreshChoiceStyles(): void {
    if (!this.choiceMarker || !this.currentChoices || !this.choiceRoot) return;
    const bw = CHOICE_PANEL_W;
    const baseBx = -bw / 2;
    const g = this.choiceMarker;
    g.clear();

    const opts = this.currentChoices;
    const sel = this.selectedChoice;
    const oy = -(opts.length * CHOICE_ROW_H + 22) / 2 + 14 + sel * CHOICE_ROW_H;

    // baris aktif: wash merah tipis + gores margin spidol merah (dialog.js)
    g.fillStyle(RED, 0.10);
    g.fillRoundedRect(baseBx + 8, oy, bw - 16, 52, 6);
    g.lineStyle(3, RED, 1);
    this.quadraticStroke(g, baseBx + 15, oy + 9, baseBx + 13, oy + 26, baseBx + 15, oy + 43);
    g.lineStyle(1.2, RED, 0.4);
    this.quadraticStroke(g, baseBx + 17.6, oy + 10, baseBx + 16, oy + 26, baseBx + 17.2, oy + 42);

    if (!this.enterHint) {
      this.enterHint = this.add.text(0, 0, '[ENTER]', {
        color: 'rgba(43,33,26,.6)',
        fontFamily: FONT.UI,
        fontSize: '12px',
      }).setOrigin(1, 0.5);
      this.choiceRoot.add(this.enterHint);
    }
    this.enterHint.setPosition(bw / 2 - 16, oy + 42);

    this.choiceButtons.forEach((btn, idx) => {
      const on = idx === sel;
      btn.label.setColor(on ? CSS.red : CSS.body);
      btn.label.setFontStyle(on ? 'bold' : 'normal');
      const bullet = (btn as { bullet?: Phaser.GameObjects.Text }).bullet;
      if (bullet) {
        bullet.setText(on ? '▸' : '•');
        bullet.setColor(on ? CSS.red : CSS.body);
        bullet.setFontStyle(on ? 'bold' : 'normal');
      }
    });
  }

  /** Kurva kuadratik lewat 4 segmen garis (Phaser 4 Graphics tanpa quadraticCurveTo). */
  private quadraticStroke(
    g: Phaser.GameObjects.Graphics,
    x0: number, y0: number,
    cx: number, cy: number,
    x1: number, y1: number,
  ): void {
    g.beginPath();
    g.moveTo(x0, y0);
    for (let i = 1; i <= 4; i++) {
      const t = i / 4;
      const mt = 1 - t;
      g.lineTo(mt * mt * x0 + 2 * mt * t * cx + t * t * x1, mt * mt * y0 + 2 * mt * t * cy + t * t * y1);
    }
    g.strokePath();
  }

  private moveChoiceSelection(delta: number): void {
    if (!this.currentChoices) return;
    this.selectedChoice = Phaser.Math.Wrap(this.selectedChoice + delta, 0, this.currentChoices.length);
    this.soundManager?.playSelect();
    this.refreshChoiceStyles();
  }

  private selectChoice(idx: number): void {
    if (!this.currentChoices || !this.currentChoices[idx]) return;
    const opt = this.currentChoices[idx];
    this.soundManager?.playConfirm();
    this.soundManager?.duckMusic(0.85, 0.3);

    if (opt.fx) {
      opt.fx(this.dataPayload.run);
    }
    this.save.data.chosen[opt.label] = 1;
    this.save.saveCycle(this.save.data.game?.era ?? '1944', this.dataPayload.run);

    this.currentChoices = null;
    this.destroyChoicePanel();
    this.startNode(opt.goto);
  }

  private advanceDialogue(): void {
    if (!this.typingComplete) {
      this.revealCurrentLine();
      return;
    }
    this.soundManager?.playPaperFlip();
    this.currentSay = null;
    this.bubble.hide();
    this.stopTalkingBounce();
    this.step();
  }

  private revealCurrentLine(): void {
    this.typingComplete = true;
    this.typingProgress = this.currentSay?.text.length ?? 0;
    this.bubble.setProgress(1);
    this.stopTalkingBounce();
  }

  /** Bounce pembicara ala legacy: e^-4.5t · sin(13t) · 3.5px. */
  private startTalkingBounce(who: CharacterId): void {
    if (this.registry.get('reduceMotion')) return;
    this.bounceVisual = this.dataPayload.speakerVisual?.(who) ?? null;
    if (!this.bounceVisual) return;
    this.bounceBaseY = this.bounceVisual.y;
  }

  private updateTalkingBounce(time: number): void {
    if (!this.bounceVisual) return;
    const t = Math.max(0, (time - this.lineStart) / 1000);
    this.bounceVisual.y = this.bounceBaseY + Math.sin(t * 13) * 3.5 * Math.exp(-4.5 * t);
  }

  private stopTalkingBounce(): void {
    if (this.bounceVisual) this.bounceVisual.y = this.bounceBaseY;
    this.bounceVisual = null;
  }

  private createUI(): void {
    const scale = (this.registry.get('options') as GameOptions | undefined)?.textScale ?? 1;
    this.appliedTextScale = scale;

    this.advanceZone = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)
      .setInteractive({ useHandCursor: false });
    this.advanceZone.on('pointerup', () => {
      if (this.currentSay && !this.backlogOpen) this.advanceDialogue();
    });

    this.portraitLeft = this.buildPortraitCard('left');
    this.portraitRight = this.buildPortraitCard('right');

    this.fastForwardButton = this.add.text(18, GAME_HEIGHT - 31, 'CEPAT', {
      backgroundColor: '#16120edd',
      color: '#f6d57b',
      fontFamily: FONT.META,
      fontSize: '9px',
      letterSpacing: 0.8,
      padding: { x: 9, y: 5 },
    }).setInteractive({ useHandCursor: true }).setVisible(false).setDepth(20);
    this.fastForwardButton.on('pointerdown', () => { this.touchFastForward = true; });
    this.fastForwardButton.on('pointerup', () => { this.touchFastForward = false; });
    this.fastForwardButton.on('pointerout', () => { this.touchFastForward = false; });
  }

  private buildPortraitCard(side: 'left' | 'right'): {
    container: Phaser.GameObjects.Container;
    image: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    baseX: number;
    baseY: number;
  } {
    const isLeft = side === 'left';
    const cardW = 146;
    const cardH = 202;
    const rot = isLeft ? -0.045 : 0.045;
    const baseX = isLeft ? 96 : GAME_WIDTH - 96;
    const baseY = GAME_HEIGHT - 120;

    const container = this.add.container(baseX, baseY).setDepth(6).setRotation(rot).setVisible(false);

    // Bayangan lembut
    const shadow = this.add.rectangle(2, 4, cardW + 4, cardH + 4, 0x060402, 0.35);

    // Kertas foto polaroid / lembar buku harian
    const paper = this.add.rectangle(0, 0, cardW, cardH, 0xfaf5ea, 0.98)
      .setStrokeStyle(1.6, 0x2b211a, 0.35);
    const innerBorder = this.add.rectangle(0, -9, cardW - 12, cardH - 34, 0x000000, 0)
      .setStrokeStyle(0.8, 0x2b211a, 0.18);

    // Selotip kertas vintage di atas
    const tape = this.add.rectangle(0, -cardH / 2 + 2, 48, 14, 0xe8dec0, 0.88)
      .setStrokeStyle(0.8, 0x2b211a, 0.22)
      .setRotation(isLeft ? -0.05 : 0.05);

    // Gambar potret karakter
    const defaultKey = isLeft ? 'portrait-elena-neutral' : 'portrait-arthur-muda-warm';
    const fallbackKey = this.textures.exists(defaultKey) ? defaultKey : 'elena-dialog';
    const image = this.add.image(0, -9, fallbackKey)
      .setDisplaySize(cardW - 16, cardH - 38);

    // Label nama di bagian bawah kartu
    const label = this.add.text(0, cardH / 2 - 15, isLeft ? 'ELENA' : 'ARTHUR', {
      color: CSS.red,
      fontFamily: FONT.META,
      fontSize: '11px',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5);

    container.add([shadow, paper, innerBorder, image, tape, label]);
    return { container, image, label, baseX, baseY };
  }

  private getPortraitKey(who: CharacterId, expr: Expression): string | null {
    if (who === 'narrator') return null;

    if (who === 'elena') {
      const preferred = `portrait-elena-${expr}`;
      if (this.textures.exists(preferred)) return preferred;
      if (expr === 'warm' || expr === 'smile' || expr === 'happy') {
        if (this.textures.exists('portrait-elena-warm')) return 'portrait-elena-warm';
      } else if (expr === 'sad') {
        if (this.textures.exists('portrait-elena-sad')) return 'portrait-elena-sad';
      } else if (expr === 'shock' || expr === 'mad') {
        if (this.textures.exists('portrait-elena-shock')) return 'portrait-elena-shock';
      } else if (expr === 'angry') {
        if (this.textures.exists('portrait-elena-angry')) return 'portrait-elena-angry';
        if (this.textures.exists('portrait-elena-shock')) return 'portrait-elena-shock';
      }
      if (this.textures.exists('portrait-elena-neutral')) return 'portrait-elena-neutral';
      if (this.textures.exists('elena-dialog')) return 'elena-dialog';
      return null;
    }

    if (who === 'muda') {
      const preferred = `portrait-arthur-muda-${expr}`;
      if (this.textures.exists(preferred)) return preferred;
      if (expr === 'shock' || expr === 'sad') {
        if (this.textures.exists('portrait-arthur-muda-shock')) return 'portrait-arthur-muda-shock';
      } else if (expr === 'warm' || expr === 'smile' || expr === 'happy') {
        if (this.textures.exists('portrait-arthur-muda-warm')) return 'portrait-arthur-muda-warm';
      }
      if (this.textures.exists('portrait-arthur-muda-neutral')) return 'portrait-arthur-muda-neutral';
      if (this.textures.exists('portrait-arthur-muda-warm')) return 'portrait-arthur-muda-warm';
      return null;
    }

    if (who === 'dewasa') {
      const preferred = `portrait-arthur-dewasa-${expr}`;
      if (this.textures.exists(preferred)) return preferred;
      if (this.textures.exists('portrait-arthur-dewasa-neutral')) return 'portrait-arthur-dewasa-neutral';
      return null;
    }

    if (who === 'buron') {
      const preferred = `portrait-arthur-buron-${expr}`;
      if (this.textures.exists(preferred)) return preferred;
      if (this.textures.exists('portrait-arthur-buron-neutral')) return 'portrait-arthur-buron-neutral';
      return null;
    }

    if (who === 'tua') {
      const preferred = `portrait-arthur-tua-${expr}`;
      if (this.textures.exists(preferred)) return preferred;
      if (expr === 'warm' || expr === 'happy' || expr === 'smile') {
        if (this.textures.exists('portrait-arthur-tua-warm')) return 'portrait-arthur-tua-warm';
      }
      if (this.textures.exists('portrait-arthur-tua-sad')) return 'portrait-arthur-tua-sad';
      if (this.textures.exists('portrait-arthur-tua-warm')) return 'portrait-arthur-tua-warm';
      return null;
    }

    return null;
  }

  private updatePortraits(who: CharacterId, expr: Expression): void {
    if (who === 'narrator') {
      this.hidePortraits();
      return;
    }

    const isElena = who === 'elena';
    const key = this.getPortraitKey(who, expr);

    if (isElena && this.portraitLeft && key) {
      this.portraitLeft.image.setTexture(key);
      this.portraitLeft.label.setText('ELENA');
      this.portraitLeft.container.setVisible(true).setAlpha(1);
      if (!this.registry.get('reduceMotion')) {
        this.tweens.killTweensOf(this.portraitLeft.container);
        this.portraitLeft.container.setScale(0.92);
        this.tweens.add({
          targets: this.portraitLeft.container,
          scale: 1,
          duration: 180,
          ease: 'Back.easeOut',
        });
      }
      if (this.portraitRight?.container.visible) {
        this.portraitRight.container.setAlpha(0.42);
      }
    } else if (!isElena && this.portraitRight && key) {
      this.portraitRight.image.setTexture(key);
      const name = CHARACTER_NAMES[who] || 'ARTHUR';
      this.portraitRight.label.setText(name);
      this.portraitRight.container.setVisible(true).setAlpha(1);
      if (!this.registry.get('reduceMotion')) {
        this.tweens.killTweensOf(this.portraitRight.container);
        this.portraitRight.container.setScale(0.92);
        this.tweens.add({
          targets: this.portraitRight.container,
          scale: 1,
          duration: 180,
          ease: 'Back.easeOut',
        });
      }
      if (this.portraitLeft?.container.visible) {
        this.portraitLeft.container.setAlpha(0.42);
      }
    }
  }

  private hidePortraits(): void {
    if (this.portraitLeft) this.portraitLeft.container.setVisible(false);
    if (this.portraitRight) this.portraitRight.container.setVisible(false);
  }

  private updatePortraitBob(time: number): void {
    if (this.registry.get('reduceMotion')) return;
    if (this.portraitLeft?.container.visible) {
      this.portraitLeft.container.y = this.portraitLeft.baseY + Math.sin(time * 0.0018) * 2.2;
    }
    if (this.portraitRight?.container.visible) {
      this.portraitRight.container.y = this.portraitRight.baseY + Math.sin(time * 0.0018 + 1.2) * 2.2;
    }
  }

  private applyTextScale(scale: number): void {
    if (scale === this.appliedTextScale) return;
    this.appliedTextScale = scale;
    if (this.currentSay) {
      this.bubble.show(this.currentSay.text, null, scale);
      this.bubble.setProgress(this.typingComplete ? 1 : this.typingProgress / Math.max(1, this.currentSay.text.length));
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
      this.backlogOffset = 0;
      this.showBacklogModal();
    } else {
      this.backlogModal?.destroy();
      this.backlogModal = undefined;
    }
  }

  private scrollBacklog(direction: number): void {
    const rows = DialogueScene.backlogHistory.length;
    const maxOffset = Math.max(0, rows - 1);
    this.backlogOffset = Phaser.Math.Clamp(this.backlogOffset + direction, 0, maxOffset);
    this.showBacklogModal();
  }

  /** Backlog kertas ala legacy: kolom nama merah, 30 baris terakhir, bisa digulir. */
  private showBacklogModal(): void {
    this.backlogModal?.destroy();

    const bw = 720;
    const bh = 460;
    const bx = (GAME_WIDTH - bw) / 2;
    const by = (GAME_HEIGHT - bh) / 2;
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050403, 0.88)
      .setInteractive();
    bg.on('pointerup', () => this.toggleBacklog());

    const modal = this.add.container(0, 0, [bg]);
    const panel = addPaperPanel(this, bx, by, bw, bh, { radius: 8 });
    modal.add(panel);

    const title = this.add.text(GAME_WIDTH / 2, by + 30, '— CATATAN DIALOG —', {
      color: CSS.red,
      fontFamily: FONT.TITLE,
      fontSize: '18px',
    }).setOrigin(0.5);
    modal.add(title);

    const entries = DialogueScene.backlogHistory.slice().reverse();
    const rowH = 44;
    const maxRows = Math.floor((bh - 110) / rowH);
    const start = Math.min(this.backlogOffset, Math.max(0, entries.length - maxRows));
    const visible = entries.slice(start, start + maxRows);

    visible.forEach((entry, i) => {
      const y = by + 62 + i * rowH;
      const name = this.add.text(bx + 30, y, entry.who, {
        color: CSS.red,
        fontFamily: FONT.UI,
        fontStyle: 'bold',
        fontSize: '11px',
      });
      const lines = wrapLines(entry.text, `14px ${FONT.UI}`, bw - 190).slice(0, 2);
      const text = this.add.text(bx + 130, y, lines.join('\n'), {
        color: CSS.body,
        fontFamily: FONT.UI,
        fontSize: '14px',
        lineSpacing: 2,
      });
      modal.add([name, text]);
    });

    const footer = this.add.text(GAME_WIDTH / 2, by + bh - 26, '↑↓: gulir • TAB / ESC / KLIK: tutup', {
      color: 'rgba(43,33,26,.6)',
      fontFamily: FONT.UI,
      fontSize: '12.5px',
    }).setOrigin(0.5);
    modal.add(footer);

    this.backlogModal = modal;
  }

  private notifyItemAdded(label: string): void {
    const ui = this.scene.get('UIScene') as { showToast?: (text: string, ms?: number, opts?: { title?: string }) => void } | null;
    if (ui && this.scene.isActive('UIScene')) {
      ui.showToast?.(label, 3000, { title: 'DITAMBAHKAN KE TAS' });
    }
  }

  private hideChoicePanel(): void {
    this.destroyChoicePanel();
  }

  private destroyChoicePanel(): void {
    this.choiceButtons.forEach((btn) => btn.zone.destroy());
    this.choiceButtons = [];
    this.choiceRoot?.destroy(true);
    this.choiceRoot = undefined;
    this.choiceMarker = undefined;
    this.enterHint = undefined;
  }

  private cleanup(): void {
    this.stopTalkingBounce();
    this.hidePortraits();
    this.portraitLeft?.container.destroy();
    this.portraitRight?.container.destroy();
    this.portraitLeft = undefined;
    this.portraitRight = undefined;
    this.dataPayload.resetSpeakers?.();
    this.bubble?.hide();
    DialogueScene.backlogHistory = DialogueScene.backlogHistory.slice(-30);
  }

  private finish(action?: { type: string; [key: string]: unknown }): void {
    this.stopTalkingBounce();
    this.dataPayload.resetSpeakers?.();
    this.scene.stop();
    this.dataPayload.onComplete(action);
  }
}
