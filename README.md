# Portal Festival Kreasi ’Aisyiyah

Portal satu halaman untuk **Festival Kreasi ’Aisyiyah – Semarak Hari Ber-’Aisyiyah** (27 November 2026).

| Bagian | Isi |
|---|---|
| Beranda | Dasbor informasi dari TOR: tema, jadwal, cabang lomba + jumlah pendaftar per jenjang, tujuan, penghargaan, ketentuan, panitia |
| Registrasi | Form peserta/tim (termasuk **email**), bukti registrasi dikirim ke email |
| Sertifikat | Peserta mengunduh sertifikat/piagam dengan **nomor registrasi + email** |
| Juri | Masuk dengan kode juri; daftar peserta/tim terisi otomatis dari data registrasi |
| Admin | Dasbor, kendali aplikasi, data pendaftar, juri per lomba, hasil dan juara, pembuatan sertifikat |

Arsitektur: `index.html` statis di **GitHub Pages** memanggil **Google Apps Script Web App** (API JSON) yang menyimpan semua data ke **Google Sheet**.

```
index.html            ← frontend (GitHub Pages)
apps-script/Code.gs   ← backend (tempel ke Apps Script)
assets/               ← taruh logo-aisyiyah.png di sini
```

## 1. Siapkan Google Sheet + Apps Script
1. Buat Google Sheet baru (mis. “Data Festival Kreasi Aisyiyah”).
2. **Extensions → Apps Script**, hapus isi file bawaan, tempel seluruh `apps-script/Code.gs`.
3. **Project Settings (ikon roda gigi) → Script properties → Add**:
   - `KODE_JURI` = `JuriFestival2026`
   - `KODE_ADMIN` = kode rahasia pilihan Anda (jangan sama dengan kode juri)
   
   Kode **tidak** ditulis di `Code.gs` supaya aman jika repo publik.
4. Pilih fungsi `setup` lalu **Run** sekali, dan setujui izin (Sheets, Drive, Slides, email). Sheet `Pendaftaran`, `Peserta`, `Penilaian`, `Juri`, `Pengaturan` dibuat otomatis; daftar juri diisi dari TOR.
5. Opsional di `CONFIG`: `URL_PORTAL` (alamat GitHub Pages, untuk isi email), `LOGO_FILE_ID`, nama penandatangan sertifikat.

## 2. Deploy sebagai API
**Deploy → New deployment → Web app**
- Execute as: **Me**
- Who has access: **Anyone**

Salin URL berakhiran `/exec`. Setiap kali `Code.gs` diubah: **Deploy → Manage deployments → Edit → New version**.

## 3. Pasang frontend di GitHub Pages
1. Buka `index.html`, ubah baris `var API_URL="GANTI_DENGAN_URL_WEB_APP";` menjadi URL `/exec` tadi.
2. Taruh logo di `assets/logo-aisyiyah.png`.
3. Upload semua file ke repo GitHub, lalu **Settings → Pages → Deploy from a branch → main / (root)**.
4. Alamat portal: `https://<username>.github.io/<nama-repo>/`.

## 4. Alur hari-H
1. **Sebelum acara**: pastikan daftar juri tiap lomba benar di Admin → Juri.
2. **Registrasi**: peserta mendaftar; nama peserta/tim otomatis tampil di form juri sesuai cabang.
3. **Lomba**: juri masuk dengan kode juri, memilih lomba dan namanya, lalu menilai. Nilai dapat diubah selama penilaian dibuka.
4. **Setelah lomba**: Admin → *Penilaian dibuka* dimatikan → *Hasil dan juara* → **Hitung ulang dan tetapkan juara otomatis** → koreksi manual jika ada nilai seri.
5. **Sertifikat**: Admin → *Sertifikat* → **Buat PDF yang belum ada** untuk sertifikat dan piagam (berjalan bertahap otomatis, biarkan halaman terbuka).
6. **Pengumuman 14.00**: aktifkan **Rilis sertifikat** dan **Rilis piagam**. Peserta mengunduh dari tab Sertifikat.

Template sertifikat/piagam dibuat otomatis di Google Slides (tautan ada di Admin → Sertifikat) dan boleh Anda ubah desainnya; pertahankan placeholder `{{NAMA}} {{SATUAN}} {{KELAS}} {{CABANG}} {{TIM}} {{NOMOR}} {{JUARA}} {{KATEGORI}} {{TANGGAL}}`.

## Aturan juara (sesuai TOR bagian Penghargaan)
- Puisi, Esai Kelompok, Poster: Juara I–III **per jenjang**
- Orasi, Drama Mini: Juara I–III seluruh peserta
- Ranking 1: satu juara kategori Santriwati dan satu juara kategori Pengelola/Panitia

## Keamanan
- Kode juri/admin hanya ada di Script properties, diperiksa di server, dibatasi percobaan salah.
- Sertifikat tidak dibagikan lewat tautan Drive publik; file diambil server setelah nomor + email cocok.
- Juara disembunyikan dari peserta sampai *Rilis piagam* diaktifkan.
- Jangan commit file berisi kode rahasia atau ID Sheet ke repo publik.
