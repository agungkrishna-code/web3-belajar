# Pondasi: docs belajar fondasi pemrograman untuk Web3

Docs web statis untuk tahap 1: JavaScript ES6+, TypeScript, async/await, JSON dan API, Git dan GitHub, serta BigInt. Materi berbahasa Indonesia, berjalan lokal, dan tidak mengirim data ke mana pun.

Ini titik masuk sebelum [docs fondasi blockchain dan Web3](../docs/). Tahap berikutnya memakai istilah dan kode dari docs ini.

## Menjalankan

Buka `index.html` langsung di browser, atau jalankan server dari folder induk:

```powershell
cd ..
python -m http.server 8765
```

Lalu buka `http://127.0.0.1:8765/fundamentals/`.

Karena CSS dan JavaScript bersama berada di `../assets/`, jalankan server dari folder induk `web3-belajar`, bukan dari folder modul ini.

## Isi

- 17 bab materi: runtime JavaScript, tipe, fungsi, array, module, promise, async/await, JSON, HTTP, BigInt, Number, TypeScript, generics, tipe API, Git, GitHub, dan proyek Next.js.
- 13 lab interaktif: presisi Number vs BigInt, tipe dan kesamaan, closure, pipeline transaksi, event loop, simulator async, JSON, inspector status HTTP, konversi wei, batas safe integer, narrowing, utility type, dan Git staging.
- 1 proyek akhir: dashboard `Denominasi` dengan route API, validasi runtime, fetch, AbortController, loading/error/empty state, dan format BigInt.
- 20 soal uji kompetensi dengan pembahasan setiap jawaban.
- Pencarian materi, daftar isi per bab, mode terang dan gelap, progres per bab, checklist proyek, navigasi mobile, dan toolbar mengambang (daftar isi, lanjut, ke atas).

## Peta bab

| Bab | Topik |
| --- | --- |
| 01 | Cara JavaScript berjalan |
| 02 | Nilai, tipe, dan kesamaan |
| 03 | Fungsi dan closure |
| 04 | Array dan object |
| 05 | Module dan struktur |
| 06 | Promise dan event loop |
| 07 | Async, await, error |
| 08 | JSON |
| 09 | HTTP dan API |
| 10 | BigInt dan wei |
| 11 | Number dan presisi |
| 12 | TypeScript dasar |
| 13 | Generics dan utility |
| 14 | Tipe API dan runtime |
| 15 | Git dari nol |
| 16 | GitHub dan kolaborasi |
| 17 | Proyek Next.js |
| 18 | Uji kompetensi 20 soal |
| 19 | Glosarium dan cheatsheet |
| 20 | Sumber belajar |

## Enam target

1. Menulis JavaScript modern: fungsi, module, array, object, dan closure.
2. Memahami asynchronous programming: promise, microtask, async/await, error, dan pembatalan.
3. Mengambil dan memvalidasi data dari API.
4. Menulis TypeScript dengan tipe, interface, union, generic, dan type guard.
5. Menghitung nilai token dengan BigInt tanpa kehilangan presisi.
6. Mencatat pekerjaan dengan Git dan mengirimnya lewat GitHub.

## Struktur file

- `index.html`: seluruh materi, markup lab, glosarium, cheatsheet, dan kuis.
- `styles.css`: delta gaya khusus Pondasi (lab presisi) setelah base bersama.
- `app.js`: state lab, interaksi, dan kuis khusus modul ini.
- `../assets/base.css`: design system, tema terang/gelap, layout responsif, dan komponen bersama.
- `../assets/core.js`: pencarian, progres, tema, navigasi, daftar isi, dan toolbar mengambang.
- `../assets/utilities.css`: helper kecil seperti `.mono`, `.sr-only`, `.row`, dan `.col`.
- `DESIGN.md`: arah desain dan alasan keputusan visual.

## Asumsi versi

- JavaScript ECMAScript 2020 atau lebih baru: BigInt, optional chaining, nullish coalescing.
- TypeScript 5.x dengan `"strict": true`.
- Next.js 15 App Router dan React 19 untuk proyek akhir.
- Node.js 20 atau 22 LTS.
- Git 2.40 atau lebih baru. Perintah `git switch` dan `git restore` dipakai.
- Viem disebut sebagai pembanding untuk `parseUnits`, tetapi tidak dipasang di docs ini.

Kalau kamu memakai versi lain, baca dokumentasi versi tersebut. Perubahan nama API dan opsi compiler adalah sumber error yang paling sering.

## Catatan teknis

- Semua lab berjalan di browser dengan JavaScript biasa. Tidak ada request jaringan, API key, atau data yang dikirim.
- Angka di lab dihitung nyata di browser, termasuk konversi BigInt dan event loop. Respons API dan latency adalah simulasi yang diberi label.
- Progres, checklist, dan skor tersimpan di `localStorage` perangkat. Kunci penyimpanan: `pondasi.progress.v1`, `pondasi.quiz.v1`, `pondasi.project.v1`, dan `pondasi.theme`.
- Batas lulus ujian adalah 16 dari 20.
- Font dimuat dari Google Fonts. Tanpa internet, font fallback sistem tetap membuat materi terbaca.
- Contoh kode tidak dijalankan di docs ini. Untuk menjalankannya, buat proyek Next.js sendiri dan ikuti Bab 17.

## Batas cakupan

Docs ini tidak membahas React dari nol, CSS tingkat lanjut, database, autentikasi, deployment produksi, atau smart contract. Fokusnya fondasi yang dipakai berulang di semua tahap berikutnya. Untuk aplikasi yang memegang dana nyata, gunakan audit, test yang kuat, dan review keamanan independen.

## Lisensi

[MIT](../LICENSE) © 2026 agungkrishna-code.
