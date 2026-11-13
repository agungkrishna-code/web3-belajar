# Dermaga: docs deploy dApp ke Sepolia testnet

Docs web statis untuk tahap 6: RPC provider, testnet, wallet development, faucet, contract deployment, verifikasi, block explorer, estimasi gas, konfirmasi transaksi, dan frontend yang terhubung ke Sepolia. Materi berbahasa Indonesia, berjalan lokal, dan tidak mengirim data ke mana pun.

Ini lanjutan dari [docs fondasi Web3](../docs/), [docs Solidity](../solidity/), [docs tooling](../tools/), [docs frontend](../nextjs/), dan [docs keamanan](../security/).

## Menjalankan

Buka `index.html` langsung di browser, atau jalankan server dari folder induk:

```powershell
cd ..
python -m http.server 8765
```

Lalu buka `http://127.0.0.1:8765/deploy/`.

Kalau hanya ingin membaca docs, server dari folder ini juga cukup:

```powershell
python -m http.server 8765
```

## Isi

- 20 bab materi: dari perbedaan Anvil dan testnet sampai proyek MiniVault yang ter-deploy, terverifikasi, dan terhubung ke frontend.
- 13 lab interaktif: pemilihan jaringan, RPC bench, kelayakan faucet, env builder, pipeline deploy, kalkulator gas, pelacak konfirmasi, pencocok verifikasi, pembaca explorer, chain guard, call builder, triase error, dan gate rilis.
- 20 soal uji kompetensi dengan penjelasan setiap jawaban.
- Progres per bab, skor terbaik, dan checklist gate tersimpan di `localStorage` perangkat.
- Pencarian materi, daftar isi per bab, mode terang dan gelap, serta navigasi mobile.
- Contoh kode untuk Foundry, Cast, Remix, Hardhat 3 Ignition, Etherscan V2, Sourcify, Wagmi 2, dan Viem 2.

## Peta bab

| Bab | Topik |
| --- | --- |
| 01 | Dari lokal ke testnet |
| 02 | Jaringan dan Sepolia |
| 03 | RPC provider |
| 04 | Wallet development |
| 05 | Faucet dan test ETH |
| 06 | Environment dan konfigurasi |
| 07 | Deploy dengan Foundry |
| 08 | Deploy dengan Remix |
| 09 | Hardhat dan jalur lain |
| 10 | Alamat dan artefak |
| 11 | Estimasi gas |
| 12 | Siklus transaksi |
| 13 | Verifikasi kontrak |
| 14 | Block explorer |
| 15 | Frontend ke Sepolia |
| 16 | Baca dan tulis kontrak |
| 17 | UX transaksi dan error |
| 18 | Keamanan operasional |
| 19 | Checklist rilis |
| 20 | MiniVault ke Sepolia |
| 21 | Uji kompetensi 20 soal |
| 22 | Glosarium dan cheatsheet |
| 23 | Sumber belajar |

## Tiga belas lab

1. Pilih jaringan untuk setiap pekerjaan.
2. Baca request dan response JSON-RPC.
3. Periksa kelayakan klaim faucet.
4. Susun konfigurasi env yang aman.
5. Jalankan pipeline deploy dengan preflight.
6. Hitung biaya gas dari gas limit dan fee.
7. Ikuti transaksi sampai final atau gagal.
8. Cocokkan pengaturan verifikasi.
9. Baca field transaksi seperti di explorer.
10. Cocokkan chain wallet dan aplikasi.
11. Susun calldata dan lihat selector.
12. Triase pesan error ke tindakan.
13. Jalankan gate rilis testnet.

## Asumsi versi

- Foundry 1.x. Perintah memakai `forge script`, `forge create`, `cast`, dan `forge verify-contract`. Opsi serta perilaku resume bisa berbeda antar rilis.
- Solidity `^0.8.24` untuk MiniVault. OpenZeppelin Contracts 5.x.
- Hardhat 3 dengan Ignition dan `configVariable`. Hardhat 2 memiliki bentuk config yang berbeda.
- Remix IDE versi web saat docs ini ditulis. Nama menu dan environment bisa berubah.
- Etherscan API V2 dengan satu API key untuk banyak chain, atau Sourcify tanpa API key.
- Wagmi 2 dan Viem 2 untuk frontend. Versi mayor yang lebih baru bisa mengubah nama hook atau opsi config.
- Jaringan latihan: Sepolia (11155111) dan Anvil (31337).

Kalau kamu memakai versi lain, baca dokumentasi versi tersebut. Perubahan nama opsi, hook, atau format config adalah sumber error yang paling sering.

## Kunci penyimpanan

- `dermaga.progress.v1`
- `dermaga.quiz.v1`
- `dermaga.gate.v1`
- `dermaga.theme`

Batas lulus ujian adalah 16 dari 20.

## Catatan teknis

- Semua lab berjalan di browser dengan JavaScript biasa. Tidak ada wallet, RPC, faucet, atau transaksi sungguhan.
- Hash, alamat, blok, dan gas di lab adalah simulasi yang diberi label. Kalkulator gas memakai aritmetika nyata dari input, bukan data jaringan.
- Tidak ada private key atau API key nyata di docs ini. Placeholder seperti `<ALAMAT_KONTRAK>` dan `0xALAMAT...` harus diganti dengan hasil deploy sendiri.
- Progres, gate, dan skor hanya tersimpan di browser ini. Menghapus data situs akan menghapusnya.
- Font dimuat dari Google Fonts. Tanpa internet, font fallback sistem tetap terbaca.
- Contoh kode tidak dijalankan di halaman ini. Untuk menjalankannya, buat proyek Foundry atau Next.js sendiri dan ikuti bab terkait.

## Keamanan

Jangan memakai private key wallet utama untuk eksperimen. Gunakan wallet development dan test ETH yang tidak memiliki nilai uang. Faucet hanya membutuhkan alamat, tidak pernah seed phrase atau private key. Verifikasi source bukan jaminan keamanan kontrak.

## Batas cakupan

Docs ini tidak membahas audit formal, formal verification, MEV, upgrade proxy dari nol, operasi validator, atau sistem manajemen kunci produksi. Untuk aplikasi yang memegang dana nyata, gunakan audit, test yang kuat, multisig, monitoring, dan review independen.
