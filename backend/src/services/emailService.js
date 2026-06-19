const nodemailer = require('nodemailer');

// Initialize email transporter
let transporter;

function initializeEmailService() {
  // For development, use test email or environment variables
  if (process.env.EMAIL_SERVICE === 'test' || !process.env.SMTP_HOST) {
    // Mock transporter for development/testing
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('📧 Email would be sent (dev mode):', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          link: mailOptions.html?.match(/href="([^"]+)"/)?.[1] || 'N/A'
        });
        return { messageId: 'mock-' + Date.now() };
      }
    };
  } else {
    // Production transporter with real SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }
}

function getVerificationEmailTemplate(email, token, frontendUrl) {
  const verificationLink = `${frontendUrl}/verify-email/${token}`;
  return {
    subject: '🍜 Nasi Goreng Polonia - Verify Your Email',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; color: #d4410e; font-weight: bold; }
            .button { display: inline-block; background: #d4410e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🍜 Nasi Goreng Polonia</div>
            </div>
            <h2>Welcome, ${email}!</h2>
            <p>Thank you for registering as an admin. Please verify your email address by clicking the link below:</p>
            <a href="${verificationLink}" class="button">Verify Email Address</a>
            <p>Or copy this link in your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">${verificationLink}</p>
            <p>This link expires in 24 hours.</p>
            <div class="footer">
              <p>If you did not create this account, please ignore this email.</p>
              <p>&copy; 2026 Nasi Goreng Polonia. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Welcome ${email}!\n\nPlease verify your email by visiting:\n${verificationLink}\n\nThis link expires in 24 hours.`
  };
}

function getPasswordResetEmailTemplate(email, token, frontendUrl) {
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;
  return {
    subject: '🍜 Nasi Goreng Polonia - Reset Your Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; color: #d4410e; font-weight: bold; }
            .button { display: inline-block; background: #d4410e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🍜 Nasi Goreng Polonia</div>
            </div>
            <h2>Password Reset Request</h2>
            <p>Hi ${email},</p>
            <p>We received a request to reset your password. Click the link below to create a new password:</p>
            <a href="${resetLink}" class="button">Reset Password</a>
            <p>Or copy this link:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">${resetLink}</p>
            <div class="warning">
              <strong>⚠️ Security Note:</strong> This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </div>
            <div class="footer">
              <p>&copy; 2026 Nasi Goreng Polonia. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${email},\n\nReset your password by visiting:\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`
  };
}

function getVerificationSuccessEmailTemplate(email) {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return {
    subject: '🍜 Nasi Goreng Polonia - Email Verified Successfully',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; color: #d4410e; font-weight: bold; }
            .button { display: inline-block; background: #d4410e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .success { background: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🍜 Nasi Goreng Polonia</div>
            </div>
            <h2>Email Verified!</h2>
            <div class="success">
              ✓ Your email has been verified successfully.
            </div>
            <p>You can now log in to your admin account.</p>
            <a href="${loginUrl}/admin/login" class="button">Login to Admin Panel</a>
            <div class="footer">
              <p>&copy; 2026 Nasi Goreng Polonia. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Email verified! Login at: ${loginUrl}/admin/login`
  };
}

function getPasswordChangedEmailTemplate(email) {
  return {
    subject: '🍜 Nasi Goreng Polonia - Password Changed',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; color: #d4410e; font-weight: bold; }
            .success { background: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🍜 Nasi Goreng Polonia</div>
            </div>
            <h2>Password Changed Successfully</h2>
            <div class="success">
              ✓ Your password has been changed successfully.
            </div>
            <p>If you didn't make this change, please reset your password immediately or contact support.</p>
            <div class="footer">
              <p>&copy; 2026 Nasi Goreng Polonia. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Your password has been changed successfully. If you didn't make this change, reset your password immediately.`
  };
}

async function sendVerificationEmail(email, token) {
  if (!transporter) initializeEmailService();
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const template = getVerificationEmailTemplate(email, token, frontendUrl);
  
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@nasiggorengpolonia.id',
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  } catch (err) {
    console.error('Error sending verification email:', err);
    throw err;
  }
}

async function sendVerificationSuccessEmail(email) {
  if (!transporter) initializeEmailService();
  
  const template = getVerificationSuccessEmailTemplate(email);
  
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@nasiggorengpolonia.id',
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  } catch (err) {
    console.error('Error sending verification success email:', err);
    // Don't throw - verification is already done
  }
}

async function sendPasswordResetEmail(email, token) {
  if (!transporter) initializeEmailService();
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const template = getPasswordResetEmailTemplate(email, token, frontendUrl);
  
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@nasiggorengpolonia.id',
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  } catch (err) {
    console.error('Error sending password reset email:', err);
    throw err;
  }
}

async function sendPasswordChangedEmail(email) {
  if (!transporter) initializeEmailService();
  
  const template = getPasswordChangedEmailTemplate(email);
  
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@nasiggorengpolonia.id',
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  } catch (err) {
    console.error('Error sending password changed email:', err);
    throw err;
  }
}

module.exports = {
  initializeEmailService,
  sendVerificationEmail,
  sendVerificationSuccessEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};
