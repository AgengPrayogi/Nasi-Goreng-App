/**
 * Script to delete test admins from the database.
 * Usage: node scripts/clean-test-admins.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

async function clean() {
  try {
    await connectDB();
    
    const emailsToDelete = [
      'silmikaffah639@gmail.com',
      'agengprayogi226@gmail.com',
      'newadmin@example.com',
      'verifyok@example.com',
      'expired@example.com',
      'notverified@example.com',
      'verifiedlogin@example.com',
      'resend@example.com',
      'resendverified@example.com',
      'doubverify@example.com',
      'publicverify@example.com',
      'linkcheck@example.com',
      'test-debug@example.com'
    ];
    
    const db = mongoose.connection.db;
    const result = await db.collection('admins').deleteMany({
      email: { $in: emailsToDelete }
    });
    
    console.log(`✅ Deleted ${result.deletedCount} test admin(s)`);
    
    // Also clean auth logs for these emails
    const logResult = await db.collection('authlogs').deleteMany({
      email: { $in: emailsToDelete }
    });
    console.log(`✅ Deleted ${logResult.deletedCount} auth log(s)`);
    
    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

clean();