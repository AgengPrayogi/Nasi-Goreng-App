# Rencana frontend (setelah Fase 1 API)

Dokumen ini merencanakan UI di atas backend yang sudah ada. **Gateway pembayaran (Fase 2)** sengaja ditunda sampai frontend dasar stabil.

## Stack yang disarankan

- **Vite + React + TypeScript** (atau Next.js jika ingin SEO kuat untuk menu publik).
- **React Query (TanStack Query)** untuk cache, retry, dan loading state ke REST API.
- **React Router** untuk rute terpisah pelanggan vs admin.

## Rute aplikasi

| Area | Path contoh | Auth |
|------|-------------|------|
| Menu & keranjang | `/` | Tidak |
| Checkout | `/checkout` | Tidak |
| Lacak pesanan | `/track/:orderCode` | Tidak (kode = tiket) |
| Login kasir | `/admin/login` | Tidak |
| Dashboard pesanan | `/admin/orders` | JWT |
| Antrian dapur | `/admin/kitchen` atau `/admin/queue` | JWT |
| Bahan & menu | `/admin/ingredients`, `/admin/menus` | JWT |
| Laporan | `/admin/reports` | JWT |

## Alur layar pelanggan

1. Ambil `GET /api/menus` — tampilkan harga & ketersediaan.
2. Keranjang lokal (state + `localStorage` opsional).
3. Checkout: `POST /api/orders` dengan `channel: "online"`, `customerName`, `customerPhone`, `items`, `notes`.
4. Redirect ke `/track/{orderCode}` — polling `GET /api/orders/track/:orderCode` setiap 10–15 detik untuk `status`, `kitchenStatus`, `estimatedReadyAt`, `queueNumber`.

## Alur layar kasir / admin

1. Login: `POST /api/auth/login` — simpan token (httpOnly cookie ideal; sementara `localStorage` + header `Authorization` sudah cukup untuk prototipe).
2. Daftar pesanan: `GET /api/orders` dengan filter `status`, `channel`, `queueDate`, `paymentStatus`.
3. Antrian: `GET /api/orders/queue?queueDate=YYYY-MM-DD` — urutkan sesuai `queueNumber`.
4. Aksi per pesanan:
   - Konfirmasi: `PATCH .../confirm` (nomor antrian & ETA terisi otomatis).
   - Dapur: `PATCH .../kitchen` (`preparing` → `ready`).
   - Bayar (Fase 1): `PATCH .../payment` `{ paymentStatus: "paid", paymentMethod: "cash" | "transfer" | "qris_static" }`.
   - Selesai (stok): `PATCH .../complete` — jika produksi, set `REQUIRE_PAID_BEFORE_COMPLETE=true` agar kasir wajib tandai bayar dulu.
   - Batal: `PATCH .../cancel`.

## Variabel lingkungan frontend

- `VITE_API_BASE_URL=http://localhost:5000/api` (sesuaikan domain produksi + HTTPS).

## Urutan implementasi frontend yang disarankan

1. Shell layout + client HTTP + halaman login admin.
2. Daftar pesanan + detail + aksi confirm / kitchen / payment / complete.
3. Halaman antrian (`/queue`) ringkas untuk dapur (besar, mudah dibaca).
4. Situs pelanggan: menu + checkout + lacak.
5. Polish: toast error dari `errorCode`, format Rupiah, tanggal lokal Asia/Jakarta.

## Setelah frontend stabil — Fase 2 (gateway)

- Endpoint webhook + penyimpanan `externalPaymentId`.
- UI “Bayar online” mengarahkan ke link provider; status `paymentStatus` diperbarui dari webhook.
