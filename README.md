# Nasi Goreng Polonia

Aplikasi manajemen restoran untuk Nasi Goreng Polonia dengan sistem order, kitchen queue, payments, invoices, dan analytics lengkap.

## Tech Stack

- **Backend**: Node.js 18+, Express, MongoDB (Mongoose)
- **Frontend**: React + Vite

## Prerequisites

- Node.js >= 18
- MongoDB (lokal atau Atlas)
- Docker & Docker Compose (opsional, untuk MongoDB replica set)

## Setup & Run

### 1. Clone Repository

```bash
git clone https://github.com/AgengPrayogi/Nasi-Goreng-App.git
cd Nasi-Goreng-App
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Buat file `.env` di folder `backend/`:

```env
MONGODB_URI=mongodb://localhost:27017/nasi_goreng_polonia
JWT_SECRET=your_jwt_secret_here
CORS_ORIGINS=http://localhost:5173
PORT=5000
```

Jika pakai Docker untuk MongoDB replica set (untuk fitur pembayaran):

```bash
docker compose up -d
```

Maka `MONGODB_URI`-nya menjadi:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/nasi_goreng_polonia?replicaSet=rs0&directConnection=true
```

Jalankan backend:
```bash
npm run dev
```

Backend akan berjalan di `http://localhost:5000`

### 3. Seed Data (Opsional)

```bash
node scripts/seed-phase1.js
```

### 4. Setup Frontend

Buka terminal baru:

```bash
cd frontend
npm install
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

## API Documentation

Lihat `backend/docs/API.md` untuk dokumentasi API lengkap.

## Testing

```bash
cd backend
npm test
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key untuk JWT |
| `CORS_ORIGINS` | Yes (prod) | Allowed CORS origins |
| `PORT` | No | Backend port (default: 5000) |

## Docker Compose (MongoDB Replica Set)

```bash
docker compose up -d
```

## Project Structure

```
Nasi-Goreng-App/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── validators/
│   └── docs/
├── frontend/
│   └── src/
│       └── pages/
└── docker-compose.yml