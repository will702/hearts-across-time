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
const SPRITE_FEET_ORIGIN_Y = 203 / 210; // 0.9667 to eliminate 7px transparent padding at bottom

export interface PlayerOptions {
  loop?: number;
  reduceMotion?: boolean;
  onStep?: (material: SurfaceMaterial) => void;
  surfaceAt?: (x: number, y: number) => SurfaceMaterial;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly shadow: Phaser.GameObjects.Ellipse;

  private reduceMotion: boolean;
  private readonly idleTexture: string;
  private readonly walkTexture?: string;
  private readonly loop: number;
  private stepDistance = 0;
  private groundY: number;
  private readonly onStep?: PlayerOptions['onStep'];
  private readonly surfaceAt?: PlayerOptions['surfaceAt'];
  private stepParticleGraphics?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, options: PlayerOptions = {}) {
    const idleTexture = scene.textures.exists('elena') ? 'elena' : 'elena-fallback';
    const walkTexture = scene.textures.exists('elena-walk')
      ? 'elena-walk'
      : scene.textures.exists('elena') ? 'elena' : undefined;
    super(scene, x, y, idleTexture, 0);

    this.idleTexture = idleTexture;
    this.walkTexture = walkTexture;
    this.loop = Math.max(0, Math.floor(options.loop ?? 0));
    this.reduceMotion = Boolean(options.reduceMotion);
    this.onStep = options.onStep;
    this.surfaceAt = options.surfaceAt;
    this.groundY = y;

    // Contact shadow resting directly on the ground
    this.shadow = scene.add.ellipse(x, y, 48, 8, 0x0a0806, 0.35).setDepth(y - 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, SPRITE_FEET_ORIGIN_Y)
      .setDisplaySize(80, 112)
      .setDepth(y)
      .setCollideWorldBounds(true);

    const body = this.arcadeBody;
    const footWidth = 24 / Math.abs(this.scaleX);
    const footHeight = 10 / Math.abs(this.scaleY);
    body.setSize(footWidth, footHeight, false);
    body.setOffset((this.width - footWidth) / 2, 203 - footHeight);
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

    // Stride-based shadow pulsation
    const strideScale = moving && !this.reduceMotion
      ? 1 + 0.1 * Math.sin((this.stepDistance / STEP_DISTANCE) * Math.PI * 2)
      : 1;

    this.shadow.setPosition(this.x, this.groundY).setDepth(body.bottom - 1);
    this.shadow.setAlpha(grounded ? 0.35 : 0.14);
    this.shadow.setScale(
      (this.reduceMotion || !moving ? 1 : 0.94 + Math.min(Math.abs(velocity) / RUN_SPEED, 1) * 0.08) * strideScale,
      strideScale,
    );
  }

  override destroy(fromScene?: boolean): void {
    this.shadow.destroy();
    this.stepParticleGraphics?.destroy();
    super.destroy(fromScene);
  }

  private ensureWalkAnimation(): void {
    if (!this.walkTexture) return;
    if (this.scene.anims.exists(WALK_ANIMATION)) return;
    this.scene.anims.create({
      key: WALK_ANIMATION,
      frames: this.scene.anims.generateFrameNumbers(this.walkTexture, this.walkTexture === 'elena-walk'
        ? { start: 0, end: 12 }
        : { frames: [1, 2, 3, 2] }),
      duration: 650,
      repeat: -1,
    });
  }

  private updateWalkAnimation(moving: boolean, velocity: number): void {
    if (!moving || !this.walkTexture) {
      this.anims.stop();
      this.setTexture(this.idleTexture, 0);
      return;
    }
    if (this.reduceMotion) {
      this.anims.stop();
      this.setTexture(this.idleTexture, this.idleTexture === 'elena' ? 2 : 0);
      return;
    }
    this.play(WALK_ANIMATION, true);
    this.anims.timeScale = Phaser.Math.Clamp(Math.abs(velocity) / WALK_SPEED, 0.7, 1.75);
  }

  private updateSteps(moving: boolean, velocity: number, dt: number): void {
    if (!moving) {
      this.stepDistance = 0;
      return;
    }
    this.stepDistance += Math.abs(velocity) * dt;
    if (this.stepDistance < STEP_DISTANCE) return;
    this.stepDistance %= STEP_DISTANCE;
    const material = this.surfaceAt?.(this.x, this.arcadeBody.bottom) ?? 'unknown';
    this.onStep?.(material);
    this.spawnFootstepParticle(material);
  }

  private spawnFootstepParticle(material: SurfaceMaterial): void {
    if (this.reduceMotion || !this.scene?.sys) return;
    const footX = this.x + (this.flipX ? 6 : -6);
    const footY = this.groundY - 1;

    let color = 0x5a412b; // mud
    if (material === 'metal') color = 0xa5cce0;
    else if (material === 'concrete') color = 0x8a7b6c;
    else if (material === 'wood') color = 0x6e4e32;

    const particle = this.scene.add.graphics().setDepth(this.groundY - 1);
    particle.fillStyle(color, 0.6);
    particle.fillCircle(0, 0, 2);
    particle.setPosition(footX, footY);

    this.scene.tweens.add({
      targets: particle,
      x: footX + (this.flipX ? 8 : -8) + (Math.random() - 0.5) * 4,
      y: footY - 3 - Math.random() * 4,
      alpha: 0,
      scaleX: 0.4,
      scaleY: 0.4,
      duration: 260,
      ease: 'Sine.easeOut',
      onComplete: () => particle.destroy(),
    });
  }
}
