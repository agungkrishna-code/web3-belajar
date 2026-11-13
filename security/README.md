# Benteng: keamanan smart contract dan konsep lanjutan Web3

Docs web statis untuk tahap 7: reentrancy, access control, integer dan pembulatan, manipulasi oracle, front-running, flash loan, keamanan tanda tangan, pola pertahanan, pengujian, OWASP, audit, insiden, lalu eksplorasi DeFi, DAO, NFT, account abstraction, Layer 2, IPFS, indexing, dan zero knowledge proof. Materi berbahasa Indonesia, berjalan lokal, dan tidak mengirim data ke mana pun.

Ini lanjutan dari [docs fondasi pemrograman](../fundamentals/), [docs fondasi Web3](../docs/), [docs Solidity](../solidity/), [docs tooling](../tools/), [docs frontend](../nextjs/), dan [docs deploy](../deploy/).

## Menjalankan

Buka `index.html` langsung di browser, atau jalankan server dari folder induk:

```powershell
cd ..
python -m http.server 8765
```

Lalu buka `http://127.0.0.1:8765/security/`.

Kalau hanya ingin membaca docs, server dari folder ini juga cukup:

```powershell
python -m http.server 8765
```

## Isi

- 22 bab: dari permukaan serangan dan model ancaman sampai mini-audit MiniVault.
- 13 lab interaktif: permukaan serangan, reentrancy, access control, integer, oracle, front-running, flash loan, signature, urutan CEI, fuzz invariant, triase OWASP, runbook insiden, dan gate kesiapan.
- 20 soal uji kompetensi dengan penjelasan setiap jawaban.
- Progres per bab, skor terbaik, dan checklist gate tersimpan di `localStorage` perangkat.
- Pencarian materi, daftar isi per bab, mode terang dan gelap, serta navigasi mobile dan toolbar mengambang (daftar isi, lanjut, ke atas).
- Contoh kode Solidity, Foundry, Aave, Chainlink, EIP-712, ERC-4337, dan catatan arsitektur.

## Peta bab

| Bab | Topik |
| --- | --- |
| 01 | Permukaan serangan |
| 02 | Model ancaman |
| 03 | Anatomi panggilan |
| 04 | Reentrancy |
| 05 | Access control |
| 06 | Integer dan pembulatan |
| 07 | Manipulasi oracle |
| 08 | Front-running dan MEV |
| 09 | Flash loan attacks |
| 10 | Keamanan tanda tangan |
| 11 | Pola pertahanan |
| 12 | Pengujian keamanan |
| 13 | OWASP dan triase |
| 14 | Audit dan insiden |
| 15 | DeFi |
| 16 | DAO dan governance |
| 17 | NFT |
| 18 | Account abstraction |
| 19 | Layer 2 dan bridge |
| 20 | IPFS dan indexing |
| 21 | Zero knowledge proof |
| 22 | Mini-audit MiniVault |
| 23 | Uji kompetensi 20 soal |
| 24 | Glosarium dan cheatsheet |
| 25 | Sumber belajar |

## Tiga belas lab

1. Nilai risiko setiap fungsi berdasarkan dampaknya.
2. Jalankan serangan reentrancy, lalu tutup celahnya.
3. Susun matriks hak akses dengan hak minimum.
4. Hitung overflow 8-bit dan sisa pembulatan share.
5. Hitung biaya menggeser oracle dan respons TWAP.
6. Simulasikan sandwich di mempool dan relay privat.
7. Hitung kelayakan serangan berbasis flash loan.
8. Tanda tangani permit, lalu uji replay dan domain.
9. Susun urutan checks-effects-interactions.
10. Jalankan fuzz invariant pada vault dengan pembulatan keliru.
11. Triase lima temuan ke kategori OWASP.
12. Pilih tindakan pertama saat insiden dana keluar.
13. Jalankan gate kesiapan keamanan.

## Asumsi versi

- Solidity `^0.8.24` dengan aritmetika checked bawaan. Contoh memakai OpenZeppelin Contracts 5.x.
- Foundry 1.x untuk unit test, fuzz, dan invariant. Alat seperti Echidna, Medusa, Slither, dan Halmos punya konfigurasi sendiri.
- OWASP Smart Contract Top 10 2026. Daftar 2025 memakai urutan dan kategori yang berbeda.
- Aave V3 flash loan dengan biaya 0,05 persen saat deploy. Nilai aktual dibaca dari `FLASHLOAN_PREMIUM_TOTAL`.
- Chainlink data feeds dan sequencer uptime feeds. Alamat feed berbeda per chain.
- EIP-712 untuk tanda tangan terstruktur, EIP-1271 untuk smart account, ERC-4337 untuk account abstraction, dan EIP-7702 untuk delegasi EOA.

Kalau kamu memakai versi lain, baca dokumentasi versi tersebut. Perubahan nama fungsi, kategori OWASP, atau alamat feed adalah sumber kesalahan yang paling sering.

## Kunci penyimpanan

- `benteng.progress.v1`
- `benteng.quiz.v1`
- `benteng.gate.v1`
- `benteng.theme`

Batas lulus ujian adalah 16 dari 20.

## Catatan teknis

- Semua lab berjalan di browser dengan JavaScript biasa. Tidak ada EVM, wallet, RPC, atau dana sungguhan.
- Hash, signature, alamat, dan saldo di lab adalah simulasi yang diberi label. Lab oracle, front-running, flash loan, dan invariant memakai aritmetika nyata dari input, dengan parameter pasar yang disederhanakan.
- Contoh kode tidak dijalankan di halaman ini. Untuk menjalankannya, buat proyek Foundry atau gunakan Remix dan ikuti bab terkait.
- Progres, gate, dan skor hanya tersimpan di browser ini. Menghapus data situs akan menghapusnya.
- Font dimuat dari Google Fonts. Tanpa internet, font fallback sistem tetap terbaca.

## Keamanan

Docs ini mengajarkan cara berpikir, bukan memberi jaminan bahwa kontrakmu aman. Jangan memakai contoh kode apa adanya untuk dana nyata. Gunakan wallet development, testnet, audit independen, multisig, timelock, monitoring, dan bug bounty. Jangan pernah memasukkan private key atau seed phrase ke halaman, repositori, atau alat yang tidak kamu percaya.

## Batas cakupan

Docs ini tidak membahas audit formal tingkat lanjut, formal verification dari nol, MEV khusus builder, pengelolaan validator, desain bridge dari nol, atau kriptografi zero knowledge tingkat implementasi. Untuk aplikasi yang memegang dana nyata, gunakan audit, pengujian pada fork mainnet, pemantauan, dan review independen.
