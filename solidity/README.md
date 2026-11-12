# Kontrak: docs belajar Solidity

Docs web statis untuk tahap 3: Solidity, EVM, lima proyek kontrak, standar token, OpenZeppelin, dan proses deploy. Materi berbahasa Indonesia, berjalan lokal, dan tidak mengirim data ke mana pun.

## Menjalankan

Buka `index.html` langsung di browser, atau jalankan server dari folder induk:

```powershell
cd ..
python -m http.server 8765
```

Lalu buka `http://127.0.0.1:8765/solidity/`.

Kalau hanya ingin membaca docs, server dari folder ini juga cukup:

```powershell
python -m http.server 8765
```

## Isi

- 20 bab materi: dari akun kontrak dan EVM sampai testing dan deploy.
- 11 lab interaktif: satuan ETH, visibility, revert, todo, packing storage, akses dan event, vault dengan simulasi reentrancy, ERC-20, ERC-721, ERC-1155, dan alur todo lanjutan.
- 5 proyek kontrak lengkap: Counter, Todo List, Voting, Simple Wallet, Basic Token.
- Standar ERC-20, ERC-721, dan ERC-1155, termasuk kode OpenZeppelin dan jebakan integrasi.
- 20 soal uji kompetensi dengan penjelasan setiap jawaban.
- Pencarian materi, daftar isi per bab, mode terang dan gelap, progres per bab, dan navigasi mobile.

## Peta bab

| Bab | Topik |
| --- | --- |
| 01 | Kontrak dan EVM |
| 02 | Alat dan deploy pertama |
| 03 | Variabel dan tipe data |
| 04 | Fungsi, visibility, mutability |
| 05 | Alur kontrol dan error handling |
| 06 | Mapping dan struct |
| 07 | Storage, memory, calldata |
| 08 | Modifier, event, inheritance |
| 09 | Payable dan ETH |
| 10 | Keamanan kontrak |
| 11 | Proyek Counter |
| 12 | Proyek Todo List |
| 13 | Proyek Voting |
| 14 | Proyek Simple Wallet |
| 15 | Proyek Basic Token |
| 16 | ERC-20 |
| 17 | ERC-721 |
| 18 | ERC-1155 |
| 19 | OpenZeppelin |
| 20 | Testing dan deploy |
| 21 | Uji kompetensi 20 soal |
| 22 | Glosarium dan cheatsheet |
| 23 | Sumber belajar |

## Struktur file

- `index.html`: seluruh materi, markup lab, dan kuis.
- `styles.css`: sistem desain, tema terang dan gelap, komponen lab, layout responsif.
- `app.js`: sorotan kode, pencarian, progres, tema, TOC, semua lab, dan kuis.

## Asumsi versi

- Contoh Solidity memakai `pragma solidity ^0.8.24`.
- Contoh OpenZeppelin memakai seri 5.x. Di v5, hook ERC-20/ERC-721 adalah `_update`, `Ownable` membutuhkan alamat awal, dan `increaseAllowance` sudah dihapus dari `ERC20`.
- Contoh frontend memakai ethers v6 (`BrowserProvider`, `parseUnits`).
- Contoh test dan deploy memakai Foundry.

Kalau kamu memakai versi lain, baca dokumentasi versi tersebut. Perbedaan nama hook dan constructor adalah sumber error kompilasi yang paling sering.

## Catatan teknis

- Lab berjalan sepenuhnya di browser dengan JavaScript biasa. Tidak ada EVM, wallet, RPC, atau deploy sungguhan.
- Angka gas di cheatsheet adalah perkiraan untuk intuisi, bukan estimasi biaya final.
- Lab reentrancy adalah simulasi yang disederhanakan. Ia menunjukkan urutan state dan akibatnya, bukan replika EVM.
- Progres dan skor tersimpan di `localStorage` perangkat. Menghapus data situs akan menghapus progres.
- Font dimuat dari Google Fonts. Tanpa internet, font fallback tetap terbaca.

## Batas cakupan

Docs ini tidak membahas assembly, implementasi proxy dari nol, formal verification, atau ekonomi protokol secara mendalam. Untuk produksi, lanjutkan dengan audit, Foundry invariant test, dan review independen. Jangan deploy kontrak latihan ke mainnet dengan dana nyata.
