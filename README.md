
# Aplikasi Pencatat Pemasukan & Pengeluaran

Aplikasi ini adalah contoh sederhana untuk mencatat pemasukan dan pengeluaran secara lokal (file JSON). Aplikasi ini sekarang menyediakan:

- Tampilan utama untuk tambah / edit / hapus entri.
- Halaman khusus "Per Bulan" untuk melihat ringkasan dan daftar entri per bulan.
- Ekspor data ke XLSX atau CSV (seluruh data atau per-bulan).
- Import dari file Excel/CSV (kolom: amount, type, category, date, note).

Langkah cepat (Windows PowerShell):

```powershell
# 1. Buka PowerShell dan masuk ke folder proyek
cd "c:\Users\ADMIN01\Documents\Pemasukan dan pengeluaran"

# 2. Pasang dependensi (baru: multer, xlsx)
npm.cmd install

# 3. Jalankan server
npm.cmd start

# 4. Buka di browser (atau di perangkat mobile pada jaringan lokal)
# Buka: http://localhost:3000
```

Fitur API (untuk integrasi):

- GET /api/entries — daftar entri
- POST /api/entries — tambah entri { amount:number, type:'income'|'expense', category?:string, date?:ISO, note?:string }
- PUT /api/entries/:id — perbarui entri
- DELETE /api/entries/:id — hapus entri
- GET /api/summary — total pemasukan, pengeluaran, saldo
- GET /api/export?format=xlsx|csv&month=YYYY-MM — unduh seluruh entri atau entri per bulan
- POST /api/import — import file Excel/CSV (multipart/form-data field `file`)

Catatan:

- Data disimpan di `data/db.json`. Untuk penggunaan multi-user atau produksi, pertimbangkan migrasi ke SQLite/Postgres.
- Untuk mengimpor file, file XLSX/CSV harus memiliki kolom: `amount`, `type` (`income` atau `expense`), `category`, `date` (opsional), `note` (opsional).
- Saat mengimpor, baris yang tidak valid (mis. amount bukan angka atau type bukan 'income'/'expense') akan diabaikan.

Contoh import via curl (PowerShell):

```powershell
# Import via curl (PowerShell):
curl -X POST -F "file=@C:\\path\\to\\file.xlsx" http://localhost:3000/api/import
```

Catatan keamanan & langkah lanjut:

- `npm audit` mungkin menampilkan beberapa issue; gunakan `npm audit fix` bila perlu setelah memeriksa perubahan versi.
- Saya bisa membantu migrasi ke SQLite, menambahkan export berkala, atau membuat autentikasi lokal jika Anda inginkan.

