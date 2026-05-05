# 🚀 VidyaVault: Tuition Test & Rewards Management System

VidyaVault is a premium, full-stack tuition management platform built with a high-performance TypeScript stack. It provides a comprehensive solution for managing tests, analyzing student performance, and gamifying the learning experience through rewards.

---

## ✨ Key Features

### 🛡️ Role-Based Access Control (RBAC)
- **Superadmin**: Full system oversight, user management, and global analytics.
- **Teacher**: Create and manage tests, view student progress, and generate AI-powered questions.
- **Student**: Take tests, track performance history, and earn rewards for achievements.

### 📊 Performance Analytics
- Real-time data visualization of test scores using Recharts.
- Comparative analytics for teachers to track class-wide progress.
- Personalized performance feedback for students.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, TypeScript | Fast, modern UI with strict typing |
| **Animation** | Framer Motion | Premium, smooth micro-interactions |
| **Backend** | Node.js, Express 5 | Robust API with modular architecture |
| **ORM** | Prisma | Type-safe database access and migrations |
| **Database** | PostgreSQL (Azure) | Scalable relational database |
| **Auth** | JWT, bcrypt | Secure authentication and password hashing |

---

## 📂 Project Structure

```text
VidyaVault/
├── .github/workflows/    # CI/CD pipelines
│   ├── deploy-static-webapp.yml  # Frontend Deployment
│   └── deploy-backend.yml        # Backend Deployment
├── client/               # Frontend React application
│   ├── src/              # Components, Hooks, Pages
│   └── staticwebapp.config.json # SPA Routing & API Redirects
├── server/               # Backend Express application
│   ├── src/              # Controllers, Services, Middleware
│   ├── prisma/           # Schema, Migrations, Seeds
│   └── web.config        # IIS/iisnode configuration
├── package.json          # Root workspace configuration
└── README.md             # This file
```

---

## ⚙️ Configuration & Environment Variables

The application relies on specific environment variables to function correctly across development and production.

### 🏠 Local Development (.env at Root)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret key for signing tokens | `super-secret-key-123` |
| `PORT` | Backend API port | `4000` |

### 🌐 Frontend (Vite)
| Variable | Description | Required In |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of the Backend API | Production Build |
| `VITE_UI_ONLY` | Enables demo mode without backend | Local Dev |

---

## ☁️ Azure Deployment Configuration

VidyaVault is deployed using a decoupled architecture to maximize performance and scalability.

### 1. Frontend: Azure Static Web Apps
- **Hosting**: Files are served from `client/dist`.
- **Routing**: `client/staticwebapp.config.json` ensures that all frontend routes are redirected to `index.html` (supporting React Router) and permits `/api/*` traffic.
- **CI/CD**: Managed by `deploy-static-webapp.yml`.

### 2. Backend: Azure App Service (Linux)
- **Deployment Method**: Zip Deploy via GitHub Actions.
- **Runtime**: Node.js 22 LTS.
- **Startup Command**: `node dist/server.js` (Configured via Azure CLI during deployment).
- **App Settings (Secrets)**: Must be set in the Azure Portal:
    - `DATABASE_URL`: Production PostgreSQL string.
    - `JWT_SECRET`: Secure production secret.
    - `NODE_ENV`: Should be `production`.

### 3. Database: Azure Database for PostgreSQL
- **Schema Management**: Prisma handles all updates.
- **Migrations**: `npx prisma migrate deploy` runs automatically during the backend deployment pipeline to ensure the database schema stays in sync with the code.

---

## 🔄 CI/CD Pipeline Details

The deployment is fully automated via GitHub Actions.

### 🎨 Frontend Pipeline (`deploy-static-webapp.yml`)
1. **Trigger**: Push to `main` branch (specifically in `client/`).
2. **Build**: Runs `npm run build -w client`.
3. **Inject**: Injects `VITE_API_URL` secret into the build.
4. **Deploy**: Uploads artifacts to Azure Static Web Apps.

### ⚙️ Backend Pipeline (`deploy-backend.yml`)
1. **Trigger**: Push to `main` branch (specifically in `server/`).
2. **Build**: Compiles TypeScript and generates the Prisma client.
3. **Package**: Creates a `deployment.zip` containing the compiled `dist`, `node_modules`, and `prisma` schema.
4. **Deploy**: Uploads zip to Azure App Service.
5. **Post-Deploy**: 
    - Sets the startup command.
    - Executes `prisma migrate deploy` to update the database.
    - Runs the seeding script to ensure a `superadmin` exists.
    - Performs a health check (`/api/health`) and a test login.

---

## 🛠️ Maintenance & Troubleshooting

### Health Check
Monitor the live API health at:
`https://vidyavault-api-israfil.azurewebsites.net/api/health`

### Database Updates
To update the database schema:
1. Modify `server/prisma/schema.prisma`.
2. Run `npx prisma migrate dev` locally to create a migration.
3. Commit and push the new migration file; the CI/CD pipeline will apply it to production.

### Logs
To view live logs from the backend:
```bash
az webapp log tail --name vidyavault-api-israfil --resource-group vidyavault-rg
```

---

## 📄 License
This project is licensed under the MIT License.
