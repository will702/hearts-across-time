export function normalizedAngleDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 1;
  return Math.min(diff, 1 - diff);
}

export function gemAngleDistance(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

export function gemProjection(rx: number, ry: number): { scaleX: number; scaleY: number; rotation: number } {
  return {
    scaleX: 0.38 + 0.62 * Math.abs(Math.cos(ry)),
    scaleY: 0.5 + 0.5 * Math.abs(Math.cos(rx)),
    rotation: ry * 0.17,
  };
}

export function isGemAligned(
  rx: number,
  ry: number,
  targetRx: number,
  targetRy: number,
  assisted = false,
): boolean {
  const tolerance = assisted ? 0.36 : 0.2;
  return gemAngleDistance(rx, targetRx) <= tolerance
    && gemAngleDistance(ry, targetRy) <= tolerance;
}

export function pointInPolygon(poly: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = ((yi > y) !== (yj > y))
      && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSq));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

export function closestPolylineProgress(
  points: [number, number][],
  x: number,
  y: number,
): { distance: number; progress: number } {
  const lengths = points.slice(1).map(([px, py], index) => Math.hypot(
    px - points[index][0],
    py - points[index][1],
  ));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let bestDistance = Infinity;
  let bestAlong = 0;
  let walked = 0;

  lengths.forEach((length, index) => {
    const [x1, y1] = points[index];
    const [x2, y2] = points[index + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (length * length)));
    const distance = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestAlong = walked + length * t;
    }
    walked += length;
  });

  return { distance: bestDistance, progress: total === 0 ? 0 : bestAlong / total };
}
