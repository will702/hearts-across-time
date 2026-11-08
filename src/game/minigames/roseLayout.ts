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

export const ROSE_PIECES_DEF: RosePieceDefinition[] = [
  { poly: [[0, 0], [82, 0], [108, 48], [55, 73], [0, 54]] },
  { poly: [[82, 0], [168, 0], [183, 72], [126, 108], [108, 48]] },
  { poly: [[168, 0], [250, 0], [250, 66], [183, 72]] },
  { poly: [[250, 66], [250, 150], [178, 144], [112, 169], [126, 108], [183, 72]] },
  { poly: [[250, 150], [250, 214], [162, 214], [112, 169], [178, 144]] },
  { poly: [[162, 214], [72, 214], [58, 132], [126, 108], [112, 169]] },
  { poly: [[72, 214], [0, 214], [0, 145], [58, 132]] },
  { poly: [[0, 145], [0, 54], [55, 73], [108, 48], [126, 108], [58, 132]] },
];

const HOME_ZONES = [
  { left: 90, right: 330, top: 125, bottom: 370 },
  { left: 630, right: 870, top: 125, bottom: 370 },
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
export function randomRoseHomes(random: () => number = Math.random): RoseHome[] {
  const homes: RoseHome[] = new Array(ROSE_PIECES_DEF.length);
  const sideRows = PACKED_ROWS.map(rows => rows.map(row => [...row]));
  if (random() < 0.5) sideRows.reverse();

  sideRows.forEach((rows, sideIndex) => {
    if (random() < 0.5) rows.reverse();
    const zone = HOME_ZONES[sideIndex];
    const rowMetrics = rows.map(row => ({
      row,
      width: row.reduce<number>((sum, index) => {
        const bounds = polygonBounds(ROSE_PIECES_DEF[index].poly);
        return sum + bounds.right - bounds.left;
      }, 0),
      height: Math.max(...row.map((index) => {
        const bounds = polygonBounds(ROSE_PIECES_DEF[index].poly);
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
        const poly = ROSE_PIECES_DEF[index].poly;
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
