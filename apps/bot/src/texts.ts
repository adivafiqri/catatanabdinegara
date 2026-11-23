// Semua teks bot. Nada "kakak tingkat": santai, sopan, jelas. Format HTML Telegram.
// Teks yang bisa diubah moderator ada di DEFAULT_TEXTS; sisanya teks sistem.

import type { ViolationReason } from "./moderation/detect.js";

export const DEFAULT_TEXTS = {
  welcomeText: [
    "Halo {nama}, selamat datang di grup belajar <b>Catatan Abdi Negara</b>!",
    "",
    "Biar grup tetap nyaman:",
    "• Tanya-jawab seputar SKD & sekolah kedinasan",
    "• Dilarang promosi, link luar, dan undangan grup lain",
    "• Admin <b>tidak pernah</b> minta transfer lewat chat pribadi",
    "",
    "Tryout gratis: {tryout_url}",
    "",
    "Tekan tombol di bawah dalam {menit} menit supaya bisa mulai ngobrol, ya.",
  ].join("\n"),
  rulesText: [
    "<b>Aturan grup Catatan Abdi Negara</b>",
    "",
    '1. Sopan dan saling bantu. Pertanyaan "receh" pun boleh.',
    "2. Fokus ke persiapan SKD dan sekolah kedinasan.",
    "3. Dilarang promosi, jualan, link luar, dan undangan grup lain.",
    '4. Dilarang membagikan "bocoran" atau klaim "dijamin lulus". Itu penipuan.',
    "5. Anggota baru (24 jam pertama) belum bisa kirim link dan media.",
    "6. Pelanggaran: peringatan 1 → peringatan 2 → dibisukan 24 jam → diputuskan admin.",
    "",
    "⚠️ Admin <b>tidak pernah</b> meminta transfer atau data pribadi lewat chat pribadi.",
    "",
    "<i>Akun pribadi edukasi, bukan kanal resmi instansi mana pun.</i>",
  ].join("\n"),
  materiText: [
    "<b>Materi SKD</b> (110 soal, 100 menit)",
    "",
    "<b>TWK</b> · 30 soal: nasionalisme, integritas, bela negara, pilar negara (Pancasila, UUD 1945, NKRI, Bhinneka Tunggal Ika), bahasa negara.",
    "<b>TIU</b> · 35 soal: verbal (analogi, silogisme), numerik (deret, soal cerita, hitung cepat), figural (pola gambar).",
    "<b>TKP</b> · 45 soal: pelayanan publik, jejaring kerja, sosial budaya, teknologi informasi, profesionalisme.",
    "",
    "Angka di atas mengikuti aturan seleksi terakhir. Selalu cek ulang pengumuman resmi tiap tahun.",
  ].join("\n"),
  jadwalText: [
    "<b>Jadwal</b>",
    "",
    "Pendaftaran sekolah kedinasan biasanya dibuka sekitar Agustus lewat SSCASN BKN (sscasn.bkn.go.id). Tanggal pasti tunggu pengumuman resmi, ya.",
    "",
    "Jadwal tryout serentak akan diumumkan di sini.",
  ].join("\n"),
};

export const T = {
  verifyButton: "✅ Saya bukan bot",
  verifyOnlyForTarget: "Tombol ini khusus untuk anggota baru yang disapa, ya.",
  verifyNotPending: "Kamu sudah terverifikasi, atau waktunya sudah habis.",
  verifyOk: "Terverifikasi. Selamat belajar!",
  verifyRetry: "Telegram sedang sibuk. Coba tekan tombolnya lagi sebentar lagi, ya.",
  verifiedWelcome:
    "Selamat bergabung, {nama}! Kenalan dulu boleh, atau langsung tanya. Aturan grup: /aturan",
  tryout: "Tryout SKD gratis, format mirip CAT, 110 soal / 100 menit:\n{tryout_url}",
  start: [
    "Halo! Aku bot grup <b>Catatan Abdi Negara</b>.",
    "",
    "Perintah yang bisa dipakai:",
    "/tryout · link tryout gratis",
    "/materi · daftar materi SKD",
    "/jadwal · jadwal seleksi & tryout",
    "/aturan · aturan grup",
    "",
    "⚠️ Admin tidak pernah meminta transfer lewat chat pribadi.",
  ].join("\n"),
  antiFraud:
    '⚠️ <b>Hati-hati penipuan.</b> Admin Catatan Abdi Negara <b>tidak pernah</b> meminta transfer, kode OTP, atau data pribadi lewat chat pribadi. Tidak ada "jalur khusus" atau "bocoran soal". Kalau ada yang menawarkan, laporkan ke admin.',

  // Pemberitahuan pelanggaran
  reason: {
    invite: "undangan grup lain belum boleh di sini",
    link: "link luar belum boleh di sini",
    banned_word: "pesannya mengandung kata yang dilarang di grup",
    newbie_link: "anggota baru belum bisa kirim link selama {jam} jam pertama",
    newbie_media:
      "anggota baru belum bisa kirim foto/video/file atau forward selama {jam} jam pertama",
    flood: "kirim pesannya kebanyakan dalam waktu singkat",
    duplicate: "pesan yang sama dikirim berulang-ulang",
    foreign_channel: "pesan atas nama channel lain belum boleh di sini",
  } satisfies Record<ViolationReason, string>,
  noticeNoWarn: "{nama}, pesannya kakak hapus dulu ya: {alasan}.",
  noticeWarn1: "{nama}, pesannya kakak hapus dulu ya: {alasan}. (peringatan 1/2)",
  noticeWarn2: "{nama}, ini peringatan 2/2: {alasan}. Sekali lagi, kamu dibisukan {bisu} jam.",
  noticeMuted: "{nama} dibisukan {bisu} jam karena sudah 3 kali melanggar. Admin akan meninjau.",
  modMuted:
    "🔇 <b>Dibisukan otomatis</b>\nAnggota: {nama} (<code>{id}</code>)\nAlasan terakhir: {alasan}\nPeringatan aktif: {jumlah}\n\nPilih tindakan:",
  modKickBtn: "Keluarkan",
  modUnmuteBtn: "Buka bisu",

  // Moderator
  notModerator: "Perintah ini khusus moderator.",
  needTarget: "Balas (reply) pesan anggotanya, atau tulis @username / ID-nya.",
  targetNotFound: "Anggota itu belum pernah terlihat di grup. Coba balas pesannya langsung.",
  cannotTargetMod: "Tidak bisa menindak sesama moderator/admin.",
  warnedByMod: "{nama} diberi peringatan oleh moderator ({jumlah} aktif). Alasan: {alasan}",
  unwarned: "Satu peringatan {nama} dibatalkan. Sisa peringatan aktif: {jumlah}.",
  noActiveWarning: "{nama} tidak punya peringatan aktif.",
  muted: "{nama} dibisukan {bisu} jam.",
  unmuted: "Bisu {nama} sudah dibuka.",
  kicked: "{nama} dikeluarkan dari grup. Masih bisa bergabung lagi lewat link.",
  settingSaved: "Tersimpan. Berlaku paling lambat 1 menit lagi.",
  actionFailed: "Gagal dijalankan Telegram. Pastikan bot masih admin dan anggotanya masih di grup.",
  htmlRejected:
    "Format HTML-nya ditolak Telegram. Tag yang boleh: &lt;b&gt; &lt;i&gt; &lt;u&gt; &lt;a href&gt; &lt;code&gt;. Tanda &lt; biasa tulis sebagai &amp;lt;",
  helpMod: [
    "<b>Perintah moderator</b>",
    "",
    "<b>Tindakan</b> (balas pesan, atau sebut @username / ID)",
    "/warn [alasan] · beri peringatan",
    "/unwarn · batalkan 1 peringatan terakhir",
    "/mute [jam] · bisukan",
    "/unmute · buka bisu",
    "/kick · keluarkan (bisa gabung lagi)",
    "/riwayat · riwayat peringatan & tindakan",
    "",
    "<b>Daftar</b>",
    "/kata daftar | tambah &lt;kata&gt; | hapus &lt;kata&gt;",
    "/domain daftar | tambah &lt;domain&gt; | hapus &lt;domain&gt;",
    "/terjadwal daftar | tambah HH:MM harian|senin,kamis &lt;teks&gt; | hapus &lt;id&gt;",
    "",
    "<b>Teks & angka</b>",
    "/setteks sapaan|aturan|materi|jadwal &lt;teks HTML&gt;",
    "/atur · lihat & ubah angka (contoh: /atur verifikasi_menit 5)",
  ].join("\n"),
};

const HTML_ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
export const escapeHtml = (s: string): string => s.replace(/[&<>"]/g, (c) => HTML_ESC[c] ?? c);

/** Sebutan pengguna yang bisa diklik (HTML). Nama di-escape. */
export function mention(user: {
  id: number;
  first_name?: string | null;
  username?: string | null;
}): string {
  const name = (user.first_name || user.username || "kamu").slice(0, 64);
  return `<a href="tg://user?id=${user.id}">${escapeHtml(name)}</a>`;
}

/** Isi placeholder {kunci}. Nilai TIDAK di-escape: escape sendiri yang berasal dari pengguna. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
