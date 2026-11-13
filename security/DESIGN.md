# Arah desain: Benteng

Reading this as: a security field guide for Indonesian Solidity developers moving from "it works" to "it holds under attack", in the same ledger editorial system as Buku Besar, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Hubungan dengan seri lain

Benteng adalah bagian ketujuh dari Buku Besar. Ia memakai token, tipografi, dan komponen yang sama supaya pembaca tidak belajar ulang antarmuka di setiap tahap. Identitasnya datang dari subjek dan komposisi, bukan dari palet baru.

## Token

- Kertas `#F4F5F0`, tinta `#18201B`, hijau ledger `#145C43`, rust peringatan `#9C3D2E`.
- Tema gelap: kertas `#101512`, tinta `#E7E9E1`, hijau `#6FD3A6`, rust `#E8917F`.
- Tipografi: Newsreader untuk judul, Public Sans untuk badan, IBM Plex Mono untuk kode, hash, alamat, dan angka lab.
- Bentuk: radius 2px sampai 6px, garis tipis, tanpa bayangan mengambang.

## Metafora yang dipakai secara harfiah

Nama Benteng berarti tempat bertahan. Papan serangan di pembuka bukan hiasan: ia memuat fokus, jumlah vektor wajib, rujukan OWASP, sifat kerja, dan aturan rilis. Karena itu papan ditempatkan setelah teks, bukan di sampingnya, agar tidak memotong lebar prosa dan tidak menjadi kartu dekoratif.

## Prinsip

1. Setiap lab menunjukkan kegagalan yang bisa terjadi, bukan keberhasilan yang menghibur.
2. Serangan dijelaskan sebagai rantai langkah. Satu mitigasi harus bisa memutus satu mata rantai.
3. Angka di lab berasal dari input pengguna atau diberi label simulasi. Tidak ada data pasar karangan.
4. Setiap bab menyisakan pertanyaan yang bisa diajukan ke kode sendiri.
5. Gate memakai bukti, bukan perasaan. Blocker ditampilkan, bukan disembunyikan.

## Larangan yang dipatuhi

Tanpa gradien dekoratif, glow, glassmorphism, grid latar, ikon sparkle, em dash, statistik palsu, atau tautan navigasi tanpa tujuan. Gerak hanya untuk umpan balik lab dan buka tutup navigasi, sesuai dial MOTION 1.

## Alasan keputusan besar

- Papan serangan di pembuka: memberi peta singkat sebelum prosa panjang, sekaligus menandai bahwa ini tahap keamanan, bukan tahap fitur.
- Bab model ancaman sebelum daftar serangan: mitigasi tanpa aset dan aktor hanya daftar kebiasaan.
- Lab reentrancy dengan jejak panggilan: memperlihatkan urutan state, bukan sekadar menjelaskan istilah.
- Lab oracle, front-running, dan flash loan memakai rumus nyata: pembaca bisa mengubah angka dan melihat ambang berubah.
- Lab invariant dengan seed: hasil bisa diulang, dibandingkan, dan diperiksa.
- Gate dua tingkat, siap audit dan siap mainnet: keduanya sering dicampur, padahal buktinya berbeda.
- Warna dan tipografi diwarisi: konsistensi seri lebih penting daripada variasi visual yang tidak membawa informasi.
