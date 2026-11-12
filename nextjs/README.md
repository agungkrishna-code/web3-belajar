# Jembatan: docs belajar frontend Web3

Docs web statis untuk tahap 5: Next.js, TypeScript, Wagmi, Viem, MetaMask, dan kontrak Solidity dari sisi antarmuka. Materi berbahasa Indonesia, berjalan lokal, dan tidak mengirim data ke mana pun.

Ini lanjutan dari [docs fondasi Web3](../docs/), [docs Solidity](../solidity/), dan [docs tooling](../tools/).

## Menjalankan

Buka `index.html` langsung di browser, atau jalankan server dari folder induk:

```powershell
cd ..
python -m http.server 8765
```

Lalu buka `http://127.0.0.1:8765/nextjs/`.

Kalau hanya ingin membaca docs, server dari folder ini juga cukup:

```powershell
cd nextjs
python -m http.server 8765
```

## Isi

- 17 bab materi: dari peran Next.js dan App Router sampai proyek MiniVault dApp.
- 12 lab interaktif: stack classifier, batas server/client, config builder, connect wallet, saldo, baca kontrak, kirim transaksi, signature, status transaksi, event feed, pesan error, dan checklist.
- Satu alur simulasi wallet yang dipakai bersama oleh panel atas dan lab: connect, ganti akun, ganti chain, deposit, signature, dan event.
- 20 soal uji kompetensi dengan penjelasan setiap jawaban.
- Pencarian materi, daftar isi per bab, mode terang dan gelap, progres per bab, dan navigasi mobile.
- Contoh kode lengkap untuk config Wagmi, provider, connect, balance, read, write, receipt, signature, verifikasi server, dan event.

## Peta bab

| Bab | Topik |
| --- | --- |
| 01 | Next.js untuk Web3 |
| 02 | Menyiapkan proyek |
| 03 | Server dan client |
| 04 | Wagmi dan Viem |
| 05 | Chain dan transport |
| 06 | Connect wallet |
| 07 | Address dan balance |
| 08 | Baca kontrak |
| 09 | Kirim transaksi |
| 10 | Tanda tangan pesan |
| 11 | Status transaksi |
| 12 | Event blockchain |
| 13 | Error dan UX |
| 14 | Struktur proyek |
| 15 | Testing dan testnet |
| 16 | Keamanan frontend |
| 17 | Proyek MiniVault dApp |
| 18 | Uji kompetensi 20 soal |
| 19 | Glosarium dan cheatsheet |
| 20 | Sumber belajar |

## Delapan target

1. Connect wallet.
2. Menampilkan address.
3. Membaca saldo ETH.
4. Membaca data kontrak.
5. Mengirim transaksi.
6. Menandatangani pesan.
7. Membaca status transaksi.
8. Menampilkan event blockchain.

## Struktur file

- `index.html`: seluruh materi, markup lab, glosarium, cheatsheet, dan kuis.
- `styles.css`: sistem desain Buku Besar, komponen wallet dan transaksi, tema terang dan gelap, layout responsif.
- `app.js`: sorotan kode, pencarian, progres, tema, TOC, state simulasi, semua lab, dan kuis.

## Asumsi versi

- Next.js App Router dengan TypeScript. Contoh memakai folder `app/` dan `"use client"` hanya pada komponen yang membutuhkan hook atau API browser.
- Wagmi 2 dan Viem 2. API yang dipakai: `createConfig`, `WagmiProvider`, `useAccount`, `useConnect`, `useBalance`, `useReadContract`, `useWriteContract`, `useWaitForTransactionReceipt`, `useSignMessage`, dan `useWatchContractEvent`.
- TanStack Query 5 sebagai cache di balik Wagmi.
- MetaMask sebagai wallet injected. WalletConnect dan MetaMask SDK disebut sebagai opsi, tetapi tidak dibahas langkah instalasinya secara mendalam.
- Solidity `^0.8.24` untuk kontrak MiniVault. Deploy memakai Foundry/Anvil atau Remix.
- Chain latihan: Sepolia (11155111) dan Anvil (31337).

Kalau kamu memakai versi lain, baca dokumentasi versi tersebut. Perubahan nama hook, opsi config, atau connector adalah sumber error yang paling sering.

## Catatan teknis

- Semua lab berjalan di browser dengan JavaScript biasa. Tidak ada wallet, RPC, atau transaksi sungguhan.
- State wallet, saldo, hash, gas, dan event di lab adalah simulasi yang diberi label. Panel atas dan Lab 04 sampai 12 memakai state simulasi yang sama.
- Lab signature memakai Web Crypto ECDSA P-256 untuk demonstrasi. Ethereum memakai secp256k1 dan Keccak-256; perbedaannya dijelaskan di dalam materi.
- Progres, checklist, dan skor tersimpan di `localStorage` perangkat. Kunci penyimpanan: `jembatan.progress.v1`, `jembatan.quiz.v1`, `jembatan.checklist.v1`, dan `jembatan.theme`.
- Batas lulus ujian adalah 16 dari 20.
- Font dimuat dari Google Fonts. Tanpa internet, font fallback tetap terbaca.
- Contoh kode tidak dijalankan di docs ini. Untuk menjalankannya, buat proyek Next.js sendiri dan ikuti Bab 02.

## Batas cakupan

Docs ini tidak membahas WalletConnect secara mendalam, account abstraction, paymaster, meta-transaction, indexer produksi, atau desain autentikasi server lengkap. Signature login dijelaskan sebagai alur, bukan implementasi produksi penuh. Untuk aplikasi yang memegang dana nyata, gunakan audit, test kontrak yang kuat, multisig, dan review keamanan independen.
