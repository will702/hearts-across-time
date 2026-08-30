export type DifferenceSpot = {
  readonly a: readonly [number, number];
  readonly b: readonly [number, number];
  readonly radius: number;
};

export const DIFFERENCE_SPOTS: readonly DifferenceSpot[] = [
  { a: [0.251, 0.290], b: [0.730, 0.290], radius: 18 },
  { a: [0.058, 0.462], b: [0.534, 0.462], radius: 20 },
  { a: [0.293, 0.407], b: [0.745, 0.407], radius: 20 },
  { a: [0.465, 0.391], b: [0.905, 0.391], radius: 22 },
  { a: [0.432, 0.547], b: [0.894, 0.547], radius: 20 },
  { a: [0.465, 0.544], b: [0.945, 0.544], radius: 21 },
  { a: [0.171, 0.706], b: [0.632, 0.706], radius: 19 },
  { a: [0.065, 0.785], b: [0.541, 0.785], radius: 22 },
  { a: [0.185, 0.775], b: [0.660, 0.775], radius: 21 },
  { a: [0.472, 0.703], b: [0.952, 0.742], radius: 22 },
];

export const CAT_SPOTS: readonly (readonly [number, number])[] = [
  [0.198, 0.240], [0.770, 0.287], [0.626, 0.304], [0.834, 0.317],
  [0.802, 0.435], [0.889, 0.501], [0.765, 0.506], [0.183, 0.518],
  [0.314, 0.615], [0.822, 0.632], [0.110, 0.643], [0.696, 0.670],
  [0.467, 0.707], [0.117, 0.725], [0.554, 0.746], [0.266, 0.800],
  [0.330, 0.810], [0.827, 0.823],
];

export const DINNER_PEOPLE = ['Adi', 'Budi', 'Citra', 'Dina'] as const;
export type DinnerPerson = (typeof DINNER_PEOPLE)[number];

export const DINNER_FOODS = ['steak', 'spaghetti', 'udang', 'nasi'] as const;
export type DinnerFood = (typeof DINNER_FOODS)[number];

export const CHEMISTRY_ORDER = ['watch', 'rose', 'gem'] as const;
export type ChemistryItem = (typeof CHEMISTRY_ORDER)[number];

function distance(x: number, y: number, nx: number, ny: number, width: number, height: number): number {
  return Math.hypot(x - nx * width, y - ny * height);
}

export function findDifferenceAt(
  x: number,
  y: number,
  width: number,
  height: number,
  found: readonly boolean[],
): number {
  let hit = -1;
  let best = Number.POSITIVE_INFINITY;
  DIFFERENCE_SPOTS.forEach((spot, index) => {
    if (found[index]) return;
    const d = Math.min(
      distance(x, y, spot.a[0], spot.a[1], width, height),
      distance(x, y, spot.b[0], spot.b[1], width, height),
    );
    if (d < spot.radius && d < best) {
      hit = index;
      best = d;
    }
  });
  return hit;
}

export function findCatAt(
  x: number,
  y: number,
  width: number,
  height: number,
  found: readonly boolean[],
  radius = 25,
): number {
  let hit = -1;
  let best = Number.POSITIVE_INFINITY;
  CAT_SPOTS.forEach((spot, index) => {
    if (found[index]) return;
    const d = distance(x, y, spot[0], spot[1], width, height);
    if (d < radius && d < best) {
      hit = index;
      best = d;
    }
  });
  return hit;
}

export function isDinnerValid(
  people: readonly (DinnerPerson | null)[],
  foods: readonly (DinnerFood | null)[],
): boolean {
  if (people.length !== 4 || foods.length !== 4 || people.some(value => value === null) || foods.some(value => value === null)) {
    return false;
  }

  const adi = people.indexOf('Adi');
  const budi = people.indexOf('Budi');
  const citra = people.indexOf('Citra');
  const dina = people.indexOf('Dina');
  const steak = foods.indexOf('steak');
  const spaghetti = foods.indexOf('spaghetti');

  return foods[0] === 'nasi'
    && citra === 3
    && (dina === 0 || dina === 3)
    && adi >= 0
    && steak >= 0
    && adi < steak
    && Math.abs(spaghetti - budi) === 1
    && foods[adi] !== 'udang'
    && foods[adi] !== 'nasi';
}

export function advanceChemistry(
  current: readonly ChemistryItem[],
  item: ChemistryItem,
): { order: ChemistryItem[]; correct: boolean; complete: boolean } {
  const expected = CHEMISTRY_ORDER[current.length];
  if (item !== expected || current.includes(item)) {
    return { order: [], correct: false, complete: false };
  }
  const order = [...current, item];
  return { order, correct: true, complete: order.length === CHEMISTRY_ORDER.length };
}

export function isBonusCode(value: string): boolean {
  return value.trim() === '2088';
}
