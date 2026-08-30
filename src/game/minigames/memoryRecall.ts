export type MemoryRecallQuestion = {
  id: string;
  prompt: string;
  options: readonly [string, string, string];
  correctIndex: 0 | 1 | 2;
  successText: string;
};

export const MEMORY_RECALL_QUESTIONS: readonly MemoryRecallQuestion[] = [
  {
    id: 'watch-1944',
    prompt: 'Benda apa yang harus Elena pulihkan bersama Arthur pada babak 1944?',
    options: ['Arloji saku', 'Radio lapangan', 'Kamera tua'],
    correctIndex: 0,
    successText: 'Benar — detaknya menjadi penanda bahwa waktu belum menyerah.',
  },
  {
    id: 'first-era',
    prompt: 'Tahun berapa Elena pertama kali menemukan Arthur di tengah perang?',
    options: ['1968', '1999', '1944'],
    correctIndex: 2,
    successText: 'Benar — semuanya bermula pada tahun 1944.',
  },
  {
    id: 'rose-1968',
    prompt: 'Apa yang disusun kembali Elena di fasilitas Arthur pada tahun 1968?',
    options: ['Botol mawar abadi', 'Foto kenangan', 'Tabung patogen'],
    correctIndex: 0,
    successText: 'Benar — pecahan botol itu menyimpan mawar yang tak layu.',
  },
  {
    id: 'microfilm-1968',
    prompt: 'Media arsip apa yang disejajarkan Elena untuk membuka catatan tahun 1968?',
    options: ['Pita suara', 'Mikrofilm', 'Telegram'],
    correctIndex: 1,
    successText: 'Benar — lapisan mikrofilm menyembunyikan jejak penelitian Arthur.',
  },
  {
    id: 'diary-1968',
    prompt: 'Catatan pribadi apa yang harus dibaca Elena sebelum menemui Arthur pada 1968?',
    options: ['Buku harian Arthur', 'Laporan polisi', 'Surat komandan'],
    correctIndex: 0,
    successText: 'Benar — buku harian itu merekam kesepian Arthur selama puluhan tahun.',
  },
  {
    id: 'bunker-threat',
    prompt: 'Siapa yang mengepung tempat persembunyian Arthur ketika ia memilih menjadi buronan?',
    options: ['Pasukan medis', 'Polisi rahasia', 'Penjelajah waktu'],
    correctIndex: 1,
    successText: 'Benar — polisi rahasia memburu Arthur dan penelitiannya.',
  },
  {
    id: 'arthur-purpose',
    prompt: 'Apa tujuan utama penelitian Arthur yang terus dibawa melintasi zaman?',
    options: ['Membuat mesin perang', 'Menyempurnakan penawar', 'Menghapus semua ingatan'],
    correctIndex: 1,
    successText: 'Benar — Arthur berusaha mengubah racun menjadi penawar.',
  },
  {
    id: 'elena-mission',
    prompt: 'Mengapa Elena terus kembali menembus loop waktu?',
    options: ['Menyelamatkan Arthur dan masa depan', 'Mengumpulkan harta perang', 'Menguasai fasilitas militer'],
    correctIndex: 0,
    successText: 'Benar — setiap loop adalah kesempatan lain untuk menyelamatkan Arthur.',
  },
] as const;

// Urutan sengaja diacak, tetapi stabil agar reload pada loop yang sama tidak
// mengganti soal dan pemain tidak bisa melakukan reroll.
const QUESTION_ORDER = [3, 0, 6, 1, 7, 4, 2, 5] as const;

export function memoryRecallQuestionForLoop(loop: number): MemoryRecallQuestion {
  const safeLoop = Math.max(0, Math.floor(Number.isFinite(loop) ? loop : 0));
  return MEMORY_RECALL_QUESTIONS[QUESTION_ORDER[safeLoop % QUESTION_ORDER.length]];
}
