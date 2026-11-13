# Buku Besar: docs belajar Blockchain dan Web3

Docs web statis untuk tahap 2 minggu 3: sepuluh konsep fondasi Web3, perbandingan Web2 dan Web3, studi kasus wallet, dan uji kompetensi.

Semua materi berbahasa Indonesia. Tidak ada akun, tidak ada wallet yang terhubung, dan tidak ada data lab yang dikirim ke server.

Kalau JavaScript, TypeScript, async, dan Git masih terasa longgar, mulai dari [docs fondasi pemrograman](../fundamentals/) (tahap 1).

## Menjalankan

Paling mudah, buka `index.html` di browser modern.

Kalau browser membatasi Web Crypto API saat dibuka lewat `file://`, jalankan server lokal dari folder induk `web3-belajar` agar tautan ke proyek wallet juga bekerja:

```powershell
cd ..
python -m http.server 8765
```

Lalu buka `http://127.0.0.1:8765/docs/`.

Kalau hanya ingin membaca docs, kamu juga bisa menjalankan server dari folder ini dan membuka `http://127.0.0.1:8765/`.

Alternatif:

```powershell
npx serve .
```

## Isi

- 13 bab: 10 konsep fondasi, Web2 vs Web3, studi kasus wallet, dan uji kompetensi.
- 10 lab interaktif: hash, jaringan node, pasangan kunci, signature, rantai blok, gas, konsensus (PoW dan PoS), RPC, L2, dan klasifikasi on-chain.
- Progres per bab dan skor terbaik uji kompetensi disimpan di `localStorage` perangkat.
- Pencarian materi, daftar isi per bab, mode terang dan gelap, serta navigasi mobile dan toolbar mengambang (daftar isi, lanjut, ke atas).
- Glosarium, cheatsheet satuan, dan daftar sumber resmi.

## Peta bab

| Bab | Topik |
| --- | --- |
| 01 | Apa itu blockchain |
| 02 | Distributed ledger dan decentralized network |
| 03 | Public key dan private key |
| 04 | Wallet dan digital signature |
| 05 | Hashing dan kriptografi |
| 06 | Transaction dan block |
| 07 | Gas fee |
| 08 | Consensus mechanism |
| 09 | Node dan RPC |
| 10 | Layer 1 dan Layer 2 |
| 11 | Web2 dan Web3 |
| 12 | Studi kasus wallet di folder induk |
| 13 | Uji kompetensi 15 soal |

## Struktur file

- `index.html`: seluruh materi dan markup lab.
- `styles.css`: sistem desain, tema terang dan gelap, layout responsif.
- `app.js`: hash SHA-256, lab, pencarian, progres, tema, navigasi, dan kuis.
- `DESIGN.md`: arah desain, alasan keputusan visual, dan dial.

## Catatan teknis

- Lab kunci memakai ECDSA P-256 dari Web Crypto API karena itu yang tersedia di browser. Ethereum memakai secp256k1 dan Keccak-256. Perbedaannya dijelaskan di dalam materi.
- Lab rantai memakai SHA-256 dengan kesulitan dua atau tiga nol. Ini demonstrasi, bukan replika mainnet.
- Respons RPC di Lab 08 adalah simulasi dan diberi label. Tidak ada request jaringan yang dikirim.
- Font dimuat dari Google Fonts. Kalau offline, browser memakai font fallback sistem dan semua materi tetap terbaca.
- Progres hanya tersimpan di browser ini. Menghapus data situs akan menghapus progres.

## Sumber

Daftar lengkap ada di bagian "Sumber belajar" di dalam docs, termasuk ethereum.org, EIP-1559, EIP-191, EIP-712, EIP-4361, dokumentasi Solidity, dokumentasi MetaMask, L2BEAT, dan whitepaper Bitcoin.

## Menghubungkan ke proyek wallet

Proyek wallet latihan ada di folder induk (`../index.html`). Docs Bab 12 menjelaskan alur connect, kirim ETH, serta perbaikan yang perlu dilakukan sebelum proyek itu dipakai di mainnet.
