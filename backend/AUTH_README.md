# 🍜 Nasi Goreng Polonia - Authentication System

> A production-ready, enterprise-grade authentication system for admin access.

## 🎯 Quick Start

### For Developers

```bash
# 1. Setup
cd backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Run tests
npm test

# 4. Start server
npm start
```

### For Admins

**First Time:**
1. Go to registration page
2. Enter email and secure password (8+ chars, mixed case, numbers, special chars)
3. Check email for verification link
4. Click verification link
5. Login with email and password
6. Start managing orders!

**Forgot Password:**
1. Click "Forgot Password"
2. Enter email
3. Check email for reset link
4. Create new password
5. Login with new password

---

## 🔐 Security Features

| Feature | Details |
|---------|---------|
| **Password Strength** | 8+ chars, uppercase, lowercase, numbers, special chars |
| **Encryption** | Bcrypt hashing (10 rounds) |
| **Tokens** | JWT signed with secret, 12h access + 7d refresh |
| **Rate Limiting** | 5 login attempts/15 min, 3 registrations/hour per IP |
| **Audit Logging** | All auth events logged with IP and timestamp |
| **Email Security** | Verification tokens expire (24h), reset tokens expire (1h) |
| **No Secrets in Code** | All credentials in environment variables |

---

## 📚 Documentation

### Getting Started
- **[AUTH_SETUP.md](docs/AUTH_SETUP.md)** - Step-by-step setup and testing guide

### API Reference
- **[AUTH.md](docs/AUTH.md)** - Complete API documentation with examples
  - Endpoint specifications
  - Request/response formats
  - Error codes
  - Frontend integration
  - Troubleshooting

### Deployment
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Pre/post deployment checklist
- **[AUTH_SUMMARY.md](docs/AUTH_SUMMARY.md)** - Implementation summary

---

## 🔗 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register-admin` | Register new admin |
| `GET` | `/api/auth/verify-email/:token` | Verify email |
| `POST` | `/api/auth/resend-verification` | Resend verification email |
| `POST` | `/api/auth/login` | Login and get tokens |
| `POST` | `/api/auth/refresh` | Get new access token |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password/:token` | Reset password |

### Protected Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PATCH` | `/api/auth/change-password` | Change password (authenticated) |

---

## 🚀 Example Usage

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!"
  }'
# Returns: token, refreshToken, expiresIn
```

### Use Token
```bash
TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -X PATCH http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "SecurePass123!",
    "newPassword": "NewPass456!"
  }'
```

---

## ⚙️ Configuration

### Environment Variables

```env
# Core
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/nasi_goreng_polonia?replicaSet=rs0
JWT_SECRET=your-secret-min-32-chars

# Admin Registration
ALLOW_ADMIN_REGISTER=true  # Only true for bootstrap

# Frontend
FRONTEND_URL=http://localhost:3000

# Email (Development - logs to console)
EMAIL_SERVICE=test
SMTP_FROM=noreply@nasiggorengpolonia.id

# Email (Production - real SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## 📊 Database Models

### Admin
```javascript
{
  email: String,
  passwordHash: String,
  isActive: Boolean,
  isVerified: Boolean,
  verificationToken: String,
  verificationTokenExpiry: Date,
  resetToken: String,
  resetTokenExpiry: Date,
  passwordChangedAt: Date,
  lastLoginAt: Date,
  lastLoginIp: String,
  createdAt: Date,
  updatedAt: Date
}
```

### RefreshToken
```javascript
{
  token: String,
  adminId: ObjectId,
  expiresAt: Date,
  isRevoked: Boolean,
  ipAddress: String,
  userAgent: String
}
```

### AuthLog
```javascript
{
  adminId: ObjectId,
  email: String,
  action: String, // REGISTER, LOGIN_SUCCESS, LOGIN_FAILED, etc.
  status: String, // SUCCESS, FAILED
  reason: String,
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}
```

---

## 🧪 Testing

### Run Tests
```bash
cd backend
npm test
```

### Auth Tests Included
- ✅ Registration with strong password enforcement
- ✅ Email verification flow
- ✅ Login with verified email requirement
- ✅ JWT token generation
- ✅ Refresh token functionality
- ✅ Password reset flow
- ✅ Error handling and validation

---

## 📈 Rate Limiting

Prevents brute force attacks:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Register | 3 | 1 hour |
| Login | 5 | 15 minutes |
| Forgot Password | 3 | 1 hour |
| Resend Email | 3 | 1 hour |

Per IP address. Skipped in test mode.

---

## 🔍 Monitoring

### View Auth Logs
```javascript
// Connect to MongoDB
use nasi_goreng_polonia

// Recent login attempts
db.authlogs.find({ action: 'LOGIN_SUCCESS' })
  .sort({ createdAt: -1 })
  .limit(20)

// Failed logins in last hour
db.authlogs.find({
  action: 'LOGIN_FAILED',
  createdAt: { $gte: new Date(Date.now() - 3600000) }
})

// All activity for admin
db.authlogs.find({ adminId: ObjectId('...') })
```

---

## 🛠️ Troubleshooting

### Connection Refused
**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5000`
- **Check:** Is server running? (`npm start`)
- **Check:** Is MongoDB running? (`docker-compose up`)
- **Check:** Is port 5000 available?

### Email Not Received
**Problem:** No verification emails arriving
- **Development:** Tokens logged to console (check logs)
- **Production:** Check SMTP credentials
- **Check:** .env variables correct
- **Check:** Email server firewall settings

### Invalid Token
**Error:** `Invalid or expired verification token`
- **Reason:** Token expired (24h window)
- **Solution:** Use "Resend verification" email feature

### Too Many Attempts
**Error:** `Too many registration attempts`
- **Reason:** Rate limit exceeded (3/hour per IP)
- **Solution:** Wait 1 hour or use different IP

### Password Requirements
**Error:** `Password must contain...`
- **Required:** 8+ chars, uppercase, lowercase, number, special char
- **Example:** `SecurePass123!`

---

## 🚀 Deployment

### To Production

1. **Prepare**
   ```bash
   npm ci --production
   npm test
   ```

2. **Configure**
   - Update `.env` with production values
   - Set `NODE_ENV=production`
   - Set `ALLOW_ADMIN_REGISTER=false` after first admin

3. **Deploy**
   ```bash
   npm start
   # or with PM2
   pm2 start server.js --name "nasi-api"
   ```

4. **Verify**
   - Test registration flow
   - Check auth logs
   - Verify emails sent

See **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** for detailed steps.

---

## 🔐 Security Best Practices

### For Admins
- Use strong, unique passwords
- Don't share credentials
- Check email for reset requests
- Report suspicious activity

### For Developers
- Never commit `.env` file
- Use strong JWT_SECRET (32+ chars)
- Keep MongoDB credentials secure
- Rotate secrets regularly
- Monitor auth logs
- Keep Node.js and dependencies updated

---

## 📞 Support

### Documentation
- Full API docs: [AUTH.md](docs/AUTH.md)
- Setup guide: [AUTH_SETUP.md](docs/AUTH_SETUP.md)
- Implementation: [AUTH_SUMMARY.md](docs/AUTH_SUMMARY.md)
- Deployment: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

### Common Issues
See **[AUTH.md - Troubleshooting](docs/AUTH.md#troubleshooting)**

---

## ✨ Features

✅ **Production-Ready**
- Error handling
- Input validation
- Rate limiting
- Audit logging

✅ **Secure**
- Bcrypt password hashing
- JWT tokens
- CORS protection
- Rate limiting

✅ **Developer-Friendly**
- Clear API design
- Comprehensive documentation
- Integration tests
- Easy setup

✅ **Scalable**
- Stateless JWT design
- Database indexes
- Async email sending
- Ready for Redis caching

---

## 📋 What's Included

- ✅ 8 authentication endpoints
- ✅ Email verification with templates
- ✅ Password reset flow
- ✅ JWT + refresh token system
- ✅ Rate limiting middleware
- ✅ Audit logging
- ✅ Comprehensive documentation
- ✅ Integration tests
- ✅ Deployment checklist

---

## 🎉 Ready to Use

The system is **production-ready**. Choose your next steps:

1. **Just Started?** → Read [AUTH_SETUP.md](docs/AUTH_SETUP.md)
2. **Need API Docs?** → Read [AUTH.md](docs/AUTH.md)
3. **Deploying?** → Use [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
4. **Want Details?** → Read [AUTH_SUMMARY.md](docs/AUTH_SUMMARY.md)

---

**Happy Authenticating! 🔐**
