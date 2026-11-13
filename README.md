# Buku Besar

Tujuh docs web statis berbahasa Indonesia untuk belajar Web3, dari fondasi pemrograman sampai deploy dApp ke testnet, ditutup dengan keamanan smart contract. Semua materi berjalan di browser, tanpa akun, tanpa server, dan tanpa wallet yang terhubung. Progres belajar disimpan di `localStorage` perangkat.

## Isi

| Folder | Topik | Ukuran |
| --- | --- | --- |
| [`fundamentals/`](fundamentals/) | Fondasi pemrograman: JavaScript, TypeScript, async/await, JSON dan API, Git, BigInt | 17 bab, 13 lab, 1 proyek Next.js, 20 soal |
| [`docs/`](docs/) | Fondasi blockchain dan Web3: 10 konsep dasar, Web2 vs Web3, studi kasus wallet | 13 bab, 10 lab, 15 soal |
| [`solidity/`](solidity/) | Solidity, EVM, ERC-20/721/1155, OpenZeppelin, deploy | 20 bab, 11 lab, 5 proyek, 20 soal |
| [`tools/`](tools/) | Foundry, Remix, test, fuzz, invariant, Anvil, Cast, fork test | 20 bab, 13 lab, proyek MiniVault, 20 soal |
| [`nextjs/`](nextjs/) | Next.js, TypeScript, Wagmi, Viem, MetaMask, frontend dApp | 17 bab, 12 lab, proyek MiniVault dApp, 20 soal |
| [`deploy/`](deploy/) | RPC, Sepolia, faucet, deploy, verifikasi, gas, explorer, frontend testnet | 20 bab, 13 lab, proyek MiniVault ke Sepolia, 20 soal |
| [`security/`](security/) | Keamanan smart contract: reentrancy, akses, integer, oracle, MEV, flash loan, signature, audit, DeFi, DAO, NFT, AA, L2, IPFS, ZK | 22 bab, 13 lab, mini-audit MiniVault, 20 soal |

`index.html` di root adalah halaman indeks yang menautkan ketujuh docs.

## Menjalankan lokal

Buka `index.html` di root langsung di browser, atau jalankan server statis dari folder ini:

```powershell
python -m http.server 8765
```

Lalu buka `http://127.0.0.1:8765/`.

Tanpa Python:

```powershell
npx serve .
```

## Struktur repo

```text
.
├── index.html        halaman indeks
├── fundamentals/     docs fondasi pemrograman
├── docs/             docs fondasi Web3
├── solidity/         docs Solidity
├── tools/            docs tooling smart contract
├── nextjs/           docs frontend Web3
├── deploy/           docs deploy dApp ke Sepolia testnet
└── security/         docs keamanan dan konsep lanjutan
```

Setiap folder berisi `index.html`, `styles.css`, `app.js`, dan `README.md` sendiri. Folder `docs/`, `deploy/`, `fundamentals/`, dan `security/` juga punya `DESIGN.md` yang menjelaskan arah desain.

## Catatan teknis

- Tidak ada build step dan tidak ada dependensi. Cukup HTML, CSS, dan JavaScript biasa.
- Lab kriptografi memakai Web Crypto API yang tersedia di browser. Ethereum memakai algoritme berbeda (secp256k1, Keccak-256); perbedaannya dijelaskan di dalam materi.
- Respons RPC, angka gas, dan hasil deploy di lab adalah simulasi dan diberi label.
- Setiap docs punya toolbar mengambang di pojok kanan bawah: daftar isi cepat, lanjut ke bab berikutnya, dan kembali ke atas.
- Font dimuat dari Google Fonts. Tanpa internet, font fallback sistem tetap membuat materi terbaca.
- Materi ditulis ulang untuk pembelajaran, bukan salinan dokumentasi resmi. Jangan deploy kontrak latihan ke mainnet dengan dana nyata.

## Lisensi

[MIT](LICENSE) © 2026 agungkrishna-code. Bebas dipakai, diubah, dan dibagikan
dengan tetap menyertakan notice hak cipta.
