require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const Customer = require('../src/models/Customer');

async function migrate() {
  await connectDB();
  const result = await Customer.updateMany(
    { audienceSegment: { $exists: false } },
    { $set: { audienceSegment: 'individual' } }
  );
  console.log(`Customer audience segments migrated: ${result.modifiedCount} customer(s)`);
  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error('Customer audience segment migration failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});