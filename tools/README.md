# Perkakas: docs belajar tooling smart contract

Docs web statis untuk tahap 4: Foundry, Remix, OpenZeppelin, unit test, fuzz test, invariant test, Anvil, forge script, Cast, fork test, dan debugging transaksi. Materi berbahasa Indonesia, berjalan lokal, dan tidak mengirim data ke mana pun.

Ini lanjutan dari [docs fondasi Web3](../docs/) dan [docs Solidity](../solidity/).

## Menjalankan

Buka `index.html` langsung di browser, atau jalankan server dari folder induk:

```powershell
cd ..
python -m http.server 8765
```

Lalu buka `http://127.0.0.1:8765/tools/`.

Karena CSS dan JavaScript bersama berada di `../assets/`, jalankan server dari folder induk `web3-belajar`, bukan dari folder modul ini.

## Isi

- 20 bab materi: toolchain, instalasi Foundry, struktur proyek, compile, Remix, OpenZeppelin, unit test, cheatcode, test kuat, fuzz, invariant, coverage, CI, Anvil, script, deploy testnet, Cast, fork test, debugging, dan proyek akhir.
- 13 lab interaktif: pipeline, config builder, triase error, Remix VM, komposisi OpenZeppelin, test runner, cheatcode, fuzz, invariant, Anvil, deploy dan resume, Cast, serta trace inspector.
- Proyek MiniVault lengkap: kontrak, unit test, fuzz test, invariant test, handler, script deploy, dan checklist.
- 20 soal uji kompetensi dengan penjelasan setiap jawaban.
- Pencarian materi, daftar isi per bab, mode terang dan gelap, progres per bab, navigasi mobile, dan toolbar mengambang (daftar isi, lanjut, ke atas).

## Peta bab

| Bab | Topik |
| --- | --- |
| 01 | Toolchain kontrak |
| 02 | Memasang Foundry |
| 03 | Anatomi proyek dan foundry.toml |
| 04 | Compile dan membaca error |
| 05 | Remix IDE |
| 06 | OpenZeppelin |
| 07 | Unit test pertama |
| 08 | Cheatcode dan skenario |
| 09 | Test yang kuat |
| 10 | Fuzz testing |
| 11 | Invariant testing |
| 12 | Coverage, gas, lint, dan mutasi |
| 13 | CI dan disiplin tim |
| 14 | Anvil |
| 15 | Forge script |
| 16 | Deploy testnet dan verifikasi |
| 17 | Cast CLI |
| 18 | Fork testing |
| 19 | Debugging transaksi |
| 20 | Proyek MiniVault |
| 21 | Uji kompetensi 20 soal |
| 22 | Glosarium dan cheatsheet |
| 23 | Sumber belajar |

## Struktur file

- `index.html`: seluruh materi, markup lab, glosarium, cheatsheet, dan kuis.
- `app.js`: sorotan kode, state lab, dan kuis khusus modul ini.
- `../assets/base.css`, `../assets/stage-solidity.css`, lalu `../assets/stage-tools.css`: design system dan tambahan gaya tahap ini.
- `../assets/core.js` dan `../assets/utilities.css`: perilaku dan helper bersama.

## Asumsi versi

- Foundry 1.x. Perintah mengikuti dokumentasi resmi per 2026. Fitur seperti table test, mutation test, dan resume state bisa berbeda antar versi.
- Solidity `^0.8.24` untuk contoh kontrak dan test.
- OpenZeppelin Contracts 5.x. Contoh instalasi memakai tag `v5.7.0`. Periksa rilis terbaru sebelum memakai versi lain.
- Remix IDE versi web saat docs ini ditulis. Nama menu dan environment bisa berubah.
- Etherscan API v2 untuk verifikasi, dengan opsi Sourcify tanpa API key.

Kalau kamu memakai versi lain, baca dokumentasi versi tersebut. Perbedaan constructor, hook, dan flag CLI adalah sumber error yang paling sering.

## Catatan teknis

- Semua lab berjalan di browser dengan JavaScript biasa. Tidak ada EVM, wallet, RPC, atau deploy sungguhan.
- Angka blok, hash, gas, dan alamat di lab adalah ilustrasi, bukan output jaringan nyata.
- Perintah di docs ini dijalankan pada terminal. Di Windows, Foundryup membutuhkan Git Bash atau WSL.
- Progres dan skor tersimpan di `localStorage` perangkat. Menghapus data situs akan menghapus progres.
- Kunci penyimpanan: `alat.progress.v1`, `alat.quiz.v1`, dan `alat.theme`.
- Font dimuat dari Google Fonts. Tanpa internet, font fallback tetap terbaca.
- Batas lulus ujian adalah 16 dari 20.

## Batas cakupan

Docs ini tidak membahas audit formal, formal verification, MEV, upgrade proxy dari nol, atau operasi validator. Fuzz dan invariant test menambah kepercayaan, bukan menggantikan review manusia. Jangan deploy kontrak latihan ke mainnet dengan dana nyata.
