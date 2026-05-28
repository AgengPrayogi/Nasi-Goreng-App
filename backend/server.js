require('dotenv').config();

const app = require('./src/app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

function assertRequiredEnv() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required in production');
    }
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required in production');
    }
    const cors = (process.env.CORS_ORIGINS || '').trim();
    if (!cors) {
      throw new Error('CORS_ORIGINS must be set in production (comma-separated allowed origins)');
    }
  }
}

async function start() {
  try {
    assertRequiredEnv();
    const conn = await connectDB();
    console.log(`MongoDB connected: ${conn.host}:${conn.port}/${conn.name}`);

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

