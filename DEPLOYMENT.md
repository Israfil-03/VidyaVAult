# VidyaVault Backend Deployment Guide

## 📋 Overview

This guide covers deploying the VidyaVault backend to Azure App Service with GitHub Actions CI/CD.

**Architecture:**
- App Service (B1 Linux, Node 22 LTS)
- PostgreSQL Flexible Server (B1MS, 1vCore)
- GitHub Actions for automated deploy-on-push
- Database: `mirage`

**Cost estimate:** ~₹52/day (₹8,280 for 160 days)

---

## 🚀 One-Time Setup (Already Completed)

### ✅ Completed Steps:

1. **Resource Group & Infrastructure**
   - Created: `vidyavault-rg` in Azure for Students subscription
   - App Service: `vidyavault-api-israfil` (B1 tier)
   - PostgreSQL: `vidyavault-db-17896` (B1MS tier, East Asia)

2. **Database Setup**
   - Created database named `mirage`
   - Schema deployed via Prisma migrations
   - All 15 models ready

3. **App Service Configuration**
   - Node 22 LTS runtime
   - Startup command: `node dist/src/server.js`
   - Environment variables configured:
     - `NODE_ENV=production`
     - `JWT_SECRET`, `JWT_EXPIRES_IN`
     - `SUPERADMIN_*` credentials
     - `DATABASE_URL` (points to mirage DB)

4. **Code Quality**
   - Fixed SVG attribute typos in client (strokeLinejoin)
   - Backend passes all tests ✓
   - Client build validated ✓

---

## 🔄 Deploy Process (GitHub Actions)

### Step 1: Add GitHub Secrets

Go to your GitHub repository → **Settings → Secrets and Variables → Actions**

Add these 3 secrets:

| Secret Name | Value |
|---|---|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | [See section below](#getting-publish-profile) |
| `DATABASE_URL` | `postgresql://pgadmin:@vidyavault-db-17896.postgres.database.azure.com:5432/mirage?sslmode=require` |
| `SUPERADMIN_PASSWORD` | `Israfil@860974` |

#### Getting Publish Profile

Run locally:
```bash
az account set --subscription "Azure for Students"
az webapp deployment list-publishing-profiles \
  -g vidyavault-rg \
  -n vidyavault-api-israfil \
  --xml > publish-profile.xml
```

Then paste the contents of `publish-profile.xml` as the secret value.

### Step 2: Push Code to GitHub

The GitHub Actions workflow is configured to trigger on pushes to `main` or `Update_2` branches.

```bash
git push origin Update_2
```

**Workflow triggers when:**
- Push to `main` or `Update_2`
- Files changed in `server/` or workflow itself

**Workflow steps:**
1. Checkout code
2. Setup Node 22
3. Build backend
4. Create deployment package (dist + node_modules + prisma)
5. Deploy to Azure App Service
6. Wait for app to start (30 retries, 10s each)
7. Run Prisma migrations
8. Seed superadmin user
9. Verify deployment (health check + login test)

---

## 🧪 Testing Deployment

### Health Check

```bash
curl https://vidyavault-api-israfil.azurewebsites.net/api/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 1234
}
```

### Superadmin Login

```bash
curl -X POST https://vidyavault-api-israfil.azurewebsites.net/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "identity": "superadmin",
    "password": "Israfil@860974"
  }'
```

Expected response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "superadmin",
    "email": "israfilhoque523@gmail.com",
    "role": "SUPERADMIN"
  }
}
```

---

## 📦 Cost Optimization

| Service | SKU | Est. Cost/Day | Est. Cost/160 Days |
|---|---|---|---|
| App Service | B1 (1 vCore, 1.75GB) | ₹36 | ₹5,760 |
| PostgreSQL | B1MS (1 vCore, 2GB) | ~₹18 | ~₹2,880 |
| **Total** | | **~₹54** | **~₹8,640** |

This fits within your ₹8,400 budget with ~₹200 margin for traffic/overage.

**If over budget:**
- Reduce logs retention (Azure Monitor)
- Scale down to smaller PostgreSQL instance
- Use Azure's cost management tools

---

## 🛠️ Manual Deployment (Fallback)

If GitHub Actions fails, deploy manually via Azure CLI:

```bash
# Build locally
npm run build -w server

# Create package
mkdir -p deploy
cp -r dist deploy/
cp -r node_modules deploy/
cp server/prisma deploy/
cp package.json deploy/
cd deploy && zip -r ../deployment.zip . && cd ..

# Deploy
az webapp up \
  --resource-group vidyavault-rg \
  --name vidyavault-api-israfil \
  --plan vidyavault-app-plan \
  --runtime "node|22-lts" \
  --sku B1 \
  -z deployment.zip

# Run migrations & seed
npx prisma migrate deploy --schema=server/prisma/schema.prisma
npm run prisma:seed -w server
```

---

## 📊 Monitoring & Logs

### App Service Logs

```bash
# Stream logs (last 100 lines)
az webapp log tail -g vidyavault-rg -n vidyavault-api-israfil

# Download logs
az webapp log download -g vidyavault-rg -n vidyavault-api-israfil -d ./logs
```

### Database Logs

```bash
# Connect to database and check logs
az postgres flexible-server execute \
  -g vidyavault-rg \
  -s vidyavault-db-17896 \
  -u pgadmin \
  -p "$(az postgres flexible-server show -g vidyavault-rg -s vidyavault-db-17896 --query administratorLoginPassword)" \
  -d mirage \
  -c "SELECT * FROM pg_stat_statements ORDER BY query_start DESC LIMIT 10;"
```

---

## 🔐 Security Notes

1. **Database Firewall**
   - Currently open to all IPs (0.0.0.0/0)
   - In production, restrict to App Service IP only

2. **Secrets Management**
   - Store sensitive values in GitHub Secrets (not in code)
   - Rotate JWT_SECRET periodically
   - Change SUPERADMIN_PASSWORD after first login

3. **HTTPS Enforcement**
   - All app URLs use HTTPS
   - TLS 1.2+ enforced

---

## 🚨 Troubleshooting

### Deployment fails at "Wait for app to start"

**Causes:**
- App Service not running
- Startup command incorrect
- Dependencies not installed

**Fix:**
```bash
# Check app status
az webapp show -g vidyavault-rg -n vidyavault-api-israfil --query state

# Restart app
az webapp restart -g vidyavault-rg -n vidyavault-api-israfil

# Check logs
az webapp log tail -g vidyavault-rg -n vidyavault-api-israfil
```

### Superadmin login fails

**Causes:**
- Seed didn't run
- Database connection error
- Wrong password

**Fix:**
```bash
# Manually seed with correct env vars
export DATABASE_URL="postgresql://pgadmin:@vidyavault-db-17896.postgres.database.azure.com:5432/mirage?sslmode=require"
export SUPERADMIN_EMAIL="israfilhoque523@gmail.com"
export SUPERADMIN_PASSWORD="Israfil@860974"
export SUPERADMIN_USERNAME="superadmin"

npm run prisma:seed -w server
```

### App quota exceeded

**Cause:** F1 tier used up compute quota

**Fix:** Already upgraded to B1 ✓

---

## 📝 Environment Variables Reference

| Variable | Value | Source |
|---|---|---|
| `NODE_ENV` | `production` | Azure app settings |
| `PORT` | `8080` | Azure app settings |
| `DATABASE_URL` | `postgresql://...mirage...` | Azure app settings |
| `JWT_SECRET` | `vidyavault-jwt-secret-2026-prod...` | Azure app settings |
| `JWT_EXPIRES_IN` | `8h` | Azure app settings |
| `INTERNAL_AI_TOKEN` | `vidyavault-internal-ai-service-token...` | Azure app settings |
| `SUPERADMIN_EMAIL` | `israfilhoque523@gmail.com` | Azure app settings |
| `SUPERADMIN_PASSWORD` | `Israfil@860974` | GitHub secret → GitHub Actions → Seed |
| `SUPERADMIN_USERNAME` | `superadmin` | Azure app settings |

---

## ✅ Deployment Checklist

Before pushing to GitHub:

- [ ] Node 22 locally: `node --version`
- [ ] Build works: `npm run build`
- [ ] Linting passes: `npm run lint`
- [ ] Tests pass: `npm run test`
- [ ] Git branch is `main` or `Update_2`
- [ ] All changes committed: `git status`
- [ ] GitHub secrets added (see Step 1 above)
- [ ] Azure App Service is in B1 tier
- [ ] Database `mirage` exists

Then:
```bash
git push origin Update_2
```

Monitor deployment in GitHub → Actions tab.

---

## 🎯 Next Steps

1. **Add GitHub secrets** (see Step 1)
2. **Push code**: `git push origin Update_2`
3. **Monitor**: Watch GitHub Actions for deploy status
4. **Test**: Run health check & login test above
5. **Frontend**: Once backend is stable, deploy client to Azure Static Web Apps

---

**Support:**
- Azure CLI reference: https://learn.microsoft.com/cli/azure/
- Prisma docs: https://www.prisma.io/docs/
- GitHub Actions: https://docs.github.com/en/actions

Last updated: 2024-01-15
