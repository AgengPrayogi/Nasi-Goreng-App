const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose.
 * Requires process.env.MONGODB_URI to be set (use dotenv in server.js).
 *
 * Order completion uses multi-document transactions (`completeOrder`). Those require a
 * **replica set** (MongoDB Atlas, or local `mongod --replSet` / see repo `docker-compose.yml`).
 * Standalone `mongod` without a replica set will fail at commit time.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);

  return mongoose.connection;
}

module.exports = { connectDB };

