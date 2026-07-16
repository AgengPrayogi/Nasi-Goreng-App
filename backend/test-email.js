require('dotenv').config();
const { sendVerificationEmail } = require('./src/services/emailService');

async function test() {
  console.log('🧪 Testing email service...');
  console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
  console.log('SMTP_FROM:', process.env.SMTP_FROM);
  
  try {
    const result = await sendVerificationEmail(
      'agengprayogi226@gmail.com',
      'test-token-12345'
    );
    console.log('\n✅ Email sent successfully!');
    console.log('Result:', result);
  } catch (err) {
    console.log('\n❌ Email failed:', err.message);
  }
}

test();
