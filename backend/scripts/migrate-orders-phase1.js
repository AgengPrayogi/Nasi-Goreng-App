/**
 * One-time migration for Phase 1 order fields (safe to run multiple times).
 * Usage: MONGODB_URI=... node scripts/migrate-orders-phase1.js
 */
require('dotenv').config();

const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.collection('orders');

  const res = await col.updateMany(
    {
      $or: [
        { channel: { $exists: false } },
        { kitchenStatus: { $exists: false } },
        { paymentStatus: { $exists: false } }
      ]
    },
    {
      $set: {
        channel: 'walk_in',
        customerName: '',
        customerPhone: '',
        kitchenStatus: 'none',
        paymentStatus: 'unpaid',
        queueNumber: 0,
        queueDate: ''
      }
    }
  );

  console.log('Matched:', res.matchedCount, 'Modified:', res.modifiedCount);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
