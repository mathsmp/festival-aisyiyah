/**
 * FESTIVAL KREASI ’AISYIYAH – BACKEND (Google Apps Script Web App = API JSON)
 * Frontend statis (index.html) di-host di GitHub Pages dan memanggil API ini.
 *
 * Sheet yang dipakai (dibuat otomatis oleh setup()):
 *   Pendaftaran · Peserta · Penilaian · Juri · Pengaturan · Rekap Nilai
 *
 * RAHASIA (kode juri, kode admin, ID spreadsheet) disimpan di
 * Project Settings > Script properties, BUKAN di file ini:
 *   KODE_JURI, KODE_ADMIN, SPREADSHEET_ID (wajib jika script tidak terikat ke Sheet)
 */

var CONFIG = {
  SPREADSHEET_ID: '',                 // opsional; lebih baik pakai Script property SPREADSHEET_ID
  TANGGAL_KEGIATAN: '27 November 2026',
  URL_PORTAL: '',                     // alamat GitHub Pages portal (untuk isi email bukti registrasi)
  KIRIM_EMAIL_BUKTI: true,            // kirim bukti registrasi ke email peserta (dibatasi kuota harian MailApp)
  LOGO_FILE_ID: '1xSZRxl56gtJJZAm1W5oMAIt75dhWNDdL',   // file logo ’Aisyiyah di Google Drive
  TTD1_JABATAN: 'Ketua Panitia',
  TTD1_NAMA: 'Dr. Nila Sari Latif, S.Pd., M.Pd.',
  TTD2_JABATAN: 'Sekretaris',
  TTD2_NAMA: 'Rahmawati, S.Pd., M.Pd., Gr.',
  BATAS_WAKTU_MS: 200000,             // batas waktu satu permintaan pembuatan PDF; portal otomatis melanjutkan
  SESI_JURI_DETIK: 21600,
  SESI_ADMIN_DETIK: 10800
};

var JUARA = ['Juara I', 'Juara II', 'Juara III'];
var STATUS_RANK = ['Babak I (Penyisihan)', 'Babak II (Semifinal)', 'Babak III (Final)', 'Pemenang Ranking 1'];
var JENJANG = ['MTs', 'SMP', 'MA', 'SMA'];
var URUT_JENJANG = ['SMP', 'MTs', 'SMA', 'MA'];
var KAT_PENGELOLA = 'Pengelola Pesantren / Panitia';
var KAT_SANTRI = 'Santriwati';
var SAT_PENGELOLA = 'Pengelola/Panitia';

// Skor tiap aspek 1–100; Nilai Akhir = Σ (Skor × Bobot%). Bobot mengikuti "Instrumen Penilaian Dewan Juri".
// grup: cara pengelompokan peringkat/juara sesuai TOR bagian Penghargaan
//   'jenjang'  = Juara I–III per jenjang (Puisi, Esai, Poster)
//   'semua'    = Juara I–III seluruh peserta (Orasi, Drama)
//   'kategori' = Juara I per kategori: Santriwati dan Pengelola/Panitia (Ranking 1)
var LOMBA = {
  puisi: {
    label: 'Lomba Puisi', kode: 'PUI', ukuran: 1, grup: 'jenjang', maxJuara: 3,
    kuota: { MTs: 6, SMP: 6, MA: 4, SMA: 4 },
    juri: ['Marwanting, S.Pd., M.Pd.', 'Dra. Irma Suryani, M.Pd.', 'Fathurrizki F Rum, S.Pd., M.Pd., Gr.', 'Andi Sri Geryani Ningrum, M.Pd.', 'Nabila Zahirah (IPM)', 'Rifdah Arifah (IPM)', 'Rinai Langit (IPM)'],
    aspek: [
      { s: 'Tema', nama: 'Kesesuaian Tema', bobot: 20, ind: 'Karya puisi selaras dengan tema “Ummul Mukmin ’Aisyiyah Bermutu & Berkemajuan” serta tidak mengandung unsur penghinaan, diskriminasi, maupun pelanggaran nilai kepesantrenan.' },
      { s: 'Isi', nama: 'Kekuatan Isi dan Pesan', bobot: 25, ind: 'Kedalaman makna syiar ke-’Aisyiyah-an, diksi puitis yang menggugah, serta kejelasan pesan perjuangan perempuan berkemajuan.' },
      { s: 'Hayat', nama: 'Penghayatan', bobot: 20, ind: 'Ketepatan penjiwaan emosi, mimik wajah, intonasi, artikulasi vokal, jeda, serta kontak mata selama pembacaan puisi.' },
      { s: 'Kreatif', nama: 'Kreativitas Penyajian', bobot: 20, ind: 'Orisinalitas gaya pembawaan panggung, pemanfaatan gestur, serta keserasian musik pengiring sederhana (jika digunakan).' },
      { s: 'Kompak', nama: 'Kekompakan', bobot: 15, ind: 'Keselarasan antara pembaca puisi dengan pengiring musik/pendukung penampilan serta ketertiban dan ketepatan durasi tampil (5–7 menit).' }
    ]
  },
  orasi: {
    label: 'Lomba Orasi', kode: 'ORA', ukuran: 1, grup: 'semua', maxJuara: 3,
    kuota: { MTs: 3, SMP: 3, MA: 2, SMA: 2 },
    juri: ['Ir. Andryani Akib, M.Pd.', 'Fitriani Abdullah, S.Pd., M.Pd.', 'Irmayani, S.S., M.Pd.', 'Kahadiah, S.Pd.I., M.Pd.', 'Syafa Diya Athifah (IPM)', 'April Ufairah (IPM)', 'Jihan Fitrah Ardy (IPM)'],
    aspek: [
      { s: 'Isi', nama: 'Isi dan Argumentasi', bobot: 30, ind: 'Bobot gagasan kebangsaan/keislaman, ketepatan penyisipan dalil Al-Qur’an, Hadis, atau istilah Arab/daerah yang relevan, serta kekuatan pesan pembangun semangat.' },
      { s: 'Tema', nama: 'Penguasaan Tema', bobot: 20, ind: 'Pemahaman mendalam terhadap tema “Jika Perempuan ’Aisyiyah Berkemajuan, Indonesia Akan Semakin Maju” dan kemampuan berorasi penuh tanpa teks/catatan.' },
      { s: 'Retorika', nama: 'Penyampaian', bobot: 20, ind: 'Kefasihan retorika, penggunaan Bahasa Indonesia baku yang sopan dan komunikatif, kejelasan artikulasi, serta pengaturan tempo bicara.' },
      { s: 'Ekspresi', nama: 'Penghayatan dan Ekspresi', bobot: 15, ind: 'Kewibawaan mimbar, gestur tubuh yang tegas dan proporsional, serta ekspresi wajah yang selaras dengan dinamika orasi.' },
      { s: 'Utuh', nama: 'Kekompakan', bobot: 15, ind: 'Keutuhan alur pembuka, isi, hingga penutup orasi secara berkesinambungan serta ketepatan pengelolaan waktu tampil (10 menit).' }
    ]
  },
  rank: {
    label: 'Lomba Ranking 1', kode: 'RNK', ukuran: 1, grup: 'kategori', maxJuara: 1, rank: true,
    kuota: { MTs: 30, SMP: 30, MA: 30, SMA: 30 }, kuotaPengelola: 40,
    juri: ['Nurmiati Halim, S.Ag., M.Pd.', 'Ita Rostia Ichsan, S.Pd., M.Pd.', 'Baridah, S.Kom.', 'Umi Kalsum, S.Kom.I., M.A.', 'Nurul Fachrul Nisa, S.Pd.', 'Amirah Rezky (IPM)', 'Nila Aulia (IPM)', 'Salsabila Zahrah (IPM)'],
    aspek: [
      { s: 'Skor jawaban', nama: 'Kebenaran Jawaban', bobot: 100, ind: 'Ketepatan jawaban pada babak Benar/Salah, Pilihan Ganda, dan Esai Singkat (papan jawaban manual): (a) Sejarah Perjuangan & Tokoh ’Aisyiyah, (b) Ke-Muhammadiyahan & ’Aisyiyah, (c) Wawasan Kebangsaan, (d) Pengetahuan Agama Islam & Kepesantrenan. Sistem gugur hingga tersisa 1 pemenang (Ranking 1) untuk kategori Santriwati dan kategori Pengelola/Panitia.' }
    ]
  },
  esai: {
    label: 'Lomba Esai Kelompok', kode: 'ESA', ukuran: 3, grup: 'jenjang', maxJuara: 3,
    kuota: { MTs: 6, SMP: 6, MA: 4, SMA: 4 },
    juri: ['Dr. Nila Sari Latif, S.Pd., M.Pd.', 'Nurfausiah, M.Pd.', 'Miftahul Jannah, S.Pd.', 'Salzhabila Nuramadhani (IPM)', 'Sayidatun Nisa Batara (IPM)', 'Dhivana Malida (IPM)', 'Qanitah Nazzifah (IPM)'],
    aspek: [
      { s: 'Tema', nama: 'Kesesuaian Tema', bobot: 20, ind: 'Relevansi isi esai terhadap pilihan topik ke-’Aisyiyah-an dan kepesantrenan serta kesesuaian dengan ketentuan panjang tulisan (500–700 kata).' },
      { s: 'Argumen', nama: 'Gagasan dan Argumentasi', bobot: 30, ind: 'Ketajaman ide pokok, kekuatan logika argumentasi, dukungan fakta/referensi yang valid, serta pencantuman sumber/Daftar Pustaka.' },
      { s: 'Dalam', nama: 'Kedalaman Pembahasan', bobot: 20, ind: 'Kemampuan menguraikan kontribusi, tantangan, dan solusi strategis bagi generasi muda ’Aisyiyah secara komprehensif.' },
      { s: 'Bahasa', nama: 'Struktur dan Bahasa', bobot: 15, ind: 'Kelengkapan sistematika (Judul, Pendahuluan, Pembahasan, Penutup/Rekomendasi), kerapian tulisan tangan manual, serta penggunaan Bahasa Indonesia yang baik dan komunikatif.' },
      { s: 'Kreatif', nama: 'Kreativitas Gagasan', bobot: 15, ind: 'Keaslian sudut pandang (orisinalitas), kebaruan gagasan yang ditawarkan, dan daya tarik penyajian tulisan.' }
    ]
  },
  poster: {
    label: 'Lomba Poster', kode: 'POS', ukuran: 3, grup: 'jenjang', maxJuara: 3,
    kuota: { MTs: 6, SMP: 6, MA: 4, SMA: 4 },
    juri: ['Sumarni Jabir, S.Pd., M.Pd.', 'Nurul Afifah Aisyah, S.Ds.', 'Earli Widya Astuti, S.Pd.', 'Andi Anita Listiasari, S.Si.', 'Nurfadhilah Tanrik (IPM)', 'Aini Nur Izzah (IPM)', 'Athaya Khalilah (IPM)'],
    aspek: [
      { s: 'Tema', nama: 'Kesesuaian Tema', bobot: 25, ind: 'Keterkaitan ilustrasi dan slogan poster dengan pilihan tema kemerdekaan RI ke-81 dan peran perempuan berkemajuan ’Aisyiyah.' },
      { s: 'Pesan', nama: 'Pesan dan Makna', bobot: 25, ind: 'Kejelasan kalimat jargon/slogan yang menggugah, kekuatan komunikasi visual, dan kemudahan pesan dipahami oleh audiens.' },
      { s: 'Kreatif', nama: 'Kreativitas', bobot: 20, ind: 'Eksplorasi ide visual dan teknik pewarnaan manual (pensil warna, krayon, cat, atau spidol) tanpa bantuan perangkat elektronik.' },
      { s: 'Komp.', nama: 'Komposisi Visual', bobot: 15, ind: 'Keseimbangan tata letak (layout) bidang gambar A3, harmoni warna, tipografi tulisan tangan, dan kebersihan akhir karya.' },
      { s: 'Orisinil', nama: 'Orisinalitas', bobot: 15, ind: 'Keaslian desain karya buatan tangan anggota tim sendiri (bukan jiplakan) selama waktu lomba berlangsung.' }
    ]
  },
  drama: {
    label: 'Lomba Drama Mini', kode: 'DRM', ukuran: 10, grup: 'semua', maxJuara: 3,
    kuota: { MTs: 1, SMP: 1, MA: 1, SMA: 1 },
    juri: ['Satriani, S.Pd., M.Pd.', 'Indriati, S.Pd.', 'Nita Pratiwi, S.Pd.', 'Musyarrafatunnisa Tauhid (IPM)', 'Nurul Afni Annisa (IPM)', 'Nur Alyah Imran (IPM)', 'Syifa Nurul Aini (IPM)'],
    aspek: [
      { s: 'Cerita', nama: 'Kekuatan Cerita', bobot: 20, ind: 'Kejelasan alur dramaturgi (pengenalan, konflik, klimaks, resolusi), struktur naskah yang dihafalkan tanpa teks, serta kepatuhan terhadap norma pesantren dan bebas unsur SARA.' },
      { s: 'Pesan', nama: 'Pesan / Nilai ’Aisyiyah', bobot: 25, ind: 'Ketepatan penggambaran jejak tokoh/nilai perjuangan perempuan ’Aisyiyah serta relevansi amanat edukatif bagi generasi muda.' },
      { s: 'Akting', nama: 'Penghayatan', bobot: 20, ind: 'Kualitas seni peran (akting), pendalaman karakter setiap tokoh, dialog yang alami, dan ekspresi emosional di atas panggung.' },
      { s: 'Kreatif', nama: 'Kreativitas', bobot: 20, ind: 'Pemanfaatan properti/kostum sederhana dan ramah lingkungan milik pesantren, tata panggung, serta keselarasan musik latar/akustik.' },
      { s: 'Kompak', nama: 'Kekompakan', bobot: 15, ind: 'Keterlibatan aktif seluruh 10 anggota tim (pemeran dan kru panggung), koordinasi transisi adegan, dan ketepatan waktu (maksimal 30 menit).' }
    ]
  }
};

var SH_REG = 'Pendaftaran', SH_PES = 'Peserta', SH_NIL = 'Penilaian', SH_JUR = 'Juri', SH_SET = 'Pengaturan', SH_REK = 'Rekap Nilai';
var H_REG = ['Timestamp', 'ID Pendaftaran', 'Nomor', 'Cabang Lomba', 'Jenis', 'Kategori', 'Nama Tim / Peserta',
             'Satuan Pendidikan', 'Tingkatan', 'Tema / Topik', 'Judul', 'Penulis Puisi', 'Musik', 'Jumlah Anggota', 'HP Pembina', 'Email'];
var H_PES = ['Nomor', 'ID Pendaftaran', 'Nama Lengkap', 'NIS/NIM', 'Satuan Pendidikan', 'Kelas / Jabatan', 'Cabang Lomba',
             'Nama Tim', 'Kategori', 'Peran', 'Juara', 'Status Sertifikat', 'Link Sertifikat', 'Status Piagam', 'Link Piagam'];
var H_NIL = ['Timestamp', 'Kode', 'Cabang Lomba', 'Nomor', 'Nama Tim / Peserta', 'Juri', 'Skor 1', 'Skor 2', 'Skor 3', 'Skor 4', 'Skor 5',
             'Total Nilai', 'Status Babak', 'Catatan', 'Kunci'];
var H_JUR = ['Kode', 'Nama Juri', 'Aktif'];
var H_SET = ['Kunci', 'Nilai', 'Diubah'];
var DEF_SET = { registrasi_buka: 'ya', penilaian_buka: 'ya', rilis_sertifikat: 'tidak', rilis_piagam: 'tidak',
                template_sertifikat_id: '', template_piagam_id: '', folder_sertifikat_id: '', folder_piagam_id: '' };

// ================== UTIL ==================
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function ss_() {
  var id = CONFIG.SPREADSHEET_ID || prop_('SPREADSHEET_ID');
  var s = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!s) throw new Error('Spreadsheet belum dikonfigurasi (Script property SPREADSHEET_ID).');
  return s;
}
function sheet_(n) { return ss_().getSheetByName(n); }
function baca_(sh, n) { return (!sh || sh.getLastRow() < 2) ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, n).getValues(); }
function bersih_(s, maks) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, maks || 120);
  return /^[=+\-@]/.test(s) ? "'" + s : s;   // cegah formula injection
}
function norm_(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function kodeKe_(kode) { var r = ''; Object.keys(LOMBA).forEach(function (k) { if (LOMBA[k].kode === kode) r = k; }); return r; }
function kerja_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/** Membuat sheet + header + format. Aman dijalankan berulang. Jalankan sekali manual untuk memberi izin. */
function setup() {
  var ss = ss_();
  [[SH_REG, H_REG], [SH_PES, H_PES], [SH_NIL, H_NIL], [SH_JUR, H_JUR], [SH_SET, H_SET]].forEach(function (x) {
    var sh = ss.getSheetByName(x[0]) || ss.insertSheet(x[0]);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, x[1].length).setValues([x[1]]).setFontWeight('bold').setBackground('#0b4a35').setFontColor('#ffffff');
      sh.setFrozenRows(1);
      if (x[0] === SH_PES) {
        sh.getRange(2, 4, sh.getMaxRows() - 1, 1).setNumberFormat('@');
        sh.getRange(2, 11, sh.getMaxRows() - 1, 1).setDataValidation(
          SpreadsheetApp.newDataValidation().requireValueInList(JUARA, true).setAllowInvalid(false).build());
      } else if (x[0] === SH_REG) {
        sh.getRange(2, 15, sh.getMaxRows() - 1, 1).setNumberFormat('@');
      } else if (x[0] === SH_NIL) {
        sh.getRange(2, 4, sh.getMaxRows() - 1, 1).setNumberFormat('@');
        sh.getRange(2, 12, sh.getMaxRows() - 1, 1).setNumberFormat('0.00');
      }
    } else if (x[0] === SH_REG && sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].indexOf('Email') < 0) {
      // migrasi: sheet Pendaftaran lama belum punya kolom Email
      sh.getRange(1, H_REG.length).setValue('Email').setFontWeight('bold').setBackground('#0b4a35').setFontColor('#ffffff');
    }
  });
  var jur = ss.getSheetByName(SH_JUR);
  if (jur.getLastRow() < 2) {            // isi awal daftar juri dari TOR
    var rows = [];
    Object.keys(LOMBA).forEach(function (k) { LOMBA[k].juri.forEach(function (n) { rows.push([LOMBA[k].kode, n, 'Ya']); }); });
    jur.getRange(2, 1, rows.length, 3).setValues(rows);
  }
}

// ================== PENGATURAN ==================
function pengaturan_() {
  var cache = CacheService.getScriptCache(), c = cache.get('set');
  if (c) return JSON.parse(c);
  var o = {}; Object.keys(DEF_SET).forEach(function (k) { o[k] = DEF_SET[k]; });
  baca_(sheet_(SH_SET), 3).forEach(function (r) { if (r[0] in o) o[r[0]] = String(r[1]); });
  cache.put('set', JSON.stringify(o), 30);
  return o;
}
function setPeng_(k, v) {
  if (!(k in DEF_SET)) throw new Error('Pengaturan tidak dikenal.');
  setup();
  var sh = sheet_(SH_SET), ada = baca_(sh, 3), baris = 0;
  ada.forEach(function (r, i) { if (r[0] === k) baris = i + 2; });
  if (!baris) baris = sh.getLastRow() + 1;
  sh.getRange(baris, 1, 1, 3).setValues([[k, v, new Date()]]);
  var cache = CacheService.getScriptCache(); cache.remove('set'); cache.remove('info');
}

// ================== API (JSON) ==================
var API = {
  info: function () { return getInfo_(); },
  daftar: function (p) { return daftar(p); },
  cariSertifikat: function (nomor, email) { return cariSertifikat(nomor, email); },
  unduhSertifikat: function (nomor, email, idx, jenis) { return unduhSertifikat(nomor, email, idx, jenis); },
  loginJuri: function (kode) { return loginJuri(kode); },
  muatPenilaian: function (t, lomba, juri) { return muatPenilaian(t, lomba, juri); },
  simpanNilai: function (t, p) { return simpanNilai(t, p); },
  loginAdmin: function (kode) { return loginAdmin(kode); },
  admDasbor: function (t) { return admDasbor(t); },
  admPendaftaran: function (t) { return admPendaftaran(t); },
  admUbahAnggota: function (t, id, idx, f) { return admUbahAnggota(t, id, idx, f); },
  admUbahEmail: function (t, id, email) { return admUbahEmail(t, id, email); },
  admHapus: function (t, id) { return admHapus(t, id); },
  admJuri: function (t) { return admJuri(t); },
  admSimpanJuri: function (t, key, list) { return admSimpanJuri(t, key, list); },
  admRekap: function (t) { return admRekap(t); },
  admJuaraOtomatis: function (t) { return admJuaraOtomatis(t); },
  admSetJuara: function (t, nomor, juara) { return admSetJuara(t, nomor, juara); },
  admSetPengaturan: function (t, k, v) { return admSetPengaturan(t, k, v); },
  admSertStatus: function (t) { return admSertStatus(t); },
  admBuatTemplate: function (t, jenis) { return admBuatTemplate(t, jenis); },
  admGenerate: function (t, jenis, ulang) { return admGenerate(t, jenis, ulang); },
  admReset: function (t, jenis) { return admReset(t, jenis); }
};

function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    if (!API.hasOwnProperty(req.fn)) throw new Error('Perintah tidak dikenal.');
    out = { ok: true, data: API[req.fn].apply(null, req.args || []) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: 'API Festival Kreasi ’Aisyiyah aktif.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================== LOGIN (juri & admin) ==================
function login_(jenis, kode, ttl) {
  var rahasia = prop_('KODE_' + jenis.toUpperCase());
  if (!rahasia) throw new Error('Kode ' + jenis + ' belum diatur di Script properties.');
  var cache = CacheService.getScriptCache(), who = '';
  try { who = Session.getTemporaryActiveUserKey() || ''; } catch (e) {}
  var kf = 'gagal_' + jenis + '_' + who.slice(0, 40);
  var n = parseInt(cache.get(kf) || '0', 10);
  if (n >= 10) throw new Error('Terlalu banyak percobaan salah. Coba lagi dalam 10 menit.');
  if (String(kode == null ? '' : kode).trim() !== rahasia) { cache.put(kf, String(n + 1), 600); throw new Error('Kode tidak sesuai.'); }
  cache.remove(kf);
  var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  cache.put(jenis + '_' + token, '1', ttl);
  return token;
}
function cekSesi_(jenis, token) {
  var cache = CacheService.getScriptCache();
  if (!token || !cache.get(jenis + '_' + token)) throw new Error('Sesi berakhir. Silakan masuk kembali.');
  cache.put(jenis + '_' + token, '1', jenis === 'juri' ? CONFIG.SESI_JURI_DETIK : CONFIG.SESI_ADMIN_DETIK);
}
function loginJuri(kode) { setup(); var t = login_('juri', kode, CONFIG.SESI_JURI_DETIK); return { token: t, lomba: metaJuri_() }; }
function loginAdmin(kode) { setup(); return { token: login_('admin', kode, CONFIG.SESI_ADMIN_DETIK), lomba: Object.keys(LOMBA).map(function (k) { return { key: k, label: LOMBA[k].label }; }) }; }

// ================== JURI (daftar aktif per lomba, diatur admin) ==================
function juriMap_(semua) {
  var m = {}, ada = {};
  Object.keys(LOMBA).forEach(function (k) { m[k] = []; });
  baca_(sheet_(SH_JUR), 3).forEach(function (r) {
    var k = kodeKe_(r[0]); if (!k) return;
    ada[k] = true;
    var aktif = String(r[2]).toLowerCase() === 'ya';
    if (semua) m[k].push({ nama: r[1], aktif: aktif }); else if (aktif) m[k].push(r[1]);
  });
  Object.keys(LOMBA).forEach(function (k) {
    if (!ada[k]) m[k] = LOMBA[k].juri.map(function (n) { return semua ? { nama: n, aktif: true } : n; });
  });
  return m;
}
function metaJuri_() {
  var jm = juriMap_(false);
  return Object.keys(LOMBA).map(function (k) {
    var c = LOMBA[k];
    return { key: k, label: c.label, juri: jm[k], aspek: c.aspek, rank: !!c.rank, status: c.rank ? STATUS_RANK : [] };
  });
}

// ================== INFO PUBLIK / STATISTIK ==================
function statistik_() {
  var out = {}, peta = {};
  Object.keys(LOMBA).forEach(function (k) {
    var c = LOMBA[k], t = 0, pj = {};
    JENJANG.forEach(function (j) { pj[j] = { n: 0, t: c.kuota[j] }; t += c.kuota[j]; });
    out[k] = { label: c.label, terdaftar: 0, target: t, perJenjang: pj };
    if (c.kuotaPengelola) out[k].pengelola = { n: 0, t: c.kuotaPengelola };
    peta[c.label] = k;
  });
  baca_(sheet_(SH_REG), H_REG.length).forEach(function (r) {
    var k = peta[r[3]]; if (!k) return;
    if (r[5] === KAT_PENGELOLA && out[k].pengelola) { out[k].pengelola.n++; return; }
    out[k].terdaftar++;
    if (out[k].perJenjang[r[7]]) out[k].perJenjang[r[7]].n++;
  });
  return out;
}
function getInfo_() {
  var cache = CacheService.getScriptCache(), c = cache.get('info');
  if (c) return JSON.parse(c);
  var s = pengaturan_(), orang = Math.max(0, (sheet_(SH_PES) ? sheet_(SH_PES).getLastRow() : 1) - 1);
  var o = { registrasiBuka: s.registrasi_buka === 'ya', rilisSertifikat: s.rilis_sertifikat === 'ya', rilisPiagam: s.rilis_piagam === 'ya',
            stat: statistik_(), peserta: orang };
  cache.put('info', JSON.stringify(o), 45);
  return o;
}

// ================== REGISTRASI ==================
function daftar(p) {
  return kerja_(function () {
    setup();
    if (pengaturan_().registrasi_buka !== 'ya') throw new Error('Registrasi sedang ditutup oleh panitia.');
    var cfg = LOMBA[p && p.lomba];
    if (!cfg) throw new Error('Cabang lomba tidak valid.');

    var email = bersih_(p.email, 100).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Email tidak valid. Gunakan email aktif.');

    var tim = cfg.ukuran > 1;
    var pengelola = (p.lomba === 'rank' && p.kategori === KAT_PENGELOLA);
    var kategori = pengelola ? KAT_PENGELOLA : KAT_SANTRI;
    var satuan = pengelola ? SAT_PENGELOLA : bersih_(p.satuan);
    if (!pengelola && JENJANG.indexOf(satuan) < 0) throw new Error('Satuan pendidikan wajib dipilih.');

    var ang = (p.anggota || []).map(function (a) {
      return { nama: bersih_(a.nama), nis: bersih_(a.nis), kelas: bersih_(a.kelas), peran: bersih_(a.peran) };
    });
    if (ang.length !== cfg.ukuran) throw new Error('Jumlah anggota harus ' + cfg.ukuran + ' orang.');
    var namaTim = bersih_(p.namaTim);
    if (tim && !namaTim) throw new Error('Nama tim wajib diisi.');

    var dalam = {};
    ang.forEach(function (a, i) {
      if (!a.nama) throw new Error('Nama anggota nomor ' + (i + 1) + ' belum diisi.');
      if (!pengelola && (!a.nis || !a.kelas)) throw new Error('NIS/NIM dan kelas "' + a.nama + '" wajib diisi.');
      var k = norm_(a.nama);
      if (dalam[k]) throw new Error('Nama "' + a.nama + '" tertulis dua kali dalam tim.');
      dalam[k] = 1;
    });

    var ss = ss_(), reg = ss.getSheetByName(SH_REG), pes = ss.getSheetByName(SH_PES);

    if (p.lomba === 'drama') {                       // satu tim drama per satuan pendidikan
      baca_(reg, H_REG.length).forEach(function (r) {
        if (r[3] === cfg.label && r[7] === satuan) throw new Error('Tim drama ' + satuan + ' sudah terdaftar (' + r[2] + ').');
      });
    }
    var ada = baca_(pes, H_PES.length);              // satu peserta hanya satu cabang
    ang.forEach(function (a) {
      ada.forEach(function (r) {
        var sama = (a.nis && String(r[3]) === a.nis) || (norm_(r[2]) === norm_(a.nama) && r[4] === satuan);
        if (sama) throw new Error('"' + a.nama + '" sudah terdaftar di ' + r[6] + ' (nomor ' + r[0] + '). Satu peserta hanya boleh satu cabang.');
      });
    });

    var maks = 0;
    baca_(reg, 3).forEach(function (r) {
      var m = String(r[2]).match(new RegExp('^' + cfg.kode + '-(\\d+)$'));
      if (m) maks = Math.max(maks, parseInt(m[1], 10));
    });
    var nomor = cfg.kode + '-' + ('00' + (maks + 1)).slice(-3);
    var id = Utilities.getUuid().slice(0, 8).toUpperCase();

    reg.appendRow([new Date(), id, nomor, cfg.label, tim ? 'Tim' : 'Individu', kategori,
      tim ? namaTim : ang[0].nama, satuan, bersih_(p.tingkatan), bersih_(p.tema), bersih_(p.judul),
      bersih_(p.penulis), bersih_(p.musik), ang.length, bersih_(p.hp), email]);
    var rows = ang.map(function (a) {
      return [nomor, id, a.nama, a.nis, satuan, a.kelas, cfg.label, tim ? namaTim : '', kategori, a.peran, '', '', '', '', ''];
    });
    pes.getRange(pes.getLastRow() + 1, 1, rows.length, H_PES.length).setValues(rows);
    CacheService.getScriptCache().remove('info');

    if (CONFIG.KIRIM_EMAIL_BUKTI) {
      try {
        MailApp.sendEmail({
          to: email, name: 'Panitia Festival Kreasi ’Aisyiyah', noReply: true,
          subject: 'Bukti Registrasi ' + nomor + ' – Festival Kreasi ’Aisyiyah',
          body: 'Assalamu’alaikum wr. wb.\n\nRegistrasi Anda berhasil dicatat.\n\nNomor      : ' + nomor + '\nCabang     : ' + cfg.label +
            '\n' + (tim ? 'Nama tim   : ' + namaTim : 'Nama       : ' + ang[0].nama) + '\nSatuan     : ' + satuan +
            '\n\nPeserta:\n' + ang.map(function (a, i) { return (i + 1) + '. ' + a.nama; }).join('\n') +
            '\n\nTunjukkan nomor registrasi kepada panitia pada ' + CONFIG.TANGGAL_KEGIATAN + ' (registrasi 07.30–08.00).' +
            '\nSimpan nomor dan email ini: keduanya dipakai untuk mengunduh sertifikat setelah kegiatan' +
            (CONFIG.URL_PORTAL ? ' di ' + CONFIG.URL_PORTAL : '') + '.\n\nPanitia Festival Kreasi ’Aisyiyah'
        });
      } catch (e) {}
    }
    return { ok: true, nomor: nomor, id: id };
  });
}

// ================== PENILAIAN JURI ==================
function muatPenilaian(token, lomba, juri) {
  cekSesi_('juri', token);
  var cfg = LOMBA[lomba];
  if (!cfg) throw new Error('Cabang lomba tidak valid.');
  juri = bersih_(juri);
  if (!juri) throw new Error('Nama juri wajib dipilih.');
  setup();
  var tim = cfg.ukuran > 1, dr = {}, nilaiMap = {}, kj = norm_(juri);
  baca_(sheet_(SH_REG), H_REG.length).forEach(function (r) { dr[r[2]] = { tingkatan: r[8], tema: r[9], judul: r[10] }; });
  baca_(sheet_(SH_NIL), H_NIL.length).forEach(function (r) {
    if (r[1] === cfg.kode && norm_(r[5]) === kj) nilaiMap[r[3]] = { s: r.slice(6, 6 + cfg.aspek.length), total: r[11], status: r[12], catatan: r[13] };
  });
  var list = [], seen = {};
  baca_(sheet_(SH_PES), H_PES.length).forEach(function (r) {
    if (r[6] !== cfg.label || !r[0] || seen[r[0]]) return;
    seen[r[0]] = 1;
    var d = dr[r[0]] || {};
    list.push({ nomor: r[0], nama: tim ? r[7] : r[2], satuan: r[4], kategori: r[8],
      kelas: tim ? (d.tingkatan || '') : r[5], judul: d.judul || '', tema: d.tema || '', nilai: nilaiMap[r[0]] || null });
  });
  list.sort(function (a, b) { return a.nomor < b.nomor ? -1 : a.nomor > b.nomor ? 1 : 0; });
  return { peserta: list };
}

function simpanNilai(token, p) {
  cekSesi_('juri', token);
  return kerja_(function () {
    setup();
    if (pengaturan_().penilaian_buka !== 'ya') throw new Error('Penilaian sedang ditutup oleh admin.');
    var cfg = LOMBA[p && p.lomba];
    if (!cfg) throw new Error('Cabang lomba tidak valid.');
    var juri = bersih_(p.juri);
    var sah = juriMap_(false)[p.lomba].some(function (n) { return norm_(n) === norm_(juri); });
    if (!sah) throw new Error('Nama juri tidak terdaftar pada cabang ini. Hubungi admin.');

    var skor = (p.skor || []).map(Number);
    if (skor.length !== cfg.aspek.length) throw new Error('Jumlah aspek penilaian tidak sesuai.');
    skor.forEach(function (v) { if (!isFinite(v) || v < 1 || v > 100 || v % 1 !== 0) throw new Error('Skor tiap aspek harus bilangan bulat 1–100.'); });
    var total = 0;
    cfg.aspek.forEach(function (a, i) { total += skor[i] * a.bobot / 100; });
    total = Math.round(total * 100) / 100;
    var status = '';
    if (cfg.rank) { status = String(p.status || ''); if (STATUS_RANK.indexOf(status) < 0) throw new Error('Pilih babak tertinggi yang dicapai peserta.'); }

    var nomor = String(p.nomor || ''), nama = '';
    baca_(sheet_(SH_PES), H_PES.length).some(function (r) {
      if (r[0] === nomor && r[6] === cfg.label) { nama = cfg.ukuran > 1 ? r[7] : r[2]; return true; }
      return false;
    });
    if (!nama) throw new Error('Peserta/tim dengan nomor ' + nomor + ' tidak ditemukan.');

    var kunci = cfg.kode + '|' + nomor + '|' + norm_(juri), nil = sheet_(SH_NIL), target = 0;
    baca_(nil, H_NIL.length).forEach(function (r, i) { if (r[14] === kunci) target = i + 2; });
    if (!target) target = nil.getLastRow() + 1;
    var s = function (i) { return skor[i] == null ? '' : skor[i]; };
    nil.getRange(target, 1, 1, H_NIL.length).setValues([[new Date(), cfg.kode, cfg.label, nomor, nama, juri,
      s(0), s(1), s(2), s(3), s(4), total, status, bersih_(p.catatan, 300), kunci]]);
    return { ok: true, total: total };
  });
}

// ================== REKAP & PERINGKAT ==================
function hitungRekap_() {
  var hasil = { baris: [], seri: [], kodeAda: {} };
  var nilRows = baca_(sheet_(SH_NIL), H_NIL.length), pesRows = baca_(sheet_(SH_PES), H_PES.length);
  if (!nilRows.length || !pesRows.length) return hasil;
  var urut = Object.keys(LOMBA), info = {}, agg = {};
  pesRows.forEach(function (r) {
    if (r[0] && !info[r[0]]) info[r[0]] = { id: r[1], nama: r[7] || r[2], satuan: r[4], kategori: r[8] };
  });
  nilRows.forEach(function (r) {
    if (!r[3]) return;
    var a = agg[r[3]] || (agg[r[3]] = { kode: r[1], jml: 0, sum: 0, lvl: -1 });
    a.jml++; a.sum += Number(r[11]) || 0; a.lvl = Math.max(a.lvl, STATUS_RANK.indexOf(r[12]));
  });
  var grup = {};
  Object.keys(agg).forEach(function (no) {
    var a = agg[no], k = kodeKe_(a.kode), p = info[no];
    if (!k || !p) return;
    var cfg = LOMBA[k], gl = cfg.grup === 'jenjang' ? p.satuan : cfg.grup === 'kategori' ? p.kategori : '';
    var g = grup[k + '|' + gl] || (grup[k + '|' + gl] = { key: k, label: gl, items: [] });
    g.items.push({ no: no, id: p.id, nama: p.nama, satuan: p.satuan, kategori: p.kategori, jml: a.jml, avg: Math.round(a.sum / a.jml * 100) / 100, lvl: a.lvl });
  });
  function urutGrup(label) { var i = URUT_JENJANG.indexOf(label); return i >= 0 ? i : label === KAT_SANTRI ? 0 : 1; }
  Object.keys(grup).sort(function (x, y) {
    var gx = grup[x], gy = grup[y];
    return (urut.indexOf(gx.key) - urut.indexOf(gy.key)) || (urutGrup(gx.label) - urutGrup(gy.label));
  }).forEach(function (gk) {
    var g = grup[gk], cfg = LOMBA[g.key];
    hasil.kodeAda[g.key] = true;
    g.items.sort(function (x, y) {
      if (cfg.rank && y.lvl !== x.lvl) return y.lvl - x.lvl;
      if (y.avg !== x.avg) return y.avg - x.avg;
      return x.no < y.no ? -1 : 1;
    });
    var pr = 0, prev = null, hitung = {};
    g.items.forEach(function (it, i) {
      var sama = prev && prev.avg === it.avg && (!cfg.rank || prev.lvl === it.lvl);
      it.rank = sama ? pr : i + 1; pr = it.rank; prev = it;
      it.juara = (it.rank <= cfg.maxJuara && !(cfg.rank && it.lvl < 3)) ? JUARA[it.rank - 1] : '';
      if (it.juara) hitung[it.rank] = (hitung[it.rank] || 0) + 1;
      hasil.baris.push({ key: g.key, cabang: cfg.label, grup: g.label, rank: it.rank, nomor: it.no, id: it.id, nama: it.nama,
        satuan: it.satuan, jml: it.jml, avg: it.avg, babak: cfg.rank && it.lvl >= 0 ? STATUS_RANK[it.lvl] : '', juara: it.juara });
    });
    Object.keys(hitung).forEach(function (r) {
      if (hitung[r] > 1) hasil.seri.push(cfg.label + (g.label ? ' – ' + g.label : '') + ' (peringkat ' + r + ')');
    });
  });
  return hasil;
}

function tulisRekap_(h) {
  var ss = ss_(), sh = ss.getSheetByName(SH_REK) || ss.insertSheet(SH_REK);
  sh.clear();
  var head = ['Cabang Lomba', 'Kelompok', 'Peringkat', 'Nomor', 'Nama Tim / Peserta', 'Satuan Pendidikan', 'Jumlah Juri', 'Rata-rata Nilai', 'Babak Tertinggi', 'Juara'];
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#0b4a35').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  var rows = h.baris.map(function (b) { return [b.cabang, b.grup, b.rank, b.nomor, b.nama, b.satuan, b.jml, b.avg, b.babak, b.juara]; });
  if (rows.length) { sh.getRange(2, 1, rows.length, head.length).setValues(rows); sh.getRange(2, 8, rows.length, 1).setNumberFormat('0.00'); }
  sh.autoResizeColumns(1, head.length);
}

// ================== ADMIN ==================
function adm_(t) { cekSesi_('admin', t); setup(); }

function admDasbor(t) {
  adm_(t);
  var s = pengaturan_(), st = statistik_(), jm = juriMap_(false);
  var pes = baca_(sheet_(SH_PES), H_PES.length), reg = baca_(sheet_(SH_REG), H_REG.length), nil = baca_(sheet_(SH_NIL), H_NIL.length);
  var nomorPer = {}, seen = {}, sertDibuat = 0, piagamDibuat = 0, juaraN = 0;
  pes.forEach(function (r) {
    if (!seen[r[0]]) { seen[r[0]] = 1; nomorPer[r[6]] = (nomorPer[r[6]] || 0) + 1; }
    if (r[12]) sertDibuat++;
    if (r[10]) juaraN++;
    if (r[14]) piagamDibuat++;
  });
  var terisi = {};
  nil.forEach(function (r) { var k = r[1] + '|' + norm_(r[5]); terisi[k] = (terisi[k] || 0) + 1; });
  var nilai = Object.keys(LOMBA).map(function (k) {
    var c = LOMBA[k], n = nomorPer[c.label] || 0;
    return { key: k, label: c.label, peserta: n, juri: jm[k].map(function (j) { return { nama: j, terisi: terisi[c.kode + '|' + norm_(j)] || 0 }; }) };
  });
  return { stat: st, orang: pes.length, pendaftaran: reg.length, nilai: nilai,
    sert: { total: pes.length, dibuat: sertDibuat, juara: juaraN, piagam: piagamDibuat },
    set: { registrasi_buka: s.registrasi_buka === 'ya', penilaian_buka: s.penilaian_buka === 'ya', rilis_sertifikat: s.rilis_sertifikat === 'ya', rilis_piagam: s.rilis_piagam === 'ya' } };
}

function admSetPengaturan(t, k, v) {
  adm_(t);
  if (['registrasi_buka', 'penilaian_buka', 'rilis_sertifikat', 'rilis_piagam'].indexOf(k) < 0) throw new Error('Pengaturan tidak dikenal.');
  return kerja_(function () { setPeng_(k, v ? 'ya' : 'tidak'); return { ok: true }; });
}

function admPendaftaran(t) {
  adm_(t);
  var mem = {};
  baca_(sheet_(SH_PES), H_PES.length).forEach(function (r) {
    (mem[r[1]] = mem[r[1]] || []).push({ nama: r[2], nis: r[3], kelas: r[5], peran: r[9], juara: r[10], sert: !!r[12], piagam: !!r[14] });
  });
  return baca_(sheet_(SH_REG), H_REG.length).map(function (r) {
    return { id: r[1], nomor: r[2], cabang: r[3], kategori: r[5], nama: r[6], satuan: r[7], tingkatan: r[8], hp: r[14], email: r[15], anggota: mem[r[1]] || [] };
  });
}

function admUbahAnggota(t, id, idx, f) {
  adm_(t);
  return kerja_(function () {
    var sh = sheet_(SH_PES), rows = baca_(sh, H_PES.length), n = -1, baris = 0, nomor = '';
    rows.forEach(function (r, i) { if (r[1] === id) { n++; if (n === Number(idx)) { baris = i + 2; nomor = r[0]; } } });
    if (!baris) throw new Error('Anggota tidak ditemukan.');
    var nama = bersih_(f.nama); if (!nama) throw new Error('Nama tidak boleh kosong.');
    sh.getRange(baris, 3, 1, 1).setValue(nama);
    sh.getRange(baris, 4, 1, 1).setValue(bersih_(f.nis));
    sh.getRange(baris, 6, 1, 1).setValue(bersih_(f.kelas));
    sh.getRange(baris, 12, 1, 2).setValues([['', '']]);          // nama berubah -> sertifikat dibuat ulang
    sh.getRange(baris, 14, 1, 2).setValues([['', '']]);
    if (idx == 0 && sh.getRange(baris, 8).getValue() === '') {   // peserta individu: sinkron ke Pendaftaran
      var reg = sheet_(SH_REG);
      baca_(reg, 3).forEach(function (r, i) { if (r[1] === id) reg.getRange(i + 2, 7).setValue(nama); });
    }
    return { ok: true };
  });
}

function admUbahEmail(t, id, email) {
  adm_(t);
  email = bersih_(email, 100).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Email tidak valid.');
  return kerja_(function () {
    var reg = sheet_(SH_REG), ok = false;
    baca_(reg, 3).forEach(function (r, i) { if (r[1] === id) { reg.getRange(i + 2, H_REG.length).setValue(email); ok = true; } });
    if (!ok) throw new Error('Pendaftaran tidak ditemukan.');
    return { ok: true };
  });
}

function admHapus(t, id) {
  adm_(t);
  return kerja_(function () {
    var reg = sheet_(SH_REG), nomor = '';
    baca_(reg, 3).forEach(function (r) { if (r[1] === id) nomor = r[2]; });
    if (!nomor) throw new Error('Pendaftaran tidak ditemukan.');
    [[SH_REG, 2, id, H_REG.length], [SH_PES, 2, id, H_PES.length], [SH_NIL, 4, nomor, H_NIL.length]].forEach(function (x) {
      var sh = sheet_(x[0]), rows = baca_(sh, x[3]);
      for (var i = rows.length - 1; i >= 0; i--) if (rows[i][x[1] - 1] === x[2]) sh.deleteRow(i + 2);
    });
    CacheService.getScriptCache().remove('info');
    return { ok: true, nomor: nomor };
  });
}

function admJuri(t) {
  adm_(t);
  var jm = juriMap_(true);
  return Object.keys(LOMBA).map(function (k) { return { key: k, label: LOMBA[k].label, juri: jm[k] }; });
}
function admSimpanJuri(t, key, list) {
  adm_(t);
  var cfg = LOMBA[key]; if (!cfg) throw new Error('Cabang lomba tidak valid.');
  var baru = [], seen = {};
  (list || []).forEach(function (j) {
    var n = bersih_(j.nama); if (!n || seen[norm_(n)]) return;
    seen[norm_(n)] = 1; baru.push([cfg.kode, n, j.aktif ? 'Ya' : 'Tidak']);
  });
  if (!baru.length) throw new Error('Minimal satu nama juri.');
  return kerja_(function () {
    var sh = sheet_(SH_JUR), sisa = baca_(sh, 3).filter(function (r) { return r[0] !== cfg.kode; });
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 3).clearContent();
    var semua = sisa.concat(baru);
    sh.getRange(2, 1, semua.length, 3).setValues(semua);
    return { ok: true };
  });
}

function admRekap(t) {
  adm_(t);
  var h = hitungRekap_(), fin = {};
  baca_(sheet_(SH_PES), H_PES.length).forEach(function (r) { if (!(r[1] in fin) || r[10]) fin[r[1]] = r[10]; });
  h.baris.forEach(function (b) { b.final = fin[b.id] || ''; });
  return { baris: h.baris, seri: h.seri };
}

function terapJuara_(peta, labelAda) {
  var sh = sheet_(SH_PES), d = baca_(sh, H_PES.length), out = [], bersihLink = [], n = 0;
  d.forEach(function (r) {
    var v = r[10], baru = v;
    if (labelAda[r[6]]) { baru = peta[r[1]] || ''; if (baru) n++; }
    out.push([baru]);
    bersihLink.push(baru !== v ? ['', ''] : [r[13], r[14]]);      // juara berubah -> piagam dibuat ulang
  });
  if (out.length) { sh.getRange(2, 11, out.length, 1).setValues(out); sh.getRange(2, 14, out.length, 2).setValues(bersihLink); }
  return n;
}
function admJuaraOtomatis(t) {
  adm_(t);
  return kerja_(function () {
    var h = hitungRekap_();
    if (!h.baris.length) throw new Error('Belum ada nilai juri yang tersimpan.');
    tulisRekap_(h);
    var peta = {}, label = {};
    h.baris.forEach(function (b) { if (b.juara) peta[b.id] = b.juara; });
    Object.keys(h.kodeAda).forEach(function (k) { label[LOMBA[k].label] = 1; });
    return { ok: true, n: terapJuara_(peta, label), seri: h.seri };
  });
}
function admSetJuara(t, nomor, juara) {
  adm_(t);
  if (juara && JUARA.indexOf(juara) < 0) throw new Error('Juara tidak valid.');
  return kerja_(function () {
    var sh = sheet_(SH_PES), ada = false;
    baca_(sh, H_PES.length).forEach(function (r, i) {
      if (r[0] !== nomor) return;
      ada = true;
      if (r[10] !== juara) { sh.getRange(i + 2, 11).setValue(juara); sh.getRange(i + 2, 14, 1, 2).setValues([['', '']]); }
    });
    if (!ada) throw new Error('Nomor tidak ditemukan.');
    return { ok: true };
  });
}

// ================== SERTIFIKAT & PIAGAM (Google Slides -> PDF) ==================
function folderSert_(jenis) {
  var key = 'folder_' + jenis + '_id', id = pengaturan_()[key];
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder(jenis === 'piagam' ? 'Piagam Juara - Festival Kreasi Aisyiyah' : 'Sertifikat Peserta - Festival Kreasi Aisyiyah');
  setPeng_(key, f.getId());
  return f;
}

function tb_(s, teks, x, y, w, h, o) {
  var sh = s.insertTextBox(teks, x, y, w, h), tx = sh.getText();
  tx.getTextStyle().setFontFamily(o.font || 'Montserrat').setFontSize(o.size || 11).setForegroundColor(o.color || '#12251d')
    .setBold(!!o.bold).setItalic(!!o.italic);
  tx.getParagraphStyle().setParagraphAlignment(o.align || SlidesApp.ParagraphAlignment.CENTER);
  sh.setContentAlignment(o.mid ? SlidesApp.ContentAlignment.MIDDLE : SlidesApp.ContentAlignment.TOP);
  return sh;
}
function rect_(s, x, y, w, h, fill) {
  var r = s.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  r.getFill().setSolidFill(fill); r.getBorder().setTransparent();
  return r;
}
function frame_(s, x, y, w, h, warna, tebal) {
  var r = s.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  r.getFill().setTransparent(); r.getBorder().setWeight(tebal); r.getBorder().getLineFill().setSolidFill(warna);
  return r;
}

/** Membuat template Google Slides (720×405 pt) berisi placeholder {{...}} dan menyimpan ID-nya di sheet Pengaturan. */
function buatTemplate_(jenis) {
  var piagam = jenis === 'piagam';
  var HIJAU = '#0B4A35', EMAS = '#C9A227', EMAS_T = '#E9C46A', TINTA = '#12251D';
  var pres = SlidesApp.create((piagam ? 'TEMPLATE Piagam Juara' : 'TEMPLATE Sertifikat Peserta') + ' – Festival Kreasi ’Aisyiyah');
  var s = pres.getSlides()[0];
  s.getPageElements().forEach(function (e) { e.remove(); });
  s.getBackground().setSolidFill(piagam ? HIJAU : '#FFFFFF');
  var C = SlidesApp.ParagraphAlignment.CENTER;
  var warnaTeks = piagam ? '#FFFFFF' : TINTA, warnaJudul = piagam ? EMAS_T : HIJAU, redup = piagam ? '#CFE8DA' : '#5A6E62';

  // bingkai ganda + ornamen sudut
  frame_(s, 14, 14, 692, 377, piagam ? EMAS_T : HIJAU, piagam ? 4 : 6);
  frame_(s, 26, 26, 668, 353, piagam ? '#CFE8DA' : EMAS, 1);
  [[26, 26], [676, 26], [26, 361], [676, 361]].forEach(function (p) { rect_(s, p[0] - 2, p[1] - 2, 20, 20, piagam ? EMAS_T : EMAS); });
  if (!piagam) { rect_(s, 14, 14, 692, 0.01, HIJAU); }

  // logo
  try { s.insertImage(DriveApp.getFileById(CONFIG.LOGO_FILE_ID).getBlob(), 322, 34, 56, 56); } catch (e) {}

  tb_(s, 'PONDOK PESANTREN PUTERI UMMUL MUKMININ ’AISYIYAH SULAWESI SELATAN', 60, 92, 600, 16, { size: 9.5, bold: true, color: warnaJudul });
  tb_(s, piagam ? 'PIAGAM PENGHARGAAN' : 'SERTIFIKAT', 60, 106, 600, 42, { font: 'Playfair Display', size: piagam ? 28 : 32, bold: true, color: warnaJudul, mid: true });
  tb_(s, 'Nomor: {{NOMOR}}', 60, piagam ? 146 : 148, 600, 14, { size: 8.5, color: redup });
  tb_(s, 'diberikan kepada', 60, 162, 600, 16, { size: 10.5, italic: true, color: redup });
  tb_(s, '{{NAMA}}', 60, 176, 600, 42, { font: 'Playfair Display', size: 25, bold: true, italic: true, color: piagam ? '#FFFFFF' : HIJAU, mid: true });
  rect_(s, 200, 220, 320, 1.5, piagam ? EMAS_T : EMAS);

  if (!piagam) {
    tb_(s, '{{SATUAN}}  ·  {{KELAS}}', 60, 225, 600, 16, { size: 11, bold: true, color: warnaTeks });
    tb_(s, '{{TIM}}', 60, 241, 600, 16, { size: 10, italic: true, color: redup });
    tb_(s, 'telah berpartisipasi sebagai peserta dalam {{CABANG}} pada Festival Kreasi ’Aisyiyah – Semarak Hari Ber-’Aisyiyah yang diselenggarakan pada {{TANGGAL}} di Pondok Pesantren Puteri Ummul Mukminin ’Aisyiyah Sulawesi Selatan, Makassar.',
      120, 264, 480, 48, { size: 10.5, color: warnaTeks });
    tb_(s, CONFIG.TTD1_JABATAN + ',', 70, 322, 240, 14, { size: 10, color: warnaTeks });
    tb_(s, CONFIG.TTD1_NAMA, 70, 362, 240, 14, { size: 10, bold: true, color: HIJAU });
    tb_(s, CONFIG.TTD2_JABATAN + ',', 410, 322, 240, 14, { size: 10, color: warnaTeks });
    tb_(s, CONFIG.TTD2_NAMA, 410, 362, 240, 14, { size: 10, bold: true, color: HIJAU });
  } else {
    tb_(s, '{{TIM}}', 200, 224, 320, 16, { size: 10, italic: true, color: redup });
    tb_(s, 'atas prestasinya sebagai', 200, 242, 320, 14, { size: 10.5, italic: true, color: redup });
    tb_(s, '{{JUARA}}', 200, 254, 320, 40, { font: 'Playfair Display', size: 30, bold: true, color: EMAS_T, mid: true });
    tb_(s, '{{CABANG}} · {{KATEGORI}}', 200, 296, 320, 18, { size: 11.5, bold: true, color: '#FFFFFF' });
    tb_(s, 'Festival Kreasi ’Aisyiyah – Semarak Hari Ber-’Aisyiyah · {{TANGGAL}}', 200, 316, 320, 24, { size: 8.5, color: redup });
    tb_(s, CONFIG.TTD1_JABATAN + ',', 40, 318, 170, 14, { size: 9.5, color: '#FFFFFF' });
    tb_(s, CONFIG.TTD1_NAMA, 40, 360, 170, 14, { size: 9.5, bold: true, color: EMAS_T });
    tb_(s, CONFIG.TTD2_JABATAN + ',', 510, 318, 170, 14, { size: 9.5, color: '#FFFFFF' });
    tb_(s, CONFIG.TTD2_NAMA, 510, 360, 170, 14, { size: 9.5, bold: true, color: EMAS_T });
  }
  pres.saveAndClose();
  var id = pres.getId();
  try { DriveApp.getFileById(id).moveTo(folderSert_(jenis)); } catch (e) {}
  setPeng_('template_' + jenis + '_id', id);
  return id;
}
function templateId_(jenis, paksa) {
  var id = pengaturan_()['template_' + jenis + '_id'];
  if (id && !paksa) { try { DriveApp.getFileById(id); return id; } catch (e) {} }
  return buatTemplate_(jenis);
}

function buatPdf_(tplId, folder, nilai, namaFile) {
  var salin = DriveApp.getFileById(tplId).makeCopy('tmp_' + namaFile);
  try {
    var pres = SlidesApp.openById(salin.getId());
    Object.keys(nilai).forEach(function (k) { pres.replaceAllText('{{' + k + '}}', String(nilai[k] == null ? '' : nilai[k])); });
    pres.saveAndClose();
    return folder.createFile(salin.getAs(MimeType.PDF).setName(namaFile + '.pdf')).getUrl();
  } finally { salin.setTrashed(true); }
}

/** Membuat PDF sertifikat/piagam secara bertahap. Mengembalikan jumlah selesai/gagal/sisa. */
function generateCore_(jenis, ulangGagal) {
  var piagam = jenis === 'piagam', cS = piagam ? 13 : 11, cL = piagam ? 14 : 12;
  var tplId = templateId_(jenis, false), folder = folderSert_(jenis);
  var sh = sheet_(SH_PES), d = baca_(sh, H_PES.length), mulai = Date.now(), selesai = 0, gagal = 0, sisa = 0;
  for (var i = 0; i < d.length; i++) {
    var r = d[i];
    if (!r[2] || r[cL]) continue;
    if (piagam && !r[10]) continue;
    if (!ulangGagal && String(r[cS]).indexOf('Gagal') === 0) continue;
    if (Date.now() - mulai > CONFIG.BATAS_WAKTU_MS) { sisa++; continue; }
    var pengelola = r[4] === SAT_PENGELOLA;
    var nilai = { NAMA: r[2], SATUAN: r[4], KELAS: r[5], CABANG: r[6], TIM: r[7] ? 'Tim “' + r[7] + '”' : '', NOMOR: r[0], JUARA: r[10],
      KATEGORI: pengelola ? 'Kategori Pengelola Pesantren dan Panitia' : 'Jenjang ' + r[4], TANGGAL: CONFIG.TANGGAL_KEGIATAN };
    var nama = (piagam ? 'Piagam_' : 'Sertifikat_') + r[0] + '_' + String(r[2]).replace(/[\\/:*?"<>|]/g, '');
    try {
      var url = buatPdf_(tplId, folder, nilai, nama);
      sh.getRange(i + 2, cS, 1, 2).setValues([['Selesai', url]]);
      selesai++;
    } catch (e) {
      sh.getRange(i + 2, cS).setValue('Gagal: ' + e.message);
      gagal++;
    }
  }
  return { selesai: selesai, gagal: gagal, sisa: sisa, folder: folder.getUrl() };
}

function admSertStatus(t) {
  adm_(t);
  var s = pengaturan_(), out = { sertifikat: {}, piagam: {} };
  ['sertifikat', 'piagam'].forEach(function (j) {
    var tid = s['template_' + j + '_id'], fid = s['folder_' + j + '_id'];
    out[j] = { template: tid ? 'https://docs.google.com/presentation/d/' + tid + '/edit' : '', folder: fid ? 'https://drive.google.com/drive/folders/' + fid : '' };
  });
  var pes = baca_(sheet_(SH_PES), H_PES.length), gagal = 0, gagalP = 0;
  pes.forEach(function (r) { if (String(r[11]).indexOf('Gagal') === 0) gagal++; if (String(r[13]).indexOf('Gagal') === 0) gagalP++; });
  out.sertifikat.total = pes.length; out.sertifikat.dibuat = pes.filter(function (r) { return r[12]; }).length; out.sertifikat.gagal = gagal;
  out.piagam.total = pes.filter(function (r) { return r[10]; }).length; out.piagam.dibuat = pes.filter(function (r) { return r[14]; }).length; out.piagam.gagal = gagalP;
  out.rilisSertifikat = s.rilis_sertifikat === 'ya'; out.rilisPiagam = s.rilis_piagam === 'ya';
  return out;
}
function admBuatTemplate(t, jenis) {
  adm_(t);
  if (['sertifikat', 'piagam'].indexOf(jenis) < 0) throw new Error('Jenis tidak valid.');
  return kerja_(function () { var id = templateId_(jenis, true); return { ok: true, url: 'https://docs.google.com/presentation/d/' + id + '/edit' }; });
}
function admGenerate(t, jenis, ulang) {
  adm_(t);
  if (['sertifikat', 'piagam'].indexOf(jenis) < 0) throw new Error('Jenis tidak valid.');
  return kerja_(function () { return generateCore_(jenis, !!ulang); });
}
function admReset(t, jenis) {
  adm_(t);
  if (['sertifikat', 'piagam'].indexOf(jenis) < 0) throw new Error('Jenis tidak valid.');
  return kerja_(function () {
    var sh = sheet_(SH_PES), n = baca_(sh, H_PES.length).length, c = jenis === 'piagam' ? 14 : 12;
    if (n) sh.getRange(2, c - 1, n, 2).clearContent();
    return { ok: true };
  });
}

// ================== AKSES SERTIFIKAT OLEH PESERTA (nomor + email) ==================
function verifikasiPeserta_(nomor, email) {
  nomor = String(nomor || '').trim().toUpperCase(); email = String(email || '').trim().toLowerCase();
  if (!nomor || !email) throw new Error('Isi nomor registrasi dan email.');
  var cache = CacheService.getScriptCache(), kf = 'cs_' + nomor, n = parseInt(cache.get(kf) || '0', 10);
  if (n >= 8) throw new Error('Terlalu banyak percobaan. Coba lagi dalam 10 menit.');
  var reg = null;
  baca_(sheet_(SH_REG), H_REG.length).forEach(function (r) { if (r[2] === nomor) reg = r; });
  if (!reg || !reg[15] || String(reg[15]).toLowerCase() !== email) {
    cache.put(kf, String(n + 1), 600);
    throw new Error('Nomor registrasi atau email tidak cocok.');
  }
  return { reg: reg, set: pengaturan_() };
}
function cariSertifikat(nomor, email) {
  var v = verifikasiPeserta_(nomor, email), reg = v.reg, s = v.set;
  var rs = s.rilis_sertifikat === 'ya', rp = s.rilis_piagam === 'ya', ang = [], i = 0;
  baca_(sheet_(SH_PES), H_PES.length).forEach(function (r) {
    if (r[0] !== reg[2]) return;
    ang.push({ i: i++, nama: r[2], satuan: r[4], kelas: r[5],
      juara: rp ? r[10] : '',
      sertifikat: !rs ? 'belum' : (r[12] ? 'siap' : 'proses'),
      piagam: !r[10] ? 'tidak' : (!rp ? 'belum' : (r[14] ? 'siap' : 'proses')) });
  });
  ang.forEach(function (a) { if (a.piagam === 'belum') a.piagam = 'tidak'; });   // juara dirahasiakan sampai dirilis
  return { nomor: reg[2], cabang: reg[3], nama: reg[6], satuan: reg[7], anggota: ang, rilisSertifikat: rs, rilisPiagam: rp };
}
function unduhSertifikat(nomor, email, idx, jenis) {
  var v = verifikasiPeserta_(nomor, email), s = v.set, piagam = jenis === 'piagam';
  if (['sertifikat', 'piagam'].indexOf(jenis) < 0) throw new Error('Jenis tidak valid.');
  if ((piagam ? s.rilis_piagam : s.rilis_sertifikat) !== 'ya') throw new Error('Belum dirilis oleh panitia.');
  var n = -1, url = '', nama = '';
  baca_(sheet_(SH_PES), H_PES.length).forEach(function (r) {
    if (r[0] !== v.reg[2]) return;
    n++;
    if (n === Number(idx)) { nama = r[2]; url = piagam ? (r[10] ? r[14] : '') : r[12]; }
  });
  var m = String(url).match(/\/d\/([\w-]+)/);
  if (!m) throw new Error('File belum tersedia. Coba lagi nanti.');
  var blob = DriveApp.getFileById(m[1]).getBlob();
  return { namaFile: (piagam ? 'Piagam_' : 'Sertifikat_') + v.reg[2] + '_' + nama.replace(/[^\w\- ]/g, '') + '.pdf',
           base64: Utilities.base64Encode(blob.getBytes()) };
}

// ================== MENU DI GOOGLE SHEETS (opsional, untuk panitia) ==================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Festival ’Aisyiyah')
    .addItem('Siapkan sheet (setup)', 'setup')
    .addItem('Perbarui rekap nilai', 'menuRekap')
    .addToUi();
}
function menuRekap() {
  var h = hitungRekap_();
  if (!h.baris.length) { SpreadsheetApp.getUi().alert('Belum ada nilai juri.'); return; }
  tulisRekap_(h);
  SpreadsheetApp.getUi().alert('Sheet "' + SH_REK + '" diperbarui.' + (h.seri.length ? '\nNilai seri: ' + h.seri.join('; ') : ''));
}
