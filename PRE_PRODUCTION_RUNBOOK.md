# Persiapan hosting awal dan pemulihan

Dokumen ini adalah target konfigurasi, bukan bukti bahwa layanan eksternal sudah dibuat. Jangan masukkan kredensial ke GitHub.

## Rekomendasi awal

- Bangun frontend sebagai aset statis di Cloudflare Pages dan gunakan domain milik bisnis. Cloudflare Pages memberi request aset statis tanpa biaya; Universal SSL menerbitkan dan memperbarui sertifikat gratis untuk domain yang aktif di Cloudflare.
- Jalankan backend Node.js dan n8n dalam container terpisah pada satu VPS di Singapura untuk tahap awal. Hetzner Cloud kini menawarkan lokasi Singapura; mulai dengan server yang cukup untuk beban sebenarnya dan pantau RAM/disk, karena backend dan n8n berbagi host. Jangan jadikan laptop atau jaringan rumah sebagai endpoint produksi.
- Untuk MongoDB produksi, pilih Atlas tier berbayar yang mendukung backup dan pilih region sedekat mungkin dengan backend. Atlas Free/M0 tidak mendukung backup terkelola; bila dipakai hanya untuk uji, wajib ada `mongodump` terjadwal ke penyimpanan di luar host. Jangan menaruh satu-satunya salinan database pada VPS aplikasi.
- Hubungkan `api.<domain>` ke backend dan `www.<domain>` ke Pages. Paksa HTTPS; gunakan TLS Cloudflare pada edge dan TLS tervalidasi sampai origin (Full strict) bila proxy Cloudflare digunakan. Daftarkan URL webhook Meta HTTPS yang stabil pada API backend, bukan halaman frontend.

Harga dan lokasi berubah. Periksa kalkulator/panel vendor pada hari provisioning; biaya domain, VPS, database, penyimpanan backup, email, dan pajak belum termasuk. Halaman rujukan resmi: [Cloudflare Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/), [Cloudflare Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/), [Hetzner Cloud Singapore](https://www.hetzner.com/cloud-singapore/), [Atlas Free cluster limitations](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/), [Atlas backup billing](https://www.mongodb.com/docs/atlas/billing/cluster-configuration-costs/).

## Rahasia dan konfigurasi

1. Salin `.env.example` menjadi secret variables pada dashboard hosting; jangan commit `.env` atau nilai nyata.
2. Backend minimal: `NODE_ENV=production`, `PORT`, `MONGODB_URI`, `JWT_SECRET` acak minimal 32 karakter, `FRONTEND_URL`, `CORS_ORIGINS`, `WHATSAPP_*` hanya setelah nomor bisnis, App ID, Phone Number ID, token, verify token dan app secret terverifikasi, serta `N8N_*` secret bila backend memanggil n8n.
3. n8n: gunakan encryption key tetap yang disimpan di secret manager, user/password admin kuat, matikan user management publik, batasi akses editor dengan VPN/IP/Zero Trust, dan simpan credential melalui n8n Credentials. Jangan expose port n8n langsung ke publik tanpa kontrol akses.
4. Batasi akses MongoDB ke alamat egress VPS, gunakan user aplikasi dengan hak minimum, TLS, dan jangan gunakan akun database owner sebagai `MONGODB_URI`.
5. Tetapkan domain produksi di Meta webhook dan callback setelah HTTPS, health endpoint, dan kebijakan retensi log siap. Token Meta dan signing secret hanya di server; jangan kirim ke frontend.

## Backup database dan n8n

- Atlas berbayar: aktifkan backup/snapshot, retensi harian minimal 7 hari, dan uji restore ke database staging sebelum go-live.
- Jika MongoDB self-hosted: jalankan dump harian konsisten dan kirim terenkripsi ke object storage di akun/provider berbeda. Contoh manual:

```bash
mongodump --uri "$MONGODB_URI" --archive="/var/backups/ngp-$(date -u +%Y%m%dT%H%M%SZ).archive.gz" --gzip
```

- Simpan backup n8n database dan `N8N_ENCRYPTION_KEY` terpisah dengan kontrol akses ketat. Backup tanpa encryption key tidak cukup untuk memulihkan credentials n8n.
- Uji restore bulanan: pulihkan database ke staging, hitung koleksi utama, verifikasi order/pembayaran/stok terbaru, lalu catat durasi dan hasil. Terapkan retensi, misalnya 7 harian + 4 mingguan + 3 bulanan; hapus backup sesuai kebijakan privasi.
- Jangan menganggap snapshot filesystem saat MongoDB aktif sebagai backup konsisten.

## Logging, monitoring, dan pemulihan

- Kirim log aplikasi JSON ke stdout agar panel hosting mengumpulkan log; sertakan timestamp, level, request ID, route/status/durasi, dan error code. Redaksi `Authorization`, cookie, nomor telepon, isi chat, token, webhook payload, dan payment reference sensitif.
- Pantau `/api/health`, uptime domain, error rate 5xx, kegagalan worker WhatsApp, antrean outbox tertua, kapasitas disk/RAM, koneksi Mongo, dan usia backup terakhir. Set alarm untuk kegagalan health check, antrean gagal, disk >80%, atau backup melewati 24 jam.
- Recovery: hentikan worker yang membuat duplikasi; catat waktu kejadian; pulihkan Mongo ke staging terlebih dahulu; verifikasi order, transaksi, stock movements, consent WhatsApp, serta IDs; setelah persetujuan PIC, alihkan URI aplikasi ke salinan pulih; hidupkan backend/worker; cek health, antrean, dan rekonsiliasi; simpan catatan insiden. Jangan replay webhook/outbox tanpa idempotency key.
- Tetapkan RPO awal maksimal 24 jam dan RTO target 4 jam, kemudian revisi setelah uji restore dan uji beban.

## Gerbang sebelum hosting produksi

- Regresi backend, build dan lint frontend lulus pada commit yang akan dideploy.
- Domain, HTTPS, CORS, health check, secret hosting, backup dan satu simulasi restore sudah diverifikasi.
- Seluruh perubahan Git ditinjau dan tidak ada `.env`, token, database dump, `node_modules`, atau artefak build yang ikut dipush.
- Owner menguji alur order, pembayaran, inventaris, webhook WhatsApp dan pemulihan end-to-end di staging sebelum mengaktifkan trafik nyata.
