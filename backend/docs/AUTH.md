# Nasi Goreng Polonia - Authentication API Documentation

## Overview

This document describes the complete authentication and authorization system for the Nasi Goreng Polonia admin interface. The system implements industry-standard security practices including strong password enforcement, email verification, JWT tokens, refresh tokens, and password recovery flows.

## Environment Configuration

### Required Environment Variables

```env
# Core
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/nasi_goreng_polonia?replicaSet=rs0
JWT_SECRET=your-secret-key-minimum-32-characters

# Email (development defaults to console logging)
FRONTEND_URL=http://localhost:3000
EMAIL_SERVICE=test
SMTP_FROM=noreply@nasiggorengpolonia.id

# Production Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password

# Admin Registration
ALLOW_ADMIN_REGISTER=true  # Set to 'true' only to add more admins
```

## Password Requirements

All passwords must meet these requirements:
- **Minimum 8 characters**
- **At least 1 uppercase letter** (A-Z)
- **At least 1 lowercase letter** (a-z)
- **At least 1 number** (0-9)
- **At least 1 special character** (@$!%*?&)

Example valid passwords:
- `SecurePass123!`
- `MyP@ssw0rd`
- `Admin2026@`

## Authentication Endpoints

### 1. Register Admin

**Endpoint:** `POST /api/auth/register-admin`

**Rate Limit:** 3 registrations per hour per IP

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "65f1234567890abcdef12345",
    "email": "admin@example.com",
    "message": "Registration successful. Please check your email for verification link.",
    "verificationTokenExpiry": "2026-05-28T18:43:51.323Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Validation error",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "password",
      "message": "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)"
    }
  ]
}
```

**Business Rules:**
- First admin registration is always allowed
- Subsequent registrations require `ALLOW_ADMIN_REGISTER=true` environment variable
- Email must be unique
- Verification email is sent automatically (development: logged to console)
- Verification token expires in 24 hours

---

### 2. Verify Email

**Endpoint:** `GET /api/auth/verify-email/:token`

**Parameters:**
- `token` (path) - Verification token from email link

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in.",
  "data": {
    "id": "65f1234567890abcdef12345",
    "email": "admin@example.com"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired verification token",
  "errorCode": "INVALID_VERIFICATION_TOKEN"
}
```

**Business Rules:**
- Token must not be expired (24-hour window)
- Token must not already be used
- Email must not already be verified
- After verification, user can log in

---

### 3. Resend Verification Email

**Endpoint:** `POST /api/auth/resend-verification`

**Rate Limit:** 3 requests per hour per IP

**Request Body:**
```json
{
  "email": "admin@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": {
    "message": "Verification email sent",
    "email": "admin@example.com"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Admin not found",
  "errorCode": "ADMIN_NOT_FOUND"
}
```

**Business Rules:**
- Admin must exist with provided email
- Email must not already be verified (if verified, returns 400 error)
- Generates new verification token with 24-hour expiry
- Sends new verification email

---

### 4. Login

**Endpoint:** `POST /api/auth/login`

**Rate Limit:** 5 attempts per 15 minutes per IP

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "expiresIn": "12h",
    "admin": {
      "id": "65f1234567890abcdef12345",
      "email": "admin@example.com",
      "isVerified": true
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "errorCode": "INVALID_CREDENTIALS"
}
```

**Error Response (403) - Email Not Verified:**
```json
{
  "success": false,
  "message": "Please verify your email before logging in",
  "errorCode": "EMAIL_NOT_VERIFIED"
}
```

**Business Rules:**
- Email and password must be valid
- Email must be verified before login
- Admin account must be active
- Access token expires in 12 hours
- Refresh token expires in 7 days
- Login attempt is logged with timestamp and IP address
- Failed login attempts are logged for security auditing

---

### 5. Refresh Access Token

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "12h"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token",
  "errorCode": "INVALID_REFRESH_TOKEN"
}
```

**Business Rules:**
- Refresh token must be valid and not expired
- Refresh token must not be revoked
- Admin must be active and verified
- Returns new access token with 12-hour expiry
- Refresh token remains valid for subsequent refreshes

---

### 6. Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

**Rate Limit:** 3 requests per hour per IP

**Request Body:**
```json
{
  "email": "admin@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent"
}
```

**Business Rules:**
- Returns success even if email doesn't exist (security best practice - no email enumeration)
- If admin exists, generates reset token with 1-hour expiry
- Sends password reset email with reset link
- Reset link is sent asynchronously
- Existing password reset tokens are overwritten

---

### 7. Reset Password

**Endpoint:** `POST /api/auth/reset-password/:token`

**Parameters:**
- `token` (path) - Password reset token from email link

**Request Body:**
```json
{
  "password": "NewSecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired password reset token",
  "errorCode": "INVALID_RESET_TOKEN"
}
```

**Business Rules:**
- Reset token must be valid and not expired (1-hour window)
- New password must meet strength requirements
- Password is hashed with bcrypt (10 salt rounds)
- Reset token is cleared after successful reset
- Confirmation email is sent after successful reset
- `passwordChangedAt` timestamp is updated
- All previous refresh tokens remain valid but new ones use updated session tracking

---

### 8. Change Password (Authenticated)

**Endpoint:** `PATCH /api/auth/change-password`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "currentPassword": "OldSecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response (401) - Wrong Current Password:**
```json
{
  "success": false,
  "message": "Current password is incorrect",
  "errorCode": "INVALID_PASSWORD"
}
```

**Business Rules:**
- User must be authenticated (valid JWT)
- Current password must be verified before change
- New password must meet strength requirements and be different from current
- Password is hashed with bcrypt (10 salt rounds)
- Confirmation email is sent after successful change
- `passwordChangedAt` timestamp is updated

---

## JWT Token Format

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "65f1234567890abcdef12345",
  "email": "admin@example.com",
  "iat": 1716825831,
  "exp": 1716867831
}
```

**Usage:**
Include in Authorization header: `Authorization: Bearer <token>`

---

## Using Authenticated Endpoints

All protected endpoints require the JWT token in the Authorization header:

```bash
curl -X PATCH http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123!",
    "newPassword": "NewPass456!"
  }'
```

---

## Error Handling

### Common Error Codes

| Error Code | HTTP Status | Description |
|-----------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed (missing/invalid fields) |
| `INVALID_CREDENTIALS` | 401 | Email or password is incorrect |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required before login |
| `ADMIN_REGISTER_DISABLED` | 403 | Registration disabled (not first admin and flag not set) |
| `INVALID_PASSWORD` | 401 | Current password incorrect for change-password |
| `INVALID_VERIFICATION_TOKEN` | 400 | Verification token invalid or expired |
| `INVALID_RESET_TOKEN` | 400 | Password reset token invalid or expired |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token invalid or expired |
| `ADMIN_NOT_FOUND` | 404 | Admin with provided email doesn't exist |
| `ALREADY_VERIFIED` | 400 | Email already verified (for resend-verification) |
| `UNAUTHORIZED` | 401 | Authentication token missing or invalid |
| `ADMIN_REGISTER_DISABLED` | 403 | Admin registration disabled |

---

## Rate Limiting

The authentication endpoints implement rate limiting to prevent brute force attacks:

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/register-admin | 3 attempts | 1 hour |
| POST /api/auth/login | 5 attempts | 15 minutes |
| POST /api/auth/forgot-password | 3 attempts | 1 hour |
| POST /api/auth/resend-verification | 3 attempts | 1 hour |

Rate limit is per IP address. Test environment (`NODE_ENV=test`) skips rate limiting.

---

## Security Best Practices

### For Admins

1. **Use Strong Passwords**
   - Generate using a password manager
   - Never reuse passwords from other services
   - Never share credentials

2. **Protect Your Tokens**
   - Don't store tokens in URL parameters
   - Don't commit tokens to version control
   - Use HTTPS only (even in development with self-signed certificates)

3. **Token Expiry**
   - Access token: 12 hours
   - Refresh token: 7 days
   - Refresh tokens when needed, don't over-refresh

4. **Suspicious Activity**
   - Monitor email for unexpected password reset requests
   - Report unauthorized login attempts
   - Change password immediately if suspected compromise

### For Developers

1. **Environment Secrets**
   - Never commit `.env` file to git
   - Use `.env.example` for documentation
   - Rotate JWT_SECRET in production regularly

2. **Email Configuration**
   - Use OAuth2 or app-specific passwords for SMTP
   - Never use main account passwords
   - Monitor email send failures

3. **Logging**
   - All auth events are logged to AuthLog collection
   - Review logs regularly for suspicious patterns
   - Archive logs for compliance

4. **Deployment**
   - Enable HTTPS/TLS in production
   - Use strong JWT_SECRET (minimum 32 characters)
   - Keep MongoDB credentials secure
   - Implement CORS properly for frontend origin

---

## Frontend Integration

### Login Flow

```javascript
// 1. Register
POST /api/auth/register-admin
→ Save email, show verification pending message

// 2. User clicks verification link from email
GET /api/auth/verify-email?token=...
→ Show success, redirect to login

// 3. Login
POST /api/auth/login
→ Receive token & refreshToken
→ Store in secure HTTP-only cookie or secure storage
→ Redirect to dashboard

// 4. Use token for API calls
Authorization: Bearer {token}

// 5. Token expires
POST /api/auth/refresh
→ Get new token
→ Continue with API calls

// 6. Password reset flow
POST /api/auth/forgot-password
→ Check email
GET /api/auth/reset-password/:token
→ Show reset form
POST /api/auth/reset-password/:token
→ Redirect to login
```

---

## Audit Logging

All authentication events are logged to the `AuthLog` collection:

**Logged Events:**
- REGISTER - Account created
- LOGIN_SUCCESS - Successful login
- LOGIN_FAILED - Failed login attempt
- EMAIL_VERIFIED - Email verified
- PASSWORD_CHANGED - Password changed by authenticated user
- PASSWORD_RESET - Password reset via forgot-password flow

**Log Fields:**
- `adminId` - Admin ObjectId (if applicable)
- `email` - Admin email
- `action` - Event type
- `status` - SUCCESS or FAILED
- `reason` - Failure reason (e.g., "Invalid password")
- `ipAddress` - Client IP address
- `userAgent` - Browser/client user agent
- `createdAt` - Timestamp

**Query Logs:**
```javascript
// Failed login attempts in last hour
db.authlogs.find({
  action: 'LOGIN_FAILED',
  createdAt: { $gte: new Date(Date.now() - 3600000) }
})

// All activity for an admin
db.authlogs.find({
  adminId: ObjectId('...')
}).sort({ createdAt: -1 })
```

---

## Testing

### Using Postman/cURL

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# 2. Verify email (use token from response or email)
curl -X GET "http://localhost:5000/api/auth/verify-email/TOKEN_HERE"

# 3. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# 4. Use token for authenticated endpoint
curl -X PATCH http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "TestPass123!",
    "newPassword": "NewPass456!"
  }'
```

### Running Tests

```bash
cd backend
npm test

# Test output includes auth endpoint test results
# Tests validate:
# - Registration with strong password enforcement
# - Email verification flow
# - Login with verified email requirement
# - JWT token generation
# - Refresh token functionality
# - Password reset flow
# - Rate limiting
# - Error handling
```

---

## Troubleshooting

### "Email is already verified" Error
- Admin account is already verified
- Use login endpoint instead
- Use forgot-password if password is forgotten

### "Too many registration attempts"
- Rate limit exceeded (3 per hour per IP)
- Wait 1 hour and retry
- Use different IP if testing multiple registrations

### "Password must contain..."
- Password doesn't meet strength requirements
- Check all requirements: 8+ chars, uppercase, lowercase, number, special char

### "Invalid or expired verification token"
- Token has expired (24-hour window)
- Click "Resend verification" in email to get new token
- Token might have already been used

### Email Not Received
- Check spam/junk folder
- Verify SMTP configuration in .env
- Check MongoDB AuthLog for send failures
- In development (EMAIL_SERVICE=test), tokens logged to console

### "MONGODB_URI is not set"
- Add MONGODB_URI to .env file
- Or set as environment variable before starting server
- Restart server after changing

---

## What's Next

### Phase 2: Advanced Security
- [ ] Two-factor authentication (2FA) with TOTP
- [ ] Device recognition and trust
- [ ] Session management and device logout
- [ ] Backup codes for account recovery

### Phase 3: Admin Management
- [ ] Admin user management endpoints
- [ ] Role-based access control (RBAC)
- [ ] Admin activity dashboard
- [ ] Account suspension/termination

### Phase 4: Compliance
- [ ] GDPR data export/deletion
- [ ] Compliance audit reports
- [ ] Encryption at rest for sensitive data
- [ ] SOC 2 compliance documentation

