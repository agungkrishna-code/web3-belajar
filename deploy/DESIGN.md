# Arah desain: Dermaga

Reading this as: a deployment field guide for Indonesian developers moving a dApp from Anvil to Sepolia, in the same ledger editorial system as Buku Besar, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Hubungan dengan seri lain

Dermaga adalah bagian keenam dari Buku Besar. Ia memakai token, tipografi, dan komponen yang sama supaya pembaca tidak belajar ulang antarmuka di setiap tahap. Identitasnya datang dari subjek dan komposisi, bukan dari palet baru.

## Token

- Kertas `#F4F5F0`, tinta `#18201B`, hijau ledger `#145C43`, rust peringatan `#9C3D2E`.
- Tema gelap: kertas `#101512`, tinta `#E7E9E1`, hijau `#6FD3A6`, rust `#E8917F`.
- Tipografi: Newsreader untuk judul, Public Sans untuk badan, IBM Plex Mono untuk alamat, hash, perintah, dan data jaringan.
- Bentuk: radius 2px sampai 6px, garis tipis, tanpa bayangan mengambang.

## Metafora yang dipakai secara harfiah

Nama Dermaga berarti tempat berangkat. Papan jaringan di pembuka bukan hiasan: ia memuat nama jaringan, chain ID, mata uang, explorer, sumber RPC, dan status latihan. Karena itu papan ditempatkan setelah teks, bukan di sampingnya, agar tidak memotong lebar prosa dan tidak menjadi kartu dekoratif.

## Prinsip

1. Setiap angka di lab berasal dari input pengguna atau diberi label simulasi. Tidak ada data jaringan karangan.
2. Deploy, verifikasi, dan hosting frontend dibedakan sebagai tiga bukti, bukan satu keberhasilan.
3. Lab harus berhenti atau memperingatkan saat preflight belum lengkap. Alat yang selalu bilang "berhasil" tidak mengajarkan apa pun.
4. Checklist rilis memakai bukti, bukan perasaan. Gate menyimpan pilihan lokal dan menunjukkan blocker.
5. Keamanan ditulis sebagai kebiasaan operasional, bukan slogan.

## Larangan yang dipatuhi

Tanpa gradien dekoratif, glow, glassmorphism, grid latar, ikon sparkle, em dash, statistik palsu, atau tautan navigasi tanpa tujuan. Gerak hanya untuk umpan balik lab dan buka tutup navigasi, sesuai dial MOTION 1.

## Alasan keputusan besar

- Papan jaringan di pembuka: memberi fakta yang langsung dibutuhkan wallet dan frontend, sekaligus menjadi identitas tahap ini.
- Hero satu kolom: prosa deployment butuh lebar baca, bukan dua kolom yang memaksa baris pendek.
- Lab pipeline dengan preflight: meniru urutan nyata dan menghentikan kesalahan sebelum tanda tangan.
- Kalkulator gas: mengubah rumus EIP-1559 menjadi alat, bukan bacaan.
- Gate rilis: menghubungkan seluruh bab menjadi satu keputusan yang bisa diperiksa.
- Warna dan tipografi diwarisi: konsistensi seri lebih penting daripada variasi visual yang tidak membawa informasi.
