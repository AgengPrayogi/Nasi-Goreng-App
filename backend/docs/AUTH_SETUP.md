# Quick Setup Guide - Authentication System

## Development Setup (Local Testing)

### 1. Prerequisites
- Node.js 18+
- MongoDB (local or Docker)
- `.env` file configured

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment
Create/update `.env` file:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/nasi_goreng_polonia?replicaSet=rs0&directConnection=true
JWT_SECRET=dev-secret-key-nasi-goreng-polonia-2026
ALLOW_ADMIN_REGISTER=true
FRONTEND_URL=http://localhost:3000
EMAIL_SERVICE=test
SMTP_FROM=noreply@nasiggorengpolonia.id
```

### 4. Start MongoDB (Docker)
```bash
docker-compose up -d mongodb
```

### 5. Start Backend Server
```bash
npm start
# or for development with auto-reload
npm run dev
```

### 6. Test Authentication Flow

#### Step 1: Register Admin
```bash
curl -X POST http://localhost:5000/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "TestPass123!"
  }'

# Response includes verification token
# In dev mode, check server logs for token
```

#### Step 2: Verify Email
```bash
# Copy token from response above
TOKEN="your-token-here"

curl -X GET "http://localhost:5000/api/auth/verify-email/$TOKEN"

# Response: Email verified successfully
```

#### Step 3: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "TestPass123!"
  }'

# Response includes:
# - token (JWT access token, 12h expiry)
# - refreshToken (7d expiry)
```

#### Step 4: Use Token for Protected Endpoints
```bash
TOKEN="your-token-from-login"

curl -X PATCH http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "TestPass123!",
    "newPassword": "NewPass456!"
  }'
```

#### Step 5: Refresh Access Token
```bash
REFRESH_TOKEN="your-refresh-token"

curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'$REFRESH_TOKEN'"
  }'

# Response: New access token
```

---

## Production Setup

### 1. Environment Variables (Production)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nasi_goreng_polonia
JWT_SECRET=your-very-long-secret-key-minimum-32-characters-change-frequently
ALLOW_ADMIN_REGISTER=false
FRONTEND_URL=https://yourfrontend.com
CORS_ORIGINS=https://yourfrontend.com

# SMTP Configuration (Gmail example)
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM=noreply@nasiggorengpolonia.id

# Optional Security Headers
REQUIRE_HTTPS=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
```

### 2. SMTP Setup (Gmail)
1. Enable 2FA on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use app password in SMTP_PASSWORD

### 3. Database Backup
```bash
# Backup MongoDB
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net" \
  --out=./backups/$(date +%Y%m%d_%H%M%S)
```

### 4. SSL/TLS Certificate
```bash
# Using Let's Encrypt with Certbot
certbot certonly --standalone -d yourdomain.com

# Configure in reverse proxy (Nginx/Apache)
```

### 5. Deploy
```bash
cd backend
npm ci --production
npm start
```

---

## Monitoring

### Check Auth Logs
```bash
# Connect to MongoDB
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/nasi_goreng_polonia"

# View failed login attempts
db.authlogs.find({ 
  action: 'LOGIN_FAILED',
  createdAt: { $gte: new Date(Date.now() - 86400000) }
}).pretty()

# View password changes
db.authlogs.find({ 
  action: 'PASSWORD_CHANGED'
}).sort({ createdAt: -1 }).limit(10).pretty()
```

### Alerts to Setup
- Failed login attempts > 5 in 15 minutes
- Password reset requests > 3 per hour
- Unverified admins after 7 days
- Admin registration attempts when disabled

---

## Troubleshooting

### Email Not Sending
```bash
# Check SMTP configuration
# In dev (EMAIL_SERVICE=test), tokens printed to console/logs
# In prod, check SMTP credentials and verify account access

# Test SMTP connection
npm run test-smtp
```

### Rate Limiting Issues
- Check if behind proxy: configure `trust proxy`
- Verify IP is being captured correctly
- Adjust rate limits in `backend/src/middlewares/rateLimiter.js`

### Token Expired Errors
- Access token: refresh with refreshToken
- Refresh token: re-login to get new pair
- Reset token: send new forgot-password request

### MongoDB Connection Issues
- Verify MONGODB_URI format
- Check if Replica Set is initialized
- For local: `mongo --eval "rs.initiate()"`

---

## Performance Tips

### Optimize Database
```javascript
// Create indexes (auto-created but explicit for clarity)
db.admins.createIndex({ email: 1 })
db.admins.createIndex({ resetToken: 1 })
db.authlogs.createIndex({ adminId: 1, createdAt: -1 })
db.authlogs.createIndex({ email: 1, createdAt: -1 })
```

### Cache Considerations
- Don't cache JWT tokens (they expire)
- Cache public endpoints (menus, categories)
- Use Redis for rate limit store in production

### Rate Limiting Store
```bash
# Switch to Redis for distributed rate limiting
npm install redis

# Update rateLimiter.js to use RedisStore
```

---

## Next Steps

1. Test the complete auth flow locally
2. Configure email (SMTP) for your domain
3. Set up MongoDB backups
4. Configure HTTPS/TLS
5. Deploy to production
6. Monitor auth logs and set up alerts
7. Plan for 2FA implementation
