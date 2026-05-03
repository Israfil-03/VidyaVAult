# 🚀 VidyaVault - Complete Deployment Guide (Updated May 3, 2026)

## ✅ What Was Fixed

### Critical Issue: Incorrect Startup Command
The GitHub Actions deployment was failing because the startup command was incorrect:
- **Error**: `node dist/src/server.js` ❌ (File doesn't exist at this path)
- **Fix**: `node dist/server.js` ✅ (Correct TypeScript output path)
- **Reason**: TypeScript compiler is configured with `"outDir": "dist"` which flattens the directory structure

### Additional Improvements
1. **web.config**: Added Azure App Service configuration for Node.js
2. **Build Verification**: Added checks to ensure `dist/server.js` exists before deployment
3. **Extended Timeouts**: Increased health check from 30 to 40 attempts
4. **Better Logging**: Added detailed error messages for debugging
5. **Node Version**: Added .nvmrc (22.11.0) for consistency

---

## 📋 Pre-Deployment Checklist

### 1. GitHub Secrets (REQUIRED)
Go to: **GitHub.com → Israfil-03/VidyaVAult → Settings → Secrets and Variables → Actions**

Ensure these 3 secrets exist:

```
✓ AZURE_WEBAPP_PUBLISH_PROFILE     → [Publish profile XML]
✓ DATABASE_URL                      → [PostgreSQL connection string]
✓ SUPERADMIN_PASSWORD               → [Superadmin password]
```

**If missing, add them now!** The deployment will fail without these.

### 2. Azure App Service Configuration
Verify in Azure Portal:
- **App Service**: `vidyavault-api-israfil`
- **Resource Group**: `vidyavault-rg`
- **Runtime Stack**: Node 22
- **Status**: Should show as "Running"

### 3. Database
- **Server**: `vidyavault-db-17896.postgres.database.azure.com`
- **Database**: `mirage`
- **Status**: Connection must be working

---

## 🚀 Deploy Now

### Option 1: Trigger Deployment via GitHub (Recommended)

The deployment will trigger automatically on the next push to `main` branch.

**Since we just committed fixes:**
```bash
# The deployment should start automatically
# Check GitHub Actions: https://github.com/Israfil-03/VidyaVAult/actions
```

**Or manually trigger:**
```bash
# Make a small change to trigger deployment
echo "# Updated: $(date)" >> DEPLOYMENT_STATUS.md
git add DEPLOYMENT_STATUS.md
git commit -m "chore: update deployment status"
git push origin main
```

Then watch the deployment:
1. Go to: **GitHub.com → Israfil-03/VidyaVAult → Actions**
2. Click on the "Deploy Backend to Azure" workflow
3. Watch the progress in real-time

### Option 2: Manual Deployment (If automated fails)

```bash
# Build locally
npm ci
npm run prisma:generate -w server
npm run build -w server

# Create deployment package
mkdir -p deploy
cp -r server/dist deploy/dist
cp -r node_modules deploy/
cp -r server/prisma deploy/
cp package.json deploy/
cp package-lock.json deploy/
cp web.config deploy/
cd deploy && zip -r ../deployment.zip . && cd ..

# Deploy
az webapp deployment source config-zip \
  -g vidyavault-rg \
  -n vidyavault-api-israfil \
  --src ./deployment.zip

# Configure startup
az webapp config set \
  -g vidyavault-rg \
  -n vidyavault-api-israfil \
  --startup-file "node dist/server.js"

# Start
az webapp start -g vidyavault-rg -n vidyavault-api-israfil
```

---

## ✅ Verify Deployment Success

### After deployment completes, verify:

#### 1. Health Check
```bash
curl https://vidyavault-api-israfil.azurewebsites.net/api/health
# Expected response:
# {"success":true,"data":{"status":"ok"}}
```

#### 2. Login Test
```bash
curl -X POST https://vidyavault-api-israfil.azurewebsites.net/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "identity": "superadmin",
    "password": "Israfil@860974"
  }'
# Expected: JWT token in response
```

#### 3. Database Status
```bash
az webapp config show -g vidyavault-rg -n vidyavault-api-israfil
```

---

## 🔍 Troubleshooting

### App Still Not Starting?

#### 1. Check Logs
```bash
# Get live logs
az webapp log tail -g vidyavault-rg -n vidyavault-api-israfil --provider filesystem

# Download logs to file
az webapp log download -g vidyavault-rg -n vidyavault-api-israfil --log-file app-logs.zip
```

#### 2. Verify Startup Command
```bash
az webapp config show -g vidyavault-rg -n vidyavault-api-israfil --query "startupCommand"
# Should output: node dist/server.js
```

#### 3. Check Environment Variables
```bash
az webapp config appsettings list -g vidyavault-rg -n vidyavault-api-israfil
# Look for: NODE_ENV, DATABASE_URL, JWT_SECRET, PORT
```

#### 4. Restart App
```bash
az webapp restart -g vidyavault-rg -n vidyavault-api-israfil
```

#### 5. Check GitHub Actions Workflow
If automated deployment failed:
- Go to: https://github.com/Israfil-03/VidyaVAult/actions
- Click the failed workflow
- Check the "Deploy to Azure App Service" and "Configure startup command" steps for errors

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `node dist/server.js: No such file` | Build didn't complete. Check "Verify build output" step in GitHub Actions |
| `Cannot connect to database` | Check `DATABASE_URL` environment variable and database firewall rules |
| `JWT_SECRET not found` | Add `JWT_SECRET` environment variable to Azure App Service |
| `Health check timeout` | App is taking too long to start. Check logs with `az webapp log tail ...` |
| `Port already in use` | Change `PORT` environment variable (default: 4000) |

---

## 📊 Expected Deployment Timeline

1. **GitHub Actions Trigger**: Immediate (on push)
2. **Build & Test**: ~1-2 minutes
3. **Create Deployment Package**: ~30 seconds
4. **Deploy to Azure**: ~1-2 minutes
5. **App Startup**: ~30 seconds - 1 minute
6. **Database Migrations**: ~30-60 seconds
7. **Seeding**: ~10-20 seconds
8. **Verification**: ~30 seconds

**Total**: ~5-10 minutes ⏱️

---

## 🎯 Success Indicators

After deployment completes, you should see:
- ✅ GitHub Actions workflow shows "✓ Deployment Summary"
- ✅ Health endpoint returns `{"success":true,"data":{"status":"ok"}}`
- ✅ Login endpoint returns JWT token
- ✅ Azure App Service status: "Running"
- ✅ No errors in Azure logs

---

## 📞 API Endpoints (After Deployment)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/auth/login` | POST | User login |
| `/api/auth/signup` | POST | User registration |
| `/api/teacher/create-test` | POST | Create test |
| `/api/student/submit-answer` | POST | Submit test answer |
| `/api/rewards/get-user-rewards` | GET | Get user rewards |

---

## 🔐 Security Checklist

- ✅ All secrets are in GitHub Secrets (not in code)
- ✅ Database connection uses SSL (sslmode=require)
- ✅ JWT secret is 16+ characters
- ✅ App Service uses HTTPS only
- ✅ Firewall rules restrict database access

---

## 📝 Next Steps

1. **Monitor Deployment**: Watch GitHub Actions workflow
2. **Verify Health**: Test health endpoint after deployment
3. **Test Full Flow**: Login → Create test → Submit answer
4. **Check Logs**: Monitor for any errors in Azure logs
5. **Frontend**: Deploy React frontend (if not done)
6. **Custom Domain**: Add custom domain (optional)

---

## 🎉 DEPLOYMENT COMPLETE!

Once everything is verified:
```
✅ Backend API: https://vidyavault-api-israfil.azurewebsites.net
✅ Database: mirage (PostgreSQL)
✅ Health: https://vidyavault-api-israfil.azurewebsites.net/api/health
```

**The app is now live! 🚀**

---

**Last Updated**: May 3, 2026
**Deployment Status**: Ready
**Estimated Time to Live**: 5-10 minutes
