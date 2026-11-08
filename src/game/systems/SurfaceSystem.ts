import type Phaser from 'phaser';

import type { Player } from '../entities/Player';
import type { WorldObject, StaticZone } from '../world/WorldObject';
import type {
  SurfaceMaterial,
  WorldDefinition,
  WorldPoint,
  WorldRect,
  WorldSurfaceDefinition,
} from '../world/worldTypes';

export function pointInRect(point: WorldPoint, rect: WorldRect): boolean {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height;
}

export function selectSurface(
  surfaces: readonly WorldSurfaceDefinition[],
  point: WorldPoint,
): WorldSurfaceDefinition | undefined {
  return surfaces
    .filter(surface => pointInRect(point, surface.bounds))
    .sort((a, b) => Math.abs(point.y - a.bounds.y) - Math.abs(point.y - b.bounds.y))[0];
}

export function selectSurfaceMaterial(
  surfaces: readonly WorldSurfaceDefinition[],
  point: WorldPoint,
  fallback: SurfaceMaterial = 'unknown',
): SurfaceMaterial {
  return selectSurface(surfaces, point)?.material ?? fallback;
}

export class SurfaceSystem {
  private zones: StaticZone[] = [];
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private surfaces: readonly WorldSurfaceDefinition[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  load(world: WorldDefinition, player: Player, objects: readonly WorldObject[]): void {
    this.clear();
    this.surfaces = world.surfaces;
    this.zones = world.surfaces.map(surface => this.createZone(surface));
    for (const zone of this.zones) this.colliders.push(this.scene.physics.add.collider(player, zone));
    for (const object of objects) {
      if (object.collider) this.colliders.push(this.scene.physics.add.collider(player, object.collider));
    }
  }

  materialAt(x: number, y: number, fallback: SurfaceMaterial = 'unknown'): SurfaceMaterial {
    return selectSurfaceMaterial(this.surfaces, { x, y }, fallback);
  }

  clear(): void {
    for (const collider of this.colliders) collider.destroy();
    for (const zone of this.zones) zone.destroy();
    this.colliders = [];
    this.zones = [];
    this.surfaces = [];
  }

  destroy(): void {
    this.clear();
  }

  private createZone(surface: WorldSurfaceDefinition): StaticZone {
    const rect = surface.bounds;
    const zone = this.scene.add.zone(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width,
      rect.height,
    );
    zone.setData({ id: surface.id, role: surface.type, material: surface.material });
    this.scene.physics.add.existing(zone, true);
    return zone as StaticZone;
  }
}
