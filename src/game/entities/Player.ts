import Phaser from 'phaser';

import type { InputSnapshot } from '../systems/InputSystem';
import { shouldRun } from '../systems/replayRules';
import type { SurfaceMaterial } from '../world/worldTypes';

const WALK_SPEED = 150;
const RUN_SPEED = 262;
const ACCELERATION = 900;
const DECELERATION = 1400;
const STEP_DISTANCE = 30;
const WALK_ANIMATION = 'elena-walk-neutral';

export interface PlayerOptions {
  loop?: number;
  reduceMotion?: boolean;
  onStep?: (material: SurfaceMaterial) => void;
  surfaceAt?: (x: number, y: number) => SurfaceMaterial;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly shadow: Phaser.GameObjects.Ellipse;

  private reduceMotion: boolean;
  private readonly hasWalkSheet: boolean;
  private readonly loop: number;
  private stepDistance = 0;
  private groundY: number;
  private readonly onStep?: PlayerOptions['onStep'];
  private readonly surfaceAt?: PlayerOptions['surfaceAt'];

  constructor(scene: Phaser.Scene, x: number, y: number, options: PlayerOptions = {}) {
    const hasWalkSheet = scene.textures.exists('elena');
    super(scene, x, y, hasWalkSheet ? 'elena' : 'elena-fallback', 0);

    this.hasWalkSheet = hasWalkSheet;
    this.loop = Math.max(0, Math.floor(options.loop ?? 0));
    this.reduceMotion = Boolean(options.reduceMotion);
    this.onStep = options.onStep;
    this.surfaceAt = options.surfaceAt;
    this.groundY = y;

    this.shadow = scene.add.ellipse(x, y + 3, 52, 10, 0x0a0806, 0.28).setDepth(y - 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1).setDisplaySize(80, 112).setDepth(y).setCollideWorldBounds(true);

    const body = this.arcadeBody;
    const footWidth = 24 / Math.abs(this.scaleX);
    const footHeight = 12 / Math.abs(this.scaleY);
    body.setSize(footWidth, footHeight, false);
    body.setOffset((this.width - footWidth) / 2, this.height - footHeight);
    body.setAllowGravity(true);
    body.setAllowRotation(false);
    body.setBounce(0);
    body.setMaxVelocity(RUN_SPEED, 600);

    this.ensureWalkAnimation();
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  setReduceMotion(value: boolean): void {
    this.reduceMotion = value;
  }

  updatePlayer(input: InputSnapshot, deltaMs: number): void {
    this.reduceMotion = Boolean(this.scene.registry.get('reduceMotion'));
    const body = this.arcadeBody;
    const dt = Math.min(Math.max(deltaMs / 1000, 0), 0.05);
    const blocked = (input.move < 0 && body.blocked.left) || (input.move > 0 && body.blocked.right);
    const move = blocked ? 0 : input.move;
    const maxSpeed = shouldRun(this.loop, input.sprint) ? RUN_SPEED : WALK_SPEED;

    body.setMaxVelocity(maxSpeed, 600);
    if (move) {
      body.setDragX(0);
      body.setAccelerationX(move * ACCELERATION);
      this.setFlipX(move < 0);
    } else {
      body.setAccelerationX(0);
      body.setDragX(DECELERATION);
      if (blocked) body.setVelocityX(0);
    }

    const grounded = body.blocked.down || body.touching.down;
    const velocity = blocked ? 0 : body.velocity.x;
    const moving = grounded && Math.abs(velocity) > 8;
    this.updateWalkAnimation(moving, velocity);
    this.updateSteps(moving, velocity, dt);

    if (grounded) this.groundY = body.bottom;
    this.setDepth(body.bottom);
    this.shadow.setPosition(this.x, this.groundY + 3).setDepth(body.bottom - 1);
    this.shadow.setAlpha(grounded ? 0.28 : 0.12);
    this.shadow.setScale(this.reduceMotion || !moving ? 1 : 0.92 + Math.min(Math.abs(velocity) / RUN_SPEED, 1) * 0.08, 1);
  }

  override destroy(fromScene?: boolean): void {
    this.shadow.destroy();
    super.destroy(fromScene);
  }

  private ensureWalkAnimation(): void {
    if (!this.hasWalkSheet) return;
    if (this.scene.anims.exists(WALK_ANIMATION)) return;
    this.scene.anims.create({
      key: WALK_ANIMATION,
      frames: this.scene.anims.generateFrameNumbers('elena', { frames: [1, 2, 3, 2] }),
      frameRate: 8,
      repeat: -1,
    });
  }

  private updateWalkAnimation(moving: boolean, velocity: number): void {
    if (!moving || !this.hasWalkSheet) {
      this.anims.stop();
      this.setFrame(0);
      return;
    }
    if (this.reduceMotion) {
      this.anims.stop();
      this.setFrame(2);
      return;
    }
    this.play(WALK_ANIMATION, true);
    this.anims.timeScale = Phaser.Math.Clamp(Math.abs(velocity) / WALK_SPEED, 0.6, 1.5);
  }

  private updateSteps(moving: boolean, velocity: number, dt: number): void {
    if (!moving) {
      this.stepDistance = 0;
      return;
    }
    this.stepDistance += Math.abs(velocity) * dt;
    if (this.stepDistance < STEP_DISTANCE) return;
    this.stepDistance %= STEP_DISTANCE;
    this.onStep?.(this.surfaceAt?.(this.x, this.arcadeBody.bottom) ?? 'unknown');
  }
}
