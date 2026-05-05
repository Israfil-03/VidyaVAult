# 🚀 VidyaVault: Tuition Test & Rewards Management System

VidyaVault is a premium, full-stack tuition management platform built with a high-performance TypeScript stack. It provides a comprehensive solution for managing tests, analyzing student performance, and gamifying the learning experience through rewards.

---

## ✨ Key Features

### 🛡️ Role-Based Access Control (RBAC)
- **Superadmin**: Full system oversight, user management, and global analytics.
- **Teacher**: Create and manage tests, view student progress, and generate AI-powered questions.
- **Student**: Take tests, track performance history, and earn rewards for achievements.

### 📊 Performance Analytics
- Real-time data visualization of test scores.
- Comparative analytics for teachers to track class-wide progress.
- Personalized performance feedback for students.

### 🏆 Reward System
- Achievement-based rewards to incentivize student engagement.
- Integrated reward service to track and distribute virtual accolades.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite | Fast, modern UI with TypeScript |
| **Styling** | Vanilla CSS, Framer Motion | Smooth animations and premium aesthetics |
| **Backend** | Node.js, Express 5 | Robust API with strict TypeScript typing |
| **ORM** | Prisma | Type-safe database access |
| **Database** | PostgreSQL | Scalable relational database |
| **Auth** | JWT, bcrypt | Secure authentication and password hashing |

---

## 📂 Project Structure

```text
VidyaVault/
├── .github/workflows/    # CI/CD pipelines (Frontend & Backend)
├── client/               # Frontend React application
│   ├── src/              # UI components and business logic
│   └── staticwebapp.config.json # Azure Static Web App config
├── server/               # Backend Express application
│   ├── src/              # API controllers, middleware, and services
│   ├── prisma/           # Database schema and migrations
│   └── web.config        # Azure App Service configuration
├── package.json          # Root workspace configuration
└── README.md             # This file
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: v22.x or higher
- **PostgreSQL**: Running instance (Local or Remote)

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root and fill in your credentials:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/vidyavault"
JWT_SECRET="your_secret_key"
PORT=4000
```

### 3. Installation
```bash
npm install
```

### 4. Database Setup
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 5. Start Development
```bash
npm run dev
```
- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:4000/api`

---

## ☁️ Azure Deployment

VidyaVault is architected for seamless deployment to the Microsoft Azure ecosystem.

### Azure Services Used
- **Azure Static Web Apps**: Hosts the React frontend.
- **Azure App Service (Linux)**: Hosts the Node.js backend.
- **Azure Database for PostgreSQL**: Managed database.

### 🔐 Required GitHub Secrets
Ensure the following secrets are configured in your GitHub repository (**Settings > Secrets > Actions**):
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: Deployment token for Frontend.
- `AZURE_CREDENTIALS`: Azure login credentials for Backend.
- `DATABASE_URL`: Production PostgreSQL connection string.
- `SUPERADMIN_PASSWORD`: Default password for the initial superadmin user.
- `VITE_API_URL`: The URL of your deployed backend API.

### 🔄 CI/CD Process
Deployment triggers automatically on every push to the `main` branch. 
- **Frontend Workflow**: `.github/workflows/deploy-static-webapp.yml`
- **Backend Workflow**: `.github/workflows/deploy-backend.yml`

---

## 🔒 Security
- Strict JWT-based authentication.
- Password encryption using `bcrypt`.
- Environment variable isolation for sensitive data.
- Automated Prisma migrations for safe database versioning.

---

## 📄 License
This project is licensed under the MIT License.
