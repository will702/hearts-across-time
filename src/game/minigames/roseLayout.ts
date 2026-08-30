export type RosePoint = [number, number];
export type RosePolygon = RosePoint[];
export type RoseHome = [number, number];

export type RosePieceDefinition = {
  poly: RosePolygon;
};

export type RoseRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export const ROSE_TARGET = { x: 355, y: 148, w: 250, h: 214 } as const;
export const ROSE_SOURCE_CROP = { x: 330, y: 250, w: 1640, h: 1220 } as const;
export const ROSE_SOURCE_FRAME = 'hat-rose-bottle-region';

const ROSE_LAYOUT_NODES: RosePoint[] = [
  [0, 0], [82, 0], [168, 0], [250, 0],
  [250, 66], [250, 150], [250, 214], [162, 214],
  [72, 214], [0, 214], [0, 145], [0, 54],
  [108, 48], [55, 73], [183, 72], [126, 108],
  [178, 144], [112, 169], [58, 132],
];

const ROSE_PIECE_NODE_IDS = [
  [0, 1, 12, 13, 11],
  [1, 2, 14, 15, 12],
  [2, 3, 4, 14],
  [4, 5, 16, 17, 15, 14],
  [5, 6, 7, 17, 16],
  [7, 8, 18, 15, 17],
  [8, 9, 10, 18],
  [10, 11, 13, 12, 15, 18],
] as const;

const FIXED_NODE_IDS = new Set([0, 3, 6, 9]);
const TOP_NODE_IDS = new Set([1, 2]);
const RIGHT_NODE_IDS = new Set([4, 5]);
const BOTTOM_NODE_IDS = new Set([7, 8]);
const LEFT_NODE_IDS = new Set([10, 11]);

/** Jumlah pola yang disimpan di cache tekstur sebelum berulang. */
export const ROSE_LAYOUT_VARIANT_COUNT = 12;

function layoutNoise(variant: number, nodeIndex: number, axis: number): number {
  let value = Math.imul(variant + 17, 0x45d9f3b)
    ^ Math.imul(nodeIndex + 31, 0x27d4eb2d)
    ^ Math.imul(axis + 7, 0x165667b1);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return ((value >>> 0) / 0xffff_ffff) * 2 - 1;
}

function roseNodeForVariant(point: RosePoint, nodeIndex: number, variant: number): RosePoint {
  if (variant === 0 || FIXED_NODE_IDS.has(nodeIndex)) return [...point];

  const xShift = Math.round(layoutNoise(variant, nodeIndex, 0) * 12);
  const yShift = Math.round(layoutNoise(variant, nodeIndex, 1) * 12);
  if (TOP_NODE_IDS.has(nodeIndex) || BOTTOM_NODE_IDS.has(nodeIndex)) {
    return [point[0] + xShift, point[1]];
  }
  if (RIGHT_NODE_IDS.has(nodeIndex) || LEFT_NODE_IDS.has(nodeIndex)) {
    return [point[0], point[1] + yShift];
  }
  return [point[0] + xShift, point[1] + yShift];
}

/**
 * Menghasilkan retakan deterministik dari nomor loop. Semua keping memakai
 * simpul bersama yang sama, sehingga bentuk berubah tanpa menciptakan celah.
 */
export function rosePiecesForLoop(loop: number): RosePieceDefinition[] {
  const safeLoop = Math.max(0, Math.floor(Number.isFinite(loop) ? loop : 0));
  const variant = safeLoop % ROSE_LAYOUT_VARIANT_COUNT;
  const nodes = ROSE_LAYOUT_NODES.map((point, index) => roseNodeForVariant(point, index, variant));
  return ROSE_PIECE_NODE_IDS.map(nodeIds => ({
    poly: nodeIds.map(nodeId => [...nodes[nodeId]] as RosePoint),
  }));
}

export const ROSE_PIECES_DEF: RosePieceDefinition[] = rosePiecesForLoop(0);

const HOME_ZONES = [
  { left: 70, right: 340, top: 115, bottom: 385 },
  { left: 620, right: 890, top: 115, bottom: 385 },
] as const;

const HOME_GAP = 7;

function polygonBounds(poly: RosePolygon): RoseRect {
  const xs = poly.map(([x]) => x);
  const ys = poly.map(([, y]) => y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

export function rosePieceScreenBounds(poly: RosePolygon, home: RoseHome): RoseRect {
  const bounds = polygonBounds(poly);
  return {
    left: ROSE_TARGET.x + home[0] + bounds.left,
    right: ROSE_TARGET.x + home[0] + bounds.right,
    top: ROSE_TARGET.y + home[1] + bounds.top,
    bottom: ROSE_TARGET.y + home[1] + bounds.bottom,
  };
}

export function roseRectsOverlap(a: RoseRect, b: RoseRect, gap = 0): boolean {
  return a.left < b.right + gap
    && a.right + gap > b.left
    && a.top < b.bottom + gap
    && a.bottom + gap > b.top;
}

function homeFromTopLeft(poly: RosePolygon, left: number, top: number): RoseHome {
  const bounds = polygonBounds(poly);
  return [left - ROSE_TARGET.x - bounds.left, top - ROSE_TARGET.y - bounds.top];
}

const PACKED_ROWS = [
  [[7, 1], [0, 5]],
  [[3, 2], [4, 6]],
] as const;

/**
 * Mengikuti tata letak legacy: empat keping di tiap sisi, urutan dan posisinya
 * diacak setiap permainan. Seluruh susunan diulang bila satu keping tidak
 * mendapat rumah, sehingga hasil akhirnya tidak pernah bertumpuk.
 */
export function randomRoseHomes(
  random: () => number = Math.random,
  pieces: readonly RosePieceDefinition[] = ROSE_PIECES_DEF,
): RoseHome[] {
  const homes: RoseHome[] = new Array(pieces.length);
  const sideRows = PACKED_ROWS.map(rows => rows.map(row => [...row]));
  if (random() < 0.5) sideRows.reverse();

  sideRows.forEach((rows, sideIndex) => {
    if (random() < 0.5) rows.reverse();
    const zone = HOME_ZONES[sideIndex];
    const rowMetrics = rows.map(row => ({
      row,
      width: row.reduce<number>((sum, index) => {
        const bounds = polygonBounds(pieces[index].poly);
        return sum + bounds.right - bounds.left;
      }, 0),
      height: Math.max(...row.map((index) => {
        const bounds = polygonBounds(pieces[index].poly);
        return bounds.bottom - bounds.top;
      })),
    }));
    const zoneWidth = zone.right - zone.left;
    const zoneHeight = zone.bottom - zone.top;
    const rowGap = HOME_GAP + random() * 8;
    const packedHeight = rowMetrics.reduce((sum, row) => sum + row.height, 0) + rowGap;
    let top = zone.top + random() * Math.max(0, zoneHeight - packedHeight);

    rowMetrics.forEach((metrics) => {
      const row = random() < 0.5 ? [...metrics.row].reverse() : metrics.row;
      const availableGap = Math.max(HOME_GAP, zoneWidth - metrics.width);
      const pieceGap = HOME_GAP + random() * Math.max(0, availableGap - HOME_GAP);
      const packedWidth = metrics.width + pieceGap;
      let left = zone.left + random() * Math.max(0, zoneWidth - packedWidth);

      row.forEach((index) => {
        const poly = pieces[index].poly;
        const bounds = polygonBounds(poly);
        const width = bounds.right - bounds.left;
        const height = bounds.bottom - bounds.top;
        const pieceTop = top + random() * Math.max(0, metrics.height - height);
        homes[index] = homeFromTopLeft(poly, left, pieceTop);
        left += width + pieceGap;
      });
      top += metrics.height + rowGap;
    });
  });

  return homes;
}
