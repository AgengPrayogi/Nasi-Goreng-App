require('dotenv').config();

const mongoose = require('mongoose');
const CustomerTier = require('../src/models/CustomerTier');

async function migrate() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 10000,
      connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000,
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS) || 45000,
      bufferCommands: false
    });
  } catch (err) {
    if (err.code === 'ENOTFOUND' || /querySrv|ENOTFOUND/i.test(String(err.message))) {
      throw new Error(
        'MongoDB Atlas hostname tidak dapat di-resolve. Periksa MONGODB_URI dari Atlas Connect, status cluster, DNS/internet, dan VPN/proxy. Untuk lokal gunakan docker compose up -d lalu URI replica set di backend/.env.'
      );
    }
    throw err;
  }
  await CustomerTier.updateOne(
    { code: 'bronze' },
    {
      $set: {
        name: 'Bronze',
        configVersion: 2,
        periodDays: 60,
        minTotalSpent: 50000,
        minTotalOrders: 1,
        benefits: { discountPercent: 0, description: 'Standard customer benefits' },
        isActive: true
      }
    },
    { upsert: true }
  );
  await CustomerTier.updateOne(
    { code: 'silver' },
    {
      $set: {
        name: 'Silver',
        configVersion: 2,
        periodDays: 60,
        minTotalSpent: 300000,
        minTotalOrders: 6,
        benefits: { discountPercent: 5, description: 'Silver customer discount' },
        isActive: true
      }
    },
    { upsert: true }
  );
  await CustomerTier.updateOne(
    { code: 'gold' },
    {
      $set: {
        name: 'Gold',
        configVersion: 2,
        periodDays: 60,
        minTotalSpent: 700000,
        minTotalOrders: 12,
        benefits: { discountPercent: 10, description: 'Gold customer discount' },
        isActive: true
      }
    },
    { upsert: true }
  );
  console.log('Customer tier configuration migrated');
}

migrate()
  .catch((err) => {
    console.error(`Customer tier migration failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());