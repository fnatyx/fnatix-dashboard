# DESIGN.md: FNATIX ID Fincro Obsidian & Electric Lime

Sistem desain dashboard operasional **FNATIX ID** yang dirombak mengikuti referensi **Finance Dashboard Dark Mode (Fincro)** dengan permukaan obsidian bersih (`#090A09` / `#141614` / `#1A1D19`), sudut kartu membulat `20px`, kartu ringkasan terpadu dengan tiga sub-panel dan equalizer micro-bar vertikal, serta aksen utama **Electric Lime** (`#D6FF3F`), **Emerald** (`#34D399`), dan **Sky Cyan** (`#38BDF8`).

## Dials & Arah

- **Mode**: Operate (Dashboard keuangan & operasional harian)
- **Dial**: `ENERGY 2 / RHYTHM 2 / MOTION 1`
- **Watak**: Permukaan gelap pekat presisi (`#090A09` / `#141614`) beserta pasangan Daylight Light Mode (`#F3F5F0` / `#FFFFFF`), hairline tipis `1px`, angka Rupiah tabular (`.num`), dan tombol aksi cepat melingkar.

## Palet Warna & Dua Kategori Utama

1. **Netral Dasar**:
   - Gelap (default): `--bg #090A09`, `--rail-bg #0E100E`, `--surface #141614`, `--surface-2 #1A1D19`, `--ink #F5F7F2`, `--ink-2 #A3ABA0`, `--ink-3 #869083`
   - Terang: `--bg #F4F7FB`, `--rail-bg #FFFFFF`, `--surface #FFFFFF`, `--surface-2 #F1F5F9`, `--ink #0F172A`, `--ink-2 #475569`, `--ink-3 #57657A`
2. **Kategori 1: Pendapatan Jasa Edit (dua buku terpisah)**:
   - **Jasa Edit (FNATIX ID)**: Electric Lime (`#D6FF3F` gelap / `#84CC16` & `#D6FF3F` terang)
   - **Jasa Edit (Freelance)**: Sky Cyan (`#38BDF8` gelap / `#0EA5E9` terang)
3. **Kategori 2: Penjualan Produk Digital**:
   - Emerald Mint (`#34D399` gelap / `#10B981` terang)
4. **Status Order Selesai**:
   - Lencana hijau `Selesai` pada baris order, serta dialog **Bukti Order Selesai** (`ORDER SELESAI`) dengan banner Emerald terverifikasi.

## Aturan Keras

- Seluruh kata **FNATIX ID** pada antarmuka ditulis kapital penuh (`FNATIX ID`).
- Seluruh key Supabase (`app_data`) dan pemisahan buku (`fnatixTransactions`, `fnatixFreelanceOrders` / `fnatixFreelanceIncome`, `produkDigital`) tidak berubah.
- Em dash dilarang pada seluruh teks antarmuka.
