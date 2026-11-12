# Arah desain: Pondasi

Reading this as: a technical workbench for Indonesian beginners learning programming before blockchain, in the same ledger-inspired editorial system as the other Buku Besar docs, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Subjek dan audiens

Pembelajar yang sudah pernah menyentuh JavaScript dan Next.js, tetapi belum yakin bisa menjelaskan tipe, promise, API, BigInt, dan Git. Mereka butuh satu tempat untuk membangun fondasi, bukan tur lengkap semua fitur bahasa.

## Token

Sama dengan seri lain agar enam docs terasa satu perpustakaan.

- Warna: kertas `#F4F5F0`, tinta `#18201B`, hijau ledger `#145C43`, rust peringatan `#9C3D2E`, abu garis `#D6DAD0`.
- Tema gelap: kertas `#101512`, tinta `#E7E9E1`, hijau `#6FD3A6`, rust `#E8917F`.
- Tipografi: Newsreader untuk judul bab, Public Sans untuk badan, IBM Plex Mono untuk kode, angka, dan nama perintah.
- Bentuk: radius 2px sampai 4px, garis tipis, tanpa bayangan mengambang.
- Irama: prosa sempit untuk membaca, alat lab lebih lebar, tabel dan diagram memutus irama.

## Prinsip

1. Setiap angka di lab berasal dari perhitungan nyata di browser atau diberi label simulasi.
2. Lab adalah alat, bukan tangkapan layar. Setiap tombol dan input punya perilaku.
3. Satu bab satu ide besar. Istilah baru diperkenalkan saat dipakai, bukan di kamus di awal.
4. Contoh kode harus bisa dijalankan setelah pembaca membuat proyek sendiri. Tidak ada pseudo-code yang menyamar sebagai kode.
5. Progres adalah alat navigasi. Tanda selesai, checklist proyek, dan skor disimpan lokal.

## Larangan yang dipatuhi

Tanpa gradien dekoratif, glow, glassmorphism, grid latar, kartu seragam, ikon sparkle, em dash, atau klaim palsu. Gerak hanya untuk umpan balik lab dan buka tutup navigasi, sesuai dial MOTION 1.

## Alasan keputusan besar

- Palet hijau dan kertas: melanjutkan identitas buku besar, bukan estetika crypto-neon.
- Newsreader: menandai ini bahan belajar, bukan dashboard produk.
- Panel presisi di hero: topik yang paling mudah diremehkan (float vs BigInt) langsung dibuktikan sebelum pembaca masuk ke bab.
- Lab bergaris tegas: memisahkan membaca dari mencoba.
- Tanpa animasi masuk: pembaca datang untuk teks dan alat, bukan pertunjukan.
- Lebar output lab memakai monospace dan `break-all` agar wei 78 digit tidak merusak layout.
