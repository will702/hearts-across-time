import type Phaser from 'phaser';

import { WorldObject, type StaticZone } from './WorldObject';
import type {
  WorldObjectDefinition,
  WorldRect,
  WorldState,
} from './worldTypes';

function rectCenter(rect: WorldRect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export class WorldFactory {
  constructor(private readonly scene: Phaser.Scene) {}

  createAll(
    definitions: readonly WorldObjectDefinition[],
    state: Readonly<WorldState>,
  ): WorldObject[] {
    return definitions.map(definition => this.create(definition, state));
  }

  create(definition: WorldObjectDefinition, state: Readonly<WorldState>): WorldObject {
    const visual = this.createVisual(definition);
    const sensor = this.createSensor(definition);
    const collider = definition.collider
      ? this.createStaticZone(definition.collider, definition.id, 'collider')
      : undefined;
    const shadow = this.createContactShadow(definition);
    const object = new WorldObject(definition, visual, sensor, collider, shadow);
    object.refresh(state);
    return object;
  }

  refresh(objects: readonly WorldObject[], state: Readonly<WorldState>): void {
    for (const object of objects) object.refresh(state);
  }

  destroy(objects: readonly WorldObject[]): void {
    for (const object of objects) object.destroy();
  }

  private createVisual(definition: WorldObjectDefinition): Phaser.GameObjects.Image {
    const visual = definition.visual;
    const asset = this.scene.textures.exists(visual.asset)
      ? visual.asset
      : visual.fallbackAsset ?? visual.asset;
    const image = this.scene.add.image(
      definition.position.x,
      definition.position.y,
      asset,
      visual.frame,
    );
    image.setOrigin(visual.origin?.x ?? 0.5, visual.origin?.y ?? 1);
    image.setDepth(definition.depth).setFlipX(Boolean(visual.flipX));
    if (visual.displayHeight) image.setScale(visual.displayHeight / image.height);
    return image;
  }

  private createContactShadow(definition: WorldObjectDefinition): Phaser.GameObjects.Ellipse | undefined {
    const shadow = definition.visual.contactShadow;
    if (!shadow) return undefined;
    return this.scene.add.ellipse(
      definition.position.x,
      definition.position.y - 1,
      shadow.width,
      shadow.height,
      0x090807,
      shadow.alpha ?? 0.3,
    ).setDepth(definition.depth - 1);
  }

  private createSensor(definition: WorldObjectDefinition): StaticZone {
    const sensor = definition.sensor;
    if (sensor.bounds) return this.createStaticZone(sensor.bounds, definition.id, 'sensor');

    const center = sensor.center ?? definition.position;
    const diameter = sensor.radius * 2;
    const zone = this.createStaticZone(
      { x: center.x - sensor.radius, y: center.y - sensor.radius, width: diameter, height: diameter },
      definition.id,
      'sensor',
    );
    zone.body.setCircle(sensor.radius);
    return zone;
  }

  private createStaticZone(rect: WorldRect, id: string, role: string): StaticZone {
    const center = rectCenter(rect);
    const zone = this.scene.add.zone(center.x, center.y, rect.width, rect.height);
    zone.setData({ id, role });
    this.scene.physics.add.existing(zone, true);
    return zone as StaticZone;
  }
}
