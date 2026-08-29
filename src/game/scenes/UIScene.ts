import Phaser from 'phaser';
import type { SoundManager } from '../audio/SoundManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { saveOptions, type GameOptions } from '../options';
import type { InputSystem } from '../systems/InputSystem';
import type { RunState } from '../systems/SaveSystem';
import { addPaperPanel, measureText } from '../ui/paper';
import { CSS, FONT, RED } from '../ui/theme';

type UIData = { input: InputSystem; eraTitle?: string; run?: RunState };
type PauseMenuItem = { label: () => string; action?: () => void; adjust?: (direction: number) => void };

const GAMEPLAY_SCENES = [
  'DialogueScene', 'DiaryScene', 'WatchRepairScene', 'SpotlightChallengeScene',
  'SignalTuneScene', 'RosePuzzleScene', 'GemAlignScene', 'PhotoPuzzleScene',
  'CryoBalanceScene', 'Era1999Scene', 'Era1968Scene', 'Era1944Scene', 'Bonus2088Scene',
] as const;

const MODAL_SCENES = GAMEPLAY_SCENES.slice(0, 9);

export type InventoryItemDef = {
  id: 'watch' | 'flower' | 'water_gem' | 'arthur_photo';
  label: string;
  era: string;
  asset: string;
  desc: string;
  foundHint: string;
};

const STORY_ITEMS_DEF: readonly InventoryItemDef[] = [
  {
    id: 'watch',
    label: 'Jam Saku Perang',
    era: 'BABAK 1 — 1944',
    asset: 'watch-prop',
    desc: 'Jam saku perak tua pemberian Arthur di masa Perang Dunia II. Berdetak secara misterius walau bagian mekanis di dalamnya pernah mengalami kerusakan parah.',
    foundHint: 'Dapatkan dari membetulkan jam tangan di Parit 1944.',
  },
  {
    id: 'flower',
    label: 'Botol Mawar Abadi',
    era: 'BABAK 2 — 1968',
    asset: 'rose-bottle-broken',
    desc: 'Kelopak mawar merah yang diawetkan dalam botol kaca spesimen. Bukti janji dan rasa cinta Arthur di tengah dinginnya bunker bawah tanah.',
    foundHint: 'Dapatkan dari menyusun pecahan botol mawar di Bunker 1968.',
  },
  {
    id: 'water_gem',
    label: 'Permata Kristal Air',
    era: 'BABAK 2/3 — 1968-1999',
    asset: 'water-gem-art',
    desc: 'Kristal penyeimbang suhu dan radiasi yang diselaraskan untuk menahan pembekuan kapsul kriogenik dan formula penawar.',
    foundHint: 'Dapatkan dari tantangan arsip mikrofilm atau penyelarasan kristal.',
  },
  {
    id: 'arthur_photo',
    label: 'Foto Kenangan Arthur',
    era: 'BABAK 3 — 1999',
    asset: 'elena-arthur-photo',
    desc: 'Foto potret perpisahan Elena dan Arthur sebelum eksperimen kapsul waktu. Menyimpan petunjuk penting penyelesaian formula penawar.',
    foundHint: 'Dapatkan dari memulihkan foto kenangan di Laboratorium 1999.',
  },
];

export class UIScene extends Phaser.Scene {
  private controls?: InputSystem;
  private eraCaption?: Phaser.GameObjects.Container;
  private loopText?: Phaser.GameObjects.Text;
  private prompt?: Phaser.GameObjects.Text;
  private touchPromptPaper?: Phaser.GameObjects.Container;
  private promptText = '';
  private toast?: Phaser.GameObjects.Container;
  private inventoryContainer?: Phaser.GameObjects.Container;
  private inventorySlots: Array<{ bg: Phaser.GameObjects.Arc; glyph: Phaser.GameObjects.Graphics }> = [];
  private inventorySignature = '';
  private inventoryModalPanel?: Phaser.GameObjects.Container;
  private selectedInventoryIndex = 0;
  private run?: RunState;
  private touchObjects: Array<Phaser.GameObjects.GameObject & { setVisible(value: boolean): unknown }> = [];
  private topHUDObjects: Array<Phaser.GameObjects.GameObject & { setVisible(value: boolean): unknown }> = [];
  private pausePanel?: Phaser.GameObjects.Container;
  private pauseMenuItems: PauseMenuItem[] = [];
  private pauseButtons: Phaser.GameObjects.Text[] = [];
  private pauseSelection = 0;
  private paused = false;
  private stateBeforePause = '';
  private modal = false;
  private modalOwned = false;
  private suppressPauseOnce = false;
  private pauseKeys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('UIScene');
  }

  create(data: UIData): void {
    this.resetRuntimeState();
    this.controls = data.input;
    this.run = data.run;

    this.createEraCaption(data.eraTitle || 'HEARTS ACROSS TIME');
    this.createLoopCounter();
    this.prompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 62, '', {
      backgroundColor: '#100c09dd', color: '#fff4d1', fontFamily: FONT.UI,
      fontSize: '18px', padding: { x: 18, y: 10 }, align: 'center',
    }).setOrigin(0.5).setVisible(false);

    this.createInventoryHUD();
    this.refreshInventory();

    const touchMode = this.sys.game.device.input.touch || new URLSearchParams(location.search).get('touch') === '1';
    if (touchMode) this.createTouchControls();
    this.createTopButtons();
    this.pauseKeys = this.input.keyboard?.addKeys('ESC,P,R,M,UP,DOWN,LEFT,RIGHT,W,A,S,D,ENTER,SPACE') as typeof this.pauseKeys;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.resetRuntimeState, this);
  }

  /** Caption babak: kotak caption komik kertas + goresan tinta merah (screens.js). */
  private createEraCaption(title: string): void {
    const font = `bold 21px ${FONT.UI}`;
    const tw = Math.ceil(measureText(title, font));
    const x = 22, y = 56, w = tw + 36, h = 38;
    const container = this.add.container(0, 0);
    const paper = addPaperPanel(this, x, y, w, h, { radius: 4, shadow: false });
    const underline = this.add.graphics();
    underline.lineStyle(2, RED, 1);
    underline.beginPath();
    underline.moveTo(x + 14, y + h - 8);
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const mt = 1 - t;
      underline.lineTo(
        mt * mt * (x + 14) + 2 * mt * t * (x + w / 2) + t * t * (x + w - 14),
        mt * mt * (y + h - 8) + 2 * mt * t * (y + h - 5.5) + t * t * (y + h - 8),
      );
    }
    underline.strokePath();
    const text = this.add.text(x + 18, y + h / 2 - 2, title, {
      color: CSS.body,
      fontFamily: FONT.UI,
      fontStyle: 'bold',
      fontSize: '21px',
    }).setOrigin(0, 0.5);
    container.add([paper, underline, text]);
    this.eraCaption = container;

    // tampil 3.2 detik lalu memudar (alpha legacy: min(1,T) * min(1,(3.2-T)*2))
    if (!this.registry.get('reduceMotion')) {
      container.setAlpha(0);
      this.tweens.add({ targets: container, alpha: 1, duration: 300, ease: 'Sine.easeOut' });
    }
    this.tweens.add({
      targets: container,
      alpha: 0,
      delay: 2900,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => { this.eraCaption?.destroy(); this.eraCaption = undefined; },
    });
  }

  /** Penghitung loop: ⟲ LOOP n merah monospace + subjudul lari otomatis. */
  private createLoopCounter(): void {
    const loop = this.run?.loop ?? 0;
    if (loop <= 0) return;
    const isTouch = this.sys.game.device.input.touch;
    this.loopText = this.add.text(18, 20, `⟲ LOOP ${loop}`, {
      color: 'rgba(194,59,59,.9)',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      fontSize: '13px',
    });
    this.add.text(18, 36, `lari otomatis — tahan ${isTouch ? '≫' : 'SHIFT'} untuk jalan pelan`, {
      color: CSS.body,
      fontFamily: FONT.UI,
      fontSize: '12px',
    }).setAlpha(0.62);
  }

  update(): void {
    this.refreshInventory();
    if (!this.pauseKeys) return;
    const hasModal = MODAL_SCENES.some(name => this.scene.isActive(name));
    if (!this.paused && !this.modalOwned && hasModal !== this.modal) this.setModal(hasModal, false);
    if (this.suppressPauseOnce) {
      this.suppressPauseOnce = false;
      return;
    }

    if (this.inventoryModalPanel) {
      if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.ESC) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.P)) {
        this.closeInventoryModal();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.ESC) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.P)) {
      this.togglePause();
    } else if (this.paused) {
      if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.R)) this.restartCycle();
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.M)) this.leaveGameplay('TitleScene');
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.UP) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.W)) this.movePauseSelection(-1);
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.DOWN) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.S)) this.movePauseSelection(1);
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.LEFT) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.A)) this.adjustPauseItem(-1);
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.RIGHT) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.D)) this.adjustPauseItem(1);
      else if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.ENTER) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.SPACE)) this.activatePauseItem();
    }
  }

  setPrompt(text = ''): void {
    if (!this.prompt) return;
    const changed = text !== this.promptText;
    this.promptText = text;
    this.prompt.setText(text).setVisible(Boolean(text) && !this.paused && !this.modal);
    if (this.touchPromptPaper) {
      const label = this.touchPromptPaper.getAt(1) as Phaser.GameObjects.Text;
      label.setText(text || '▼ PERIKSA');
      this.touchPromptPaper.setVisible(Boolean(text) && !this.paused && !this.modal);
    }
    if (!changed || !text || this.registry.get('reduceMotion')) return;
    this.tweens.killTweensOf(this.prompt);
    this.prompt.setScale(0.92);
    this.tweens.add({ targets: this.prompt, scale: 1, duration: 150, ease: 'Back.easeOut' });
  }

  setModal(on: boolean, owned = true): void {
    if (this.modal && !on) {
      this.pauseKeys?.ESC.reset();
      this.suppressPauseOnce = true;
    }
    this.modalOwned = owned && on;
    this.modal = on;
    this.touchObjects.forEach((object) => object.setVisible(!on && !this.paused));
    this.topHUDObjects.forEach((object) => object.setVisible(!on && !this.paused));
    if (on) this.prompt?.setVisible(false);
  }

  showToast(text: string, duration = 2200, opts?: { title?: string }): void {
    this.toast?.destroy();
    const isReduced = Boolean(this.registry.get('reduceMotion'));
    const cardW = 430;
    const cardH = opts?.title ? 74 : 58;
    const paper = addPaperPanel(this, GAME_WIDTH / 2 - cardW / 2, 78, cardW, cardH, { radius: 7 });

    const parts: Phaser.GameObjects.GameObject[] = [paper];
    let bodyY = 78 + cardH / 2;
    if (opts?.title) {
      parts.push(this.add.text(GAME_WIDTH / 2, 78 + 24, opts.title, {
        color: CSS.red,
        fontFamily: FONT.META,
        fontStyle: 'bold',
        fontSize: '12px',
      }).setOrigin(0.5));
      bodyY = 78 + 50;
    }
    parts.push(this.add.text(GAME_WIDTH / 2, bodyY, text, {
      color: CSS.body,
      fontFamily: FONT.UI,
      fontStyle: 'bold',
      fontSize: '18px',
    }).setOrigin(0.5));

    this.toast = this.add.container(0, 0, parts).setDepth(3000);

    if (!isReduced) {
      this.toast.setAlpha(0).setY(14);
      this.tweens.add({
        targets: this.toast,
        alpha: 1,
        y: 0,
        duration: 200,
        ease: 'Sine.easeOut',
      });
    }

    this.time.delayedCall(duration, () => {
      if (this.toast) {
        if (!isReduced) {
          this.tweens.add({
            targets: this.toast,
            alpha: 0,
            y: -14,
            duration: 200,
            onComplete: () => { this.toast?.destroy(); this.toast = undefined; },
          });
        } else {
          this.toast.destroy();
          this.toast = undefined;
        }
      }
    });
  }

  isPaused(): boolean {
    return this.paused;
  }

  /** Pad sentuh kertas-tinta legacy: lingkaran gosok ganda + chevron digambar. */
  private createTouchControls(): void {
    const pad = (x: number, y: number, r: number, direction: 'left' | 'right' | 'run'): void => {
      const container = this.add.container(x, y);
      const icon = this.add.graphics();
      const drawIcon = (on: boolean): void => {
        icon.clear();
        icon.fillStyle(0x0a0806, on ? 0.8 : 0.45);
        icon.fillCircle(0, 0, r);
        icon.lineStyle(1.6, on ? 0xe8c88a : 0xf5f0e8, on ? 1 : 0.8);
        icon.strokeCircle(0, 0, r);
        icon.lineStyle(0.8, 0xf5f0e8, 0.22);
        icon.strokeCircle(0, 0, r - 3.5);
        icon.fillStyle(on ? 0xffe2ac : 0xf5f0e8, on ? 1 : 0.85);
        const s = direction === 'run' ? 5 : 7;
        if (direction === 'left') {
          icon.fillTriangle(s, -8, s, 8, -s, 0);
        } else if (direction === 'right') {
          icon.fillTriangle(-s, -8, -s, 8, s, 0);
        } else {
          icon.fillTriangle(-6, -7, -6, 7, 0, 0);
          icon.fillTriangle(1, -7, 1, 7, 7, 0);
        }
      };
      drawIcon(false);
      container.add(icon);
      container.setSize(r * 2, r * 2).setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        drawIcon(true);
        if (direction === 'run') this.controls?.setTouchSprint(true);
        else this.controls?.setTouch(direction, true);
      });
      const release = (): void => {
        drawIcon(false);
        if (direction === 'run') this.controls?.setTouchSprint(false);
        else this.controls?.setTouch(direction, false);
      };
      container.on('pointerup', release);
      container.on('pointerout', release);
      this.touchObjects.push(container);
    };
    pad(70, GAME_HEIGHT - 65, 31, 'left');
    pad(GAME_WIDTH - 70, GAME_HEIGHT - 65, 31, 'right');
    pad(GAME_WIDTH - 36, GAME_HEIGHT - 162, 27, 'run');

    // tombol kontekstual kertas — label mengikuti prompt dunia
    const actW = 138, actH = 44;
    const paper = addPaperPanel(this, GAME_WIDTH / 2 - actW / 2, GAME_HEIGHT - 64 - actH / 2, actW, actH, { radius: 9, shadow: false });
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 64, '', {
      color: CSS.red,
      fontFamily: FONT.UI,
      fontStyle: 'bold',
      fontSize: '13px',
    }).setOrigin(0.5);
    const action = this.add.container(0, 0, [paper, label])
      .setSize(actW, actH)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.controls?.triggerTouch('interact'));
    this.touchPromptPaper = action;
    this.touchObjects.push(action);
    this.input.on('pointerup', () => this.controls?.clearTouchMovement());
  }

  private isOwnedItem(it: InventoryItemDef): boolean {
    if (!this.run) return false;
    return Boolean(
      this.run.inventory[it.id] ||
      (it.id === 'watch' && this.run.watchRepaired) ||
      (it.id === 'flower' && this.run.roseRepaired) ||
      (it.id === 'water_gem' && this.run.gemAligned) ||
      (it.id === 'arthur_photo' && this.run.photoRepaired)
    );
  }

  private createInventoryHUD(): void {
    const w = 176, h = 38, x = GAME_WIDTH - w - 18, y = 52;
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x07090c, 0.72)
      .setStrokeStyle(1.2, 0xf1d58b, 0.55);
    const tasLabel = this.add.text(x + 10, y + h / 2, 'TAS', {
      color: '#F1D58B',
      fontFamily: FONT.META,
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    const hitArea = this.add.rectangle(x + w / 2, y + h / 2, w + 8, h + 8, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        bg.setStrokeStyle(1.8, 0xfff0a0, 0.95);
        tasLabel.setColor('#FFF0A0');
      })
      .on('pointerout', () => {
        bg.setStrokeStyle(1.2, 0xf1d58b, 0.55);
        tasLabel.setColor('#F1D58B');
      })
      .on('pointerdown', () => this.toggleInventoryModal());

    this.inventorySlots = [];
    const slotObjects: Phaser.GameObjects.GameObject[] = [bg, tasLabel, hitArea];

    STORY_ITEMS_DEF.forEach((it, idx) => {
      const cx = x + 66 + idx * 25;
      const cy = y + h / 2;
      const slotBg = this.add.circle(cx, cy, 11, 0xf5f0e8, 0.05)
        .setStrokeStyle(1.1, 0xf5f0e8, 0.18);
      const glyph = this.add.graphics();
      this.drawInventoryGlyph(glyph, it.id, cx, cy, 0xf5f0e8, 0.2);

      this.inventorySlots.push({ bg: slotBg, glyph });
      slotObjects.push(slotBg, glyph);
    });

    this.inventoryContainer = this.add.container(0, 0, slotObjects).setVisible(false);
  }

  private refreshInventory(): void {
    if (!this.run) return;
    const signature = STORY_ITEMS_DEF.map(it => this.isOwnedItem(it) ? '1' : '0').join('');
    if (signature === this.inventorySignature) return;
    this.inventorySignature = signature;
    const ownedCount = STORY_ITEMS_DEF.filter(it => this.isOwnedItem(it)).length;

    if (this.inventoryContainer) {
      this.inventoryContainer.setVisible(ownedCount > 0);
      STORY_ITEMS_DEF.forEach((it, idx) => {
        const slot = this.inventorySlots[idx];
        if (!slot) return;
        const has = this.isOwnedItem(it);
        slot.bg.setFillStyle(has ? 0xf7d984 : 0xf5f0e8, has ? 0.22 : 0.05);
        slot.bg.setStrokeStyle(1.1, has ? 0xf7d984 : 0xf5f0e8, has ? 1 : 0.18);
        this.drawInventoryGlyph(slot.glyph, it.id, slot.bg.x, slot.bg.y, has ? 0xfff0a0 : 0xf5f0e8, has ? 1 : 0.18);
      });
    }
  }

  private toggleInventoryModal(): void {
    if (this.inventoryModalPanel) {
      this.closeInventoryModal();
    } else {
      this.openInventoryModal();
    }
  }

  private openInventoryModal(): void {
    if (this.inventoryModalPanel) return;
    const soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    soundManager?.playConfirm();

    this.controls?.clearTouch();
    this.touchObjects.forEach((object) => object.setVisible(false));
    this.selectedInventoryIndex = 0;
    this.renderInventoryModal();
  }

  private closeInventoryModal(): void {
    if (!this.inventoryModalPanel) return;
    const soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    soundManager?.playSelect();

    this.inventoryModalPanel.destroy();
    this.inventoryModalPanel = undefined;
    this.touchObjects.forEach((object) => object.setVisible(!this.modal));
  }

  private renderInventoryModal(): void {
    if (this.inventoryModalPanel) {
      this.inventoryModalPanel.destroy();
      this.inventoryModalPanel = undefined;
    }

    const modalW = 680;
    const modalH = 430;
    const modalX = (GAME_WIDTH - modalW) / 2;
    const modalY = (GAME_HEIGHT - modalH) / 2;

    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x040302, 0.8)
      .setInteractive()
      .on('pointerdown', () => this.closeInventoryModal());

    const paper = addPaperPanel(this, modalX, modalY, modalW, modalH, { radius: 10 });
    const headerTitle = this.add.text(GAME_WIDTH / 2, modalY + 30, '— TAS ELENA : BARANG SEJARAH —', {
      color: CSS.red, fontFamily: FONT.UI, fontSize: '20px', fontStyle: 'bold',
    }).setOrigin(0.5);

    const subTitle = this.add.text(GAME_WIDTH / 2, modalY + 54, 'Klik barang di bawah untuk memperbesar dan melihat catatan sejarahnya.', {
      color: '#5A4A3C', fontFamily: FONT.META, fontSize: '12px',
    }).setOrigin(0.5);

    const elements: Phaser.GameObjects.GameObject[] = [shade, paper, headerTitle, subTitle];

    const listX = modalX + 24;
    const listTopY = modalY + 82;
    const itemW = 270;
    const itemH = 68;

    STORY_ITEMS_DEF.forEach((it, idx) => {
      const isOwned = this.isOwnedItem(it);
      const isSelected = idx === this.selectedInventoryIndex;
      const cardY = listTopY + idx * 74;

      const cardBg = this.add.rectangle(listX + itemW / 2, cardY + itemH / 2, itemW, itemH, isSelected ? 0x94342e : 0x5a4a3c, isSelected ? 0.16 : 0.06)
        .setStrokeStyle(isSelected ? 2.5 : 1.2, isSelected ? 0x94342e : 0x4a3b2c, isSelected ? 0.95 : 0.4)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selectedInventoryIndex = idx;
          this.renderInventoryModal();
        });

      const iconCircle = this.add.circle(listX + 26, cardY + itemH / 2, 17, isOwned ? 0xf7d984 : 0x3a3028, isOwned ? 0.25 : 0.15)
        .setStrokeStyle(1.4, isOwned ? 0xf7d984 : 0x7a6b5c, isOwned ? 1 : 0.3);

      const glyph = this.add.graphics();
      this.drawInventoryGlyph(glyph, it.id, listX + 26, cardY + itemH / 2, isOwned ? 0xfff0a0 : 0x9a8b7c, isOwned ? 1 : 0.4);

      const nameText = this.add.text(listX + 54, cardY + 15, it.label, {
        color: isSelected ? CSS.red : CSS.body,
        fontFamily: FONT.UI,
        fontSize: '14px',
        fontStyle: isSelected ? 'bold' : 'normal',
      });

      const statusTag = this.add.text(listX + 54, cardY + 37, isOwned ? `[OK] ${it.era}` : `[TERKUNCI] ${it.era}`, {
        color: isOwned ? CSS.green : '#7A6A5A',
        fontFamily: FONT.META,
        fontSize: '11px',
      });

      elements.push(cardBg, iconCircle, glyph, nameText, statusTag);
    });

    const detailX = modalX + 314;
    const detailY = modalY + 82;
    const detailW = 342;
    const detailH = 288;

    const detailBg = addPaperPanel(this, detailX, detailY, detailW, detailH, { radius: 6 });
    elements.push(detailBg);

    const selectedItem = STORY_ITEMS_DEF[this.selectedInventoryIndex];
    const isSelectedOwned = this.isOwnedItem(selectedItem);

    const artFrameX = detailX + detailW / 2;
    const artFrameY = detailY + 68;
    const artBox = this.add.rectangle(artFrameX, artFrameY, 110, 100, 0x1a1410, 0.08)
      .setStrokeStyle(1.2, 0x5a4a3c, 0.4);
    elements.push(artBox);

    if (this.textures.exists(selectedItem.asset)) {
      const img = this.add.image(artFrameX, artFrameY, selectedItem.asset)
        .setDisplaySize(90, 85)
        .setAlpha(isSelectedOwned ? 1 : 0.25);
      if (!isSelectedOwned) img.setTint(0x443322);
      elements.push(img);
    } else {
      const fallbackGlyph = this.add.graphics();
      this.drawInventoryGlyph(fallbackGlyph, selectedItem.id, artFrameX, artFrameY, isSelectedOwned ? 0xfff0a0 : 0x7a6b5c, 1);
      fallbackGlyph.setScale(2.5);
      elements.push(fallbackGlyph);
    }

    const detailTitle = this.add.text(detailX + detailW / 2, detailY + 132, selectedItem.label.toUpperCase(), {
      color: CSS.body, fontFamily: FONT.UI, fontSize: '15px', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);

    const badgeText = isSelectedOwned ? '[TERKUMPUL & SELARAS]' : '[BELUM DITEMUKAN]';
    const badgeColor = isSelectedOwned ? CSS.green : CSS.red;
    const badge = this.add.text(detailX + detailW / 2, detailY + 152, badgeText, {
      color: badgeColor, fontFamily: FONT.META, fontSize: '11px', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);

    const descText = isSelectedOwned ? selectedItem.desc : selectedItem.foundHint;
    const desc = this.add.text(detailX + 18, detailY + 172, descText, {
      color: '#3A2A1C',
      fontFamily: FONT.UI,
      fontSize: '12.5px',
      wordWrap: { width: detailW - 36 },
      lineSpacing: 3,
    });

    elements.push(detailTitle, badge, desc);

    const closeBtnX = GAME_WIDTH / 2;
    const closeBtnY = modalY + modalH - 26;
    const closeBtnBg = this.add.rectangle(closeBtnX, closeBtnY, 150, 32, 0x94342e, 0.95)
      .setStrokeStyle(1.5, 0x6d211d, 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.closeInventoryModal());
    const closeBtnText = this.add.text(closeBtnX, closeBtnY, 'TUTUP (ESC)', {
      color: '#FFF8EA', fontFamily: FONT.UI, fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);

    elements.push(closeBtnBg, closeBtnText);

    this.inventoryModalPanel = this.add.container(0, 0, elements);
  }

  private drawInventoryGlyph(
    graphics: Phaser.GameObjects.Graphics,
    id: typeof STORY_ITEMS_DEF[number]['id'],
    x: number,
    y: number,
    color: number,
    alpha: number,
  ): void {
    graphics.clear().lineStyle(1.4, color, alpha);
    if (id === 'watch') {
      graphics.strokeCircle(x, y, 5).lineBetween(x, y, x, y - 3).lineBetween(x, y, x + 3, y + 2);
    } else if (id === 'flower') {
      graphics.strokeCircle(x, y - 1, 2).strokeCircle(x - 3, y - 2, 2).strokeCircle(x + 3, y - 2, 2)
        .lineBetween(x, y + 1, x, y + 6);
    } else if (id === 'water_gem') {
      graphics.strokePoints([
        new Phaser.Math.Vector2(x, y - 6),
        new Phaser.Math.Vector2(x + 5, y),
        new Phaser.Math.Vector2(x, y + 6),
        new Phaser.Math.Vector2(x - 5, y),
      ], true);
    } else {
      graphics.strokeRect(x - 6, y - 5, 12, 10).lineBetween(x - 4, y + 3, x, y - 1).lineBetween(x, y - 1, x + 4, y + 3);
    }
  }

  /** Tombol lingkar tinta legacy (drawPauseBtn): #0a0806 + goresan ganda. */
  private createTopButtons(): void {
    const soundManager = this.registry.get('soundManager') as { setMuted: (m: boolean) => void; muted: boolean } | undefined;
    let muted = soundManager?.muted ?? false;

    const makeButton = (x: number, w: number, onPress: () => void): {
      container: Phaser.GameObjects.Container;
      bg: Phaser.GameObjects.Rectangle;
      icon: Phaser.GameObjects.Graphics;
    } => {
      const bg = this.add.rectangle(0, 0, w, 32, 0x07090c, 0.88)
        .setStrokeStyle(1.4, 0xf1d58b, 0.75);
      const icon = this.add.graphics();
      const container = this.add.container(x, 26, [bg, icon])
        .setSize(w, 32)
        .setDepth(2000)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', onPress);
      return { container, bg, icon };
    };

    const pause = makeButton(GAME_WIDTH - 116, 82, () => this.togglePause());
    const pauseLabel = this.add.text(-3, 0, 'JEDA', {
      color: '#F1D58B',
      fontFamily: FONT.META,
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    pause.container.add(pauseLabel);

    const drawPauseIcon = (on: boolean): void => {
      pause.bg.setStrokeStyle(on ? 1.8 : 1.4, on ? 0xfff0a0 : 0xf1d58b, on ? 0.95 : 0.75);
      pauseLabel.setColor(on ? '#FFF0A0' : '#F1D58B');
      pause.icon.clear().fillStyle(on ? 0xfff0a0 : 0xf5f0e8, 1)
        .fillRect(-22, -5, 3.5, 10)
        .fillRect(-16, -5, 3.5, 10);
    };
    drawPauseIcon(false);
    pause.container.on('pointerover', () => drawPauseIcon(true));
    pause.container.on('pointerout', () => drawPauseIcon(false));
    this.topHUDObjects.push(pause.container);

    const mute = makeButton(GAME_WIDTH - 36, 40, () => {
      muted = !muted;
      soundManager?.setMuted(muted);
      drawMuteIcon(false);
    });
    const drawMuteIcon = (on: boolean): void => {
      mute.bg.setStrokeStyle(on ? 1.8 : 1.4, on ? 0xfff0a0 : 0xf1d58b, on ? 0.95 : 0.75);
      mute.icon.clear();
      mute.icon.fillStyle(muted ? 0xb8a898 : (on ? 0xfff0a0 : 0xf5f0e8), 1);
      mute.icon.fillRect(-8, -2.5, 3, 5);
      mute.icon.fillTriangle(-5, -4, -5, 4, -1, 0);
      if (muted) mute.icon.lineStyle(1.6, 0xb8a898, 1).lineBetween(-1, -6, 8, 6);
      else mute.icon.lineStyle(1.4, on ? 0xfff0a0 : 0xf5f0e8, 1).strokeCircle(1, 0, 5.5);
    };
    drawMuteIcon(false);
    mute.container.on('pointerover', () => drawMuteIcon(true));
    mute.container.on('pointerout', () => drawMuteIcon(false));
    this.topHUDObjects.push(mute.container);
  }

  private getActiveGameplayScene(): string {
    for (const name of GAMEPLAY_SCENES) {
      if (this.scene.isActive(name) || this.scene.isPaused(name)) return name;
    }
    return 'Era1944Scene';
  }

  private togglePause(): void {
    this.paused = !this.paused;
    const gameplay = this.getActiveGameplayScene();

    if (this.paused) {
      this.stateBeforePause = String(this.registry.get('nativeState') ?? gameplay.toLowerCase());
      this.scene.pause(gameplay);
      this.controls?.clearTouch();
      this.touchObjects.forEach((object) => object.setVisible(false));
      this.topHUDObjects.forEach((object) => object.setVisible(false));
      this.prompt?.setVisible(false);
      this.showPausePanel();
      this.registry.set('nativeState', 'paused');
    } else {
      this.scene.resume(gameplay);
      this.pausePanel?.destroy();
      this.pausePanel = undefined;
      this.pauseMenuItems = [];
      this.pauseButtons = [];
      this.touchObjects.forEach((object) => object.setVisible(!this.modal));
      this.topHUDObjects.forEach((object) => object.setVisible(true));
      this.registry.set('nativeState', this.stateBeforePause);
    }
  }

  private showPausePanel(): void {
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x040302, 0.8);
    const panelW = 520, panelH = 506;
    const paper = addPaperPanel(this, GAME_WIDTH / 2 - panelW / 2, GAME_HEIGHT / 2 - panelH / 2, panelW, panelH, { radius: 8 });
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - panelH / 2 + 38, '— JEDA —', {
      color: CSS.red, fontFamily: FONT.UI, fontSize: '24px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const options = this.registry.get('options') as GameOptions;
    const soundManager = this.registry.get('soundManager') as SoundManager | undefined;
    const volume = (key: 'vol' | 'volMus' | 'volSfx', direction: number): void => {
      options[key] = Phaser.Math.Clamp(Math.round((options[key] + direction * 0.1) * 10) / 10, 0, 1);
      this.applyOptions(options, soundManager);
    };
    const cycle = (key: 'textSpd' | 'textScale', values: number[], direction: number): void => {
      const current = values.indexOf(options[key]);
      options[key] = values[Phaser.Math.Wrap((current < 0 ? 0 : current) + direction, 0, values.length)];
      this.applyOptions(options, soundManager);
    };
    this.pauseMenuItems = [
      { label: () => 'LANJUTKAN', action: () => this.togglePause() },
      { label: () => `VOLUME MASTER  ‹ ${Math.round(options.vol * 100)}% ›`, adjust: direction => volume('vol', direction) },
      { label: () => `MUSIK  ‹ ${Math.round(options.volMus * 100)}% ›`, adjust: direction => volume('volMus', direction) },
      { label: () => `EFEK & AMBIENSI  ‹ ${Math.round(options.volSfx * 100)}% ›`, adjust: direction => volume('volSfx', direction) },
      { label: () => `KECEPATAN TEKS  ‹ ${options.textSpd < 0.8 ? 'LAMBAT' : options.textSpd > 1.2 ? 'CEPAT' : 'SEDANG'} ›`, adjust: direction => cycle('textSpd', [0.6, 1, 1.7], direction) },
      { label: () => `UKURAN TEKS  ‹ ${options.textScale > 1 ? 'BESAR' : 'NORMAL'} ›`, adjust: direction => cycle('textScale', [1, 1.22], direction) },
      { label: () => `EFEK SINEMATIK  ‹ ${options.reduceMotion ? 'MATI' : 'ON'} ›`, adjust: () => { options.reduceMotion = !options.reduceMotion; this.applyOptions(options, soundManager); } },
      { label: () => 'R — ULANG DARI 1944', action: () => this.restartCycle() },
      { label: () => 'M — MENU UTAMA', action: () => this.leaveGameplay('TitleScene') },
    ];
    this.pauseSelection = 0;
    const top = GAME_HEIGHT / 2 - panelH / 2;
    this.pauseButtons = this.pauseMenuItems.map((item, index) => {
      const button = this.add.text(GAME_WIDTH / 2, top + 76 + index * 46, item.label(), {
        backgroundColor: '#5a4a3c10', color: '#2b211a', fontFamily: FONT.META,
        fontSize: '12px', align: 'center', fixedWidth: 460, padding: { x: 10, y: 9 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      button.on('pointerover', () => { this.pauseSelection = index; this.refreshPauseMenu(); });
      button.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        this.pauseSelection = index;
        if (item.adjust) item.adjust(pointer.x < GAME_WIDTH / 2 ? -1 : 1);
        else item.action?.();
        this.refreshPauseMenu();
      });
      return button;
    });
    const footer = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + panelH / 2 - 24, 'ESC: lanjut • ↑↓: pilih • ←→: ubah • ENTER: oke', {
      color: 'rgba(43,33,26,.6)', fontFamily: FONT.UI, fontSize: '12.5px',
    }).setOrigin(0.5);
    this.pausePanel = this.add.container(0, 0, [shade, paper, title, ...this.pauseButtons, footer]);
    this.refreshPauseMenu();
  }

  private applyOptions(options: GameOptions, soundManager?: SoundManager): void {
    this.registry.set('options', options);
    this.registry.set('reduceMotion', options.reduceMotion);
    if (options.reduceMotion) this.anims.pauseAll(); else this.anims.resumeAll();
    saveOptions(localStorage, options);
    soundManager?.updateVolumes();
    this.refreshPauseMenu();
  }

  private movePauseSelection(direction: number): void {
    this.pauseSelection = Phaser.Math.Wrap(this.pauseSelection + direction, 0, this.pauseMenuItems.length);
    (this.registry.get('soundManager') as SoundManager | undefined)?.playSelect();
    this.refreshPauseMenu();
  }

  private adjustPauseItem(direction: number): void {
    const item = this.pauseMenuItems[this.pauseSelection];
    if (!item?.adjust) return;
    item.adjust(direction);
    (this.registry.get('soundManager') as SoundManager | undefined)?.playSelect();
  }

  private activatePauseItem(): void {
    const item = this.pauseMenuItems[this.pauseSelection];
    if (!item) return;
    if (item.action) item.action();
    else item.adjust?.(1);
    (this.registry.get('soundManager') as SoundManager | undefined)?.playConfirm();
  }

  private refreshPauseMenu(): void {
    this.pauseButtons.forEach((button, index) => button
      .setText(this.pauseMenuItems[index]?.label() ?? '')
      .setStyle({
        backgroundColor: index === this.pauseSelection ? '#94342e' : '#5a4a3c10',
        color: index === this.pauseSelection ? '#fff8ea' : '#2b211a',
      }));
  }

  private restartCycle(): void {
    const save = this.registry.get('saveSystem') as { beginCycle: () => unknown };
    this.leaveGameplay('Era1944Scene', { run: save.beginCycle(), intro: true });
  }

  private leaveGameplay(target: string, data?: object): void {
    const manager = this.scene.manager;
    for (const name of GAMEPLAY_SCENES) {
      if (manager.isActive(name) || manager.isPaused(name)) manager.stop(name);
    }
    manager.stop('UIScene');
    manager.start(target, data);
  }

  private resetRuntimeState(): void {
    this.controls?.clearTouch();
    this.controls = undefined;
    this.eraCaption = undefined;
    this.loopText = undefined;
    this.prompt = undefined;
    this.touchPromptPaper = undefined;
    this.promptText = '';
    this.toast = undefined;
    this.inventoryContainer = undefined;
    this.inventorySlots = [];
    this.inventorySignature = '';
    this.run = undefined;
    this.touchObjects = [];
    this.pausePanel = undefined;
    this.pauseMenuItems = [];
    this.pauseButtons = [];
    this.pauseSelection = 0;
    this.paused = false;
    this.stateBeforePause = '';
    this.modal = false;
    this.modalOwned = false;
    this.suppressPauseOnce = false;
  }
}
