export const LORE_LINES = {
  lore_crate: [
    '[ Peti obat tergeletak — morfin habis, perban berlumpur, satu ampul tanpa label. ]',
    '[ Goresan pensil di tutupnya: "untuk asisten lab — jangan sampai kau pakai sendiri." ]',
  ],
  lore_flare: [
    '[ Sisa suar Jerman — pemantiknya masih hangat. Parit ini bicara lewat cahaya merah tiap malam. ]',
    '[ Elena menghitung: suar bertahan 40 detik. Cukup untuk satu doa — tidak cukup untuk pulang. ]',
  ],
  lore_photo: [
    '[ Foto sobek di bawah mug enamel: dua sosok muda di parit — hanya separuh wajah tersisa. ]',
    '[ Di baliknya, tinta pudar: "Andai waktu bisa kuputar... aku akan memilih kalimat yang lebih hangat." ]',
  ],
  lore_tape: [
    '[ Pita mainframe berlabel "АРТУР-1": empat belas ribu jam data kriobiologi. ]',
    '[ Catatan tangan di selotipnya: "impedansi katup kuperbaiki tahun \'72 — demi dia." ]',
  ],
  lore_clip: [
    '[ Papan jepit berembun: log pemeriksaan kapsul, 1999. Kolom KONDISI diisi tangan yang sama selama 31 tahun: STABIL. ]',
    '[ Baris terbawah, tinta yang lebih baru: "Dia datang lagi. Hari ini." ]',
  ],
} as const;

export type LoreId = keyof typeof LORE_LINES;

export const LORE_IDS = Object.keys(LORE_LINES) as LoreId[];

export const LORE_COMPLETION_TEXT = '✦ Kelima jejak kisah ditemukan — kau membaca hidup Arthur sampai habis.';

export function isLoreId(value: string): value is LoreId {
  return Object.prototype.hasOwnProperty.call(LORE_LINES, value);
}

export function allLoreInspected(
  inspected: Readonly<Record<string, boolean | 1 | undefined>>,
): boolean {
  return LORE_IDS.every(id => Boolean(inspected[id]));
}

export function recordLoreInspection(
  inspected: Readonly<Record<string, boolean | 1 | undefined>>,
  id: LoreId,
  completionAlreadyShown: boolean,
): { inspected: Record<string, 1>; completedNow: boolean } {
  const next: Record<string, 1> = {};
  Object.entries(inspected).forEach(([key, value]) => {
    if (value) next[key] = 1;
  });
  next[id] = 1;
  return {
    inspected: next,
    completedNow: !completionAlreadyShown && allLoreInspected(next),
  };
}
