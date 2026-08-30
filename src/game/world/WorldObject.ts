import type Phaser from 'phaser';

import type { WorldObjectDefinition, WorldState } from './worldTypes';

export type StaticZone = Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.StaticBody };

export function isWorldObjectActive(
  definition: WorldObjectDefinition,
  state: Readonly<WorldState>,
): boolean {
  return definition.enabled(state) && !definition.completed(state);
}

export class WorldObject {
  readonly definition: WorldObjectDefinition;
  readonly visual: Phaser.GameObjects.Image;
  readonly shadow?: Phaser.GameObjects.Ellipse;
  readonly collider?: StaticZone;
  readonly sensor: StaticZone;

  constructor(
    definition: WorldObjectDefinition,
    visual: Phaser.GameObjects.Image,
    sensor: StaticZone,
    collider?: StaticZone,
    shadow?: Phaser.GameObjects.Ellipse,
  ) {
    this.definition = definition;
    this.visual = visual;
    this.sensor = sensor;
    this.collider = collider;
    this.shadow = shadow;
  }

  refresh(state: Readonly<WorldState>): boolean {
    const active = isWorldObjectActive(this.definition, state);
    this.visual.setActive(active).setVisible(active);
    this.shadow?.setActive(active).setVisible(active);
    this.sensor.body.enable = active;
    if (this.collider) this.collider.body.enable = active;
    return active;
  }

  destroy(): void {
    this.visual.destroy();
    this.shadow?.destroy();
    this.collider?.destroy();
    this.sensor.destroy();
  }
}
