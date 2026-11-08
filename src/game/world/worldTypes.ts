export type WorldObjectType = 'watch' | 'challenge' | 'lore' | 'exit' | 'puzzle';

export type SurfaceMaterial = 'mud' | 'wood' | 'metal' | 'concrete' | 'unknown';

export interface WorldPoint {
  x: number;
  y: number;
}

export interface WorldRect extends WorldPoint {
  width: number;
  height: number;
}

export interface WorldVisualDefinition {
  asset: string;
  fallbackAsset?: string;
  frame?: string | number;
  displayHeight?: number;
  origin?: WorldPoint;
  flipX?: boolean;
}

export interface WorldSensorDefinition {
  radius: number;
  center?: WorldPoint;
  bounds?: WorldRect;
}

export type WorldAction =
  | { type: 'watchrepair' }
  | { type: 'challenge'; era: '1944' | '1968' | '1999' }
  | { type: 'puzzle'; id: string }
  | { type: 'lore'; id: string }
  | { type: 'dialog'; node: string };

export interface WorldPrompt {
  keyboard: string;
  touch: string;
}

export interface WorldState {
  watchRepaired?: boolean;
  roseRepaired?: boolean;
  gemAligned?: boolean;
  photoRepaired?: boolean;
  challenges: Readonly<Partial<Record<'1944' | '1968' | '1999', 'empathy' | 'logic' | boolean | null>>>;
  inspected: Readonly<Record<string, boolean | 1 | undefined>>;
  flags?: Readonly<Record<string, boolean | 1 | undefined>>;
}

export type WorldCondition = (state: Readonly<WorldState>) => boolean;

export interface WorldObjectDefinition {
  id: string;
  type: WorldObjectType;
  position: WorldPoint;
  visual: WorldVisualDefinition;
  depth: number;
  collider?: WorldRect;
  sensor: WorldSensorDefinition;
  action: WorldAction;
  prompt?: WorldPrompt;
  priority: number;
  auto?: boolean;
  enabled: WorldCondition;
  completed: WorldCondition;
  surface: SurfaceMaterial;
  saveKey: string;
  resumeX?: number;
}

export interface WorldSurfaceDefinition {
  id: string;
  type: 'ground' | 'obstacle';
  bounds: WorldRect;
  material: SurfaceMaterial;
}

export interface WorldDefinition {
  id: string;
  width: number;
  height: number;
  groundY: number;
  spawn: WorldPoint;
  defaultSurface: SurfaceMaterial;
  surfaces: readonly WorldSurfaceDefinition[];
  objects: readonly WorldObjectDefinition[];
}
