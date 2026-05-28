# Deployment Checklist - Nasi Goreng Polonia Auth System

## Pre-Deployment

- [ ] All auth tests passing (`npm test`)
- [ ] Environment variables configured in `.env.production`
- [ ] JWT_SECRET is minimum 32 characters and unique
- [ ] MONGODB_URI points to production database with replica set
- [ ] Email SMTP credentials tested and working
- [ ] CORS_ORIGINS configured for frontend domain
- [ ] HTTPS/TLS certificate obtained
- [ ] Database backups configured

## Configuration Verification

- [ ] `NODE_ENV=production`
- [ ] `PORT` correct (default 5000)
- [ ] `MONGODB_URI` uses Atlas or production MongoDB
- [ ] `JWT_SECRET` is cryptographically secure
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` configured
- [ ] `FRONTEND_URL` is correct frontend domain
- [ ] `ALLOW_ADMIN_REGISTER=false` (after first admin created)
- [ ] No secrets committed to git

## Database Setup

- [ ] Create MongoDB production database
- [ ] Initialize replica set if needed
- [ ] Create indexes:
  ```javascript
  db.admins.createIndex({ email: 1 })
  db.admins.createIndex({ resetToken: 1 })
  db.refreshtokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  db.authlogs.createIndex({ adminId: 1, createdAt: -1 })
  db.authlogs.createIndex({ email: 1, createdAt: -1 })
  ```
- [ ] Backup of production database
- [ ] Test restore procedure

## Security

- [ ] Enable HTTPS/TLS on production server
- [ ] Configure rate limiting (already built-in)
- [ ] Set up firewall rules
- [ ] Enable MongoDB authentication
- [ ] Configure IP whitelist if applicable
- [ ] Set up server monitoring and alerts
- [ ] Configure log aggregation

## Deployment Steps

1. **Build & Test**
   ```bash
   cd backend
   npm ci --production
   npm test
   ```

2. **Deploy Code**
   - Copy code to production server
   - Update `.env` with production configuration
   - Do NOT commit `.env` to git

3. **Start Service**
   ```bash
   npm start
   # or with process manager
   pm2 start server.js --name "nasi-goreng-api"
   ```

4. **Verify Deployment**
   ```bash
   curl -X GET https://api.nasiggorengpolonia.id/api/health
   ```

## Monitoring & Alerts

- [ ] Set up error logging (Sentry, DataDog, etc.)
- [ ] Configure email alerts for failed logins
- [ ] Set up database backup alerts
- [ ] Monitor disk space
- [ ] Monitor memory usage
- [ ] Set up uptime monitoring
- [ ] Configure log retention policy

## Post-Deployment

- [ ] Create first admin account
- [ ] Verify registration → verification → login flow
- [ ] Test password reset flow
- [ ] Check auth logs in database
- [ ] Send communication to admins about new system
- [ ] Document production credentials in secure vault
- [ ] Schedule regular security audits

## First Admin Creation

After deployment:

```bash
# 1. Set environment variable temporarily
export ALLOW_ADMIN_REGISTER=true

# 2. Create first admin via API
curl -X POST https://api.nasiggorengpolonia.id/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nasiggorengpolonia.id",
    "password": "SecureP@ss123456"
  }'

# 3. Check logs for verification token
# 4. Verify email via token
# 5. Set ALLOW_ADMIN_REGISTER=false
```

## Rollback Plan

If deployment fails:

1. Stop production service
2. Revert code to previous version
3. Verify service starts
4. Check that old auth endpoints still work
5. Monitor for errors

## Scaling Considerations

For high traffic:

- [ ] Use Redis for rate limiting store (instead of in-memory)
- [ ] Use Redis for session store if implemented
- [ ] Configure load balancer with sticky sessions if needed
- [ ] Use MongoDB replica set for high availability
- [ ] Consider CDN for static assets
- [ ] Set up horizontal scaling with multiple instances

## Security Hardening

- [ ] Enable MongoDB field-level encryption
- [ ] Use VPN/private network for database access
- [ ] Implement API key rotation policy
- [ ] Set up intrusion detection
- [ ] Enable audit logging for all admin operations
- [ ] Implement rate limiting per user (not just IP)
- [ ] Add CAPTCHA to registration/forgot-password

## Performance Optimization

- [ ] Monitor response times
- [ ] Check database query performance
- [ ] Optimize email sending (async queue if needed)
- [ ] Cache public endpoints
- [ ] Use compression middleware (already in Express)
- [ ] Monitor JWT token generation speed

## Compliance

- [ ] Ensure GDPR compliance (data handling)
- [ ] Set up data deletion procedures
- [ ] Document data retention policy
- [ ] Implement audit trail retention
- [ ] Set up compliance reporting
- [ ] Document security procedures

## Documentation

- [ ] Update README with production deployment steps
- [ ] Document admin login procedure
- [ ] Create runbook for common issues
- [ ] Document incident response procedures
- [ ] Create database backup/restore procedures
- [ ] Document password reset procedures for locked-out admins

---

## Sign-Off

- **Deployed by:** _________________ Date: _________
- **Verified by:** _________________ Date: _________
- **Notes:** _________________________________________

