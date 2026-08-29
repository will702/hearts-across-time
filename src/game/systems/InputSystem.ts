import Phaser from 'phaser';

export interface InputSnapshot {
  move: -1 | 0 | 1;
  sprint: boolean;
  interact: boolean;
}

type MovementKeys = {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  enter: Phaser.Input.Keyboard.Key;
};

export class InputSystem {
  private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: MovementKeys;
  private touchMove: -1 | 0 | 1 = 0;
  private readonly touchDirections = { left: false, right: false };
  private touchSprint = false;
  private touchInteract = false;
  private enabled = true;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard Phaser tidak tersedia pada scene ini.');

    this.keyboard = keyboard;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      interact: Phaser.Input.Keyboard.KeyCodes.S,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    }) as MovementKeys;
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    ]);
  }

  read(): InputSnapshot {
    if (!this.enabled) return { move: 0, sprint: false, interact: false };

    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    const keyboardMove = left === right ? 0 : left ? -1 : 1;
    const interact = this.touchInteract
      || Phaser.Input.Keyboard.JustDown(this.cursors.down)
      || Phaser.Input.Keyboard.JustDown(this.keys.interact)
      || Phaser.Input.Keyboard.JustDown(this.cursors.space)
      || Phaser.Input.Keyboard.JustDown(this.keys.enter);

    this.touchInteract = false;
    return {
      move: (keyboardMove || this.touchMove) as -1 | 0 | 1,
      sprint: this.cursors.shift.isDown || this.touchSprint,
      interact,
    };
  }

  setTouchMovement(move: -1 | 0 | 1, sprint = false): void {
    this.touchMove = move;
    this.touchSprint = sprint;
  }

  setTouch(direction: 'left' | 'right', pressed: boolean): void {
    this.touchDirections[direction] = pressed;
    this.touchMove = this.touchDirections.left === this.touchDirections.right
      ? 0
      : this.touchDirections.left ? -1 : 1;
  }

  setTouchSprint(pressed: boolean): void {
    this.touchSprint = pressed;
  }

  triggerTouch(action: 'interact'): void {
    if (action === 'interact') this.pressTouchInteract();
  }

  clearTouchMovement(): void {
    this.touchDirections.left = false;
    this.touchDirections.right = false;
    this.setTouchMovement(0);
  }

  clearTouch(): void {
    this.clearTouchMovement();
    this.touchInteract = false;
  }

  pressTouchInteract(): void {
    this.touchInteract = true;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) this.clearTouch();
  }

  destroy(): void {
    this.keyboard.removeCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    ]);
  }
}
