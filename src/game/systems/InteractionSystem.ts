import type { InputSnapshot } from './InputSystem';
import { isWorldObjectActive, type WorldObject } from '../world/WorldObject';
import type {
  WorldAction,
  WorldObjectDefinition,
  WorldPoint,
  WorldState,
} from '../world/worldTypes';
import { pointInRect } from './SurfaceSystem';

export function distanceBetween(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function sensorCenter(definition: WorldObjectDefinition): WorldPoint {
  const sensor = definition.sensor;
  if (sensor.center) return sensor.center;
  if (sensor.bounds) {
    return {
      x: sensor.bounds.x + sensor.bounds.width / 2,
      y: sensor.bounds.y + sensor.bounds.height / 2,
    };
  }
  return definition.position;
}

export function interactionDistance(
  definition: WorldObjectDefinition,
  playerPosition: WorldPoint,
): number {
  return distanceBetween(playerPosition, sensorCenter(definition));
}

export function isInteractionEligible(
  definition: WorldObjectDefinition,
  state: Readonly<WorldState>,
  playerPosition: WorldPoint,
): boolean {
  if (!isWorldObjectActive(definition, state)) return false;
  if (definition.sensor.bounds) return pointInRect(playerPosition, definition.sensor.bounds);
  return interactionDistance(definition, playerPosition) <= definition.sensor.radius;
}

export function selectInteraction(
  definitions: readonly WorldObjectDefinition[],
  state: Readonly<WorldState>,
  playerPosition: WorldPoint,
): WorldObjectDefinition | undefined {
  return definitions
    .filter(definition => isInteractionEligible(definition, state, playerPosition))
    .sort((a, b) => Number(Boolean(b.auto)) - Number(Boolean(a.auto))
      || b.priority - a.priority
      || interactionDistance(a, playerPosition) - interactionDistance(b, playerPosition))[0];
}

export class InteractionSystem {
  active?: WorldObjectDefinition;

  constructor(private objects: readonly WorldObject[] = []) {}

  setObjects(objects: readonly WorldObject[]): void {
    this.objects = objects;
    this.active = undefined;
  }

  update(
    state: Readonly<WorldState>,
    playerPosition: WorldPoint,
    input: InputSnapshot,
  ): WorldAction | undefined {
    for (const object of this.objects) object.refresh(state);
    const selected = selectInteraction(
      this.objects.map(object => object.definition),
      state,
      playerPosition,
    );
    this.active = selected?.auto ? undefined : selected;
    if (!selected || (!selected.auto && !input.interact)) return undefined;
    return selected.action;
  }
}
