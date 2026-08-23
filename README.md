# Enterprise IDP & Workspace Management Platform

![Platform](https://img.shields.io/badge/Platform-Enterprise_SaaS-brand_gold?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-React_%7C_Express_%7C_PostgreSQL-blue?style=for-the-badge)
![Architecture](https://img.shields.io/badge/Architecture-Monorepo_(PNPM)-lightgrey?style=for-the-badge)

## 📖 Overview
The Enterprise Identity Provider (IDP) is a secure, multi-tenant workspace administration platform designed for modern HR and IT teams. It provides air-tight data isolation across different organizations (tenants) while offering a highly scalable, decoupled administration dashboard. 

The platform facilitates complete organizational onboarding, granular Role-Based Access Control (RBAC), reverse module mapping, immutable system audits, and active session management—all wrapped in a premium, bespoke Neumorphic UI design system.

## ✨ Core Features

### 🏢 Multi-Tenant Architecture
* **Strict Data Isolation:** Every user, role, permission, and audit log is strictly bound to a `tenant_id`, ensuring enterprise-grade data sovereignty.
* **Self-Serve Onboarding:** Frictionless provisioning of new corporate workspaces, capturing custom domains, brand colors, and master administrator credentials.

### 🛡️ Access & Identity Management
* **Waiting Room Verification:** New employees are placed in a secure "Pending" state upon registration, requiring explicit HR approval and asset assignment before accessing the workspace.
* **Granular RBAC:** Create custom roles (e.g., "Host Admin") and map them to specific system permissions to strictly control API and UI visibility.
* **Credential Controls:** Master capabilities to forcefully trigger password resets and clear security/brute-force lockouts for employees.

### 🧩 Asset & Module Mapping
* **Application Provisioning:** Register internal tools and applications within the workspace ecosystem.
* **Reverse Access Auditing:** View and manage exact employee lists authorized for specific internal modules (e.g., Payroll, Operations) with one-click revocation.

### 🔒 Enterprise Security
* **Live Network Sessions:** Monitor active JWT refresh tokens across the network and deploy a global "Kill Switch" to terminate compromised sessions instantly.
* **Immutable Audit Trail:** A comprehensive, paginated security log tracking IP addresses, timestamps, actor emails, and exact event metadata.

## 🛠️ Tech Stack
* **Frontend:** React, Vite, TypeScript, Tailwind CSS, Lucide Icons.
* **Backend:** Node.js, Express, TypeScript, RESTful APIs.
* **Database & Caching:** PostgreSQL, Redis (Session Blacklisting & OTPs).
* **Tooling:** PNPM Workspaces (Monorepo), Docker (Containerized DB/Cache).

## 🏗️ Project Structure

This project utilizes a **Monorepo Architecture** managed by `pnpm` workspaces, allowing seamless code sharing and dependency management between the client and server.

```text
idp-platform/
├── apps/
│   ├── backend/         # Express server, controllers, routing, and DB logic
│   └── frontend/        # React + Vite application (Neumorphic UI)
├── packages/
│   └── shared/          # Shared TypeScript interfaces, schemas, and utilities
├── docker-compose.yml   # Container orchestration for PostgreSQL and Redis
└── pnpm-workspace.yaml  # Workspace configuration
```

## 🏗️ Architecture Highlights

### Decoupled Routing
The frontend utilizes **React Router** with deeply nested layouts (e.g., `RootLayout`, `AppLayout`, `HRLayout`) to separate public flows from authenticated application modules and HR admin controls.

### Service Layer Pattern
The backend isolates raw database operations into dedicated service files such as `query.service.ts` and `crypto.service.ts`, keeping Express controllers lean and focused solely on HTTP request/response lifecycles.

### Shared Typings
The `packages/shared` directory acts as the **single source of truth** for TypeScript types, ensuring end-to-end type safety between the backend API and the frontend client.

---

# 🚀 Local Development Setup

## Prerequisites

Before you begin, ensure the following are installed on your machine:

- **Node.js** (v18 or higher)
- **PNPM** (v8 or higher)
- **Docker** & **Docker Compose** (for local PostgreSQL and Redis instances)

---

## 1. Clone & Install

Clone the repository and install all dependencies from the monorepo root.

```bash
git clone https://github.com/KUKIL04/KarmaSetu.git
cd KarmaSetu
pnpm install
```

---

## 2. Environment Configuration

Create environment files for both the backend and frontend applications.

### Backend (`apps/backend/.env`)

```env
PORT=3333
DATABASE_URL=postgres://postgres:password@localhost:5432/idp_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key
```

### Frontend (`apps/frontend/.env`)

```env
VITE_API_URL=http://localhost:3333/api/v1
```

---

## 3. Start Database Services

Launch the PostgreSQL and Redis containers using Docker Compose.

```bash
docker-compose up -d
```

> **Note**
>
> Ensure the database schema defined in:
>
> ```
> apps/backend/src/db/schema.sql
> ```
>
> is executed against your PostgreSQL instance before running the application.

---

## 4. Run the Development Servers

From the repository root, start both the frontend and backend development servers.

```bash
pnpm run dev
```

Once started:

| Service | URL |
|---------|-----|
| **Frontend (React + Vite)** | http://localhost:3000 |
| **Backend (Express API)** | http://localhost:3333 |

---

## 🎨 Design System

The frontend implements a premium, custom **Neumorphic Design Language**, moving away from traditional flat design to a tactile, extruded aesthetic. 

* **Global Utilities:** Custom CSS classes like `.embossed-card`, `.inner-depth`, `.embossed-badge`, and `.shine-btn` ensure consistent shadowing and debossed effects across all dashboards.
* **Custom Scrollbars:** Fully styled webkit scrollbars map perfectly to the brand's primary colors (Gamboge/Ochre) and debossed UI themes to prevent native browser UI clashing.
* **Typography & Layout:** Deep integration of Tailwind CSS for responsive grid layouts and strict typographic rules (e.g., `tracking-widest`, `uppercase` headers) to achieve a high-end enterprise feel.

## 🔐 Security Model & Authentication

The platform utilizes a hybrid authentication flow, combining the speed of stateless tokens with stateful revocation capabilities:

* **Dual-Token Architecture:** Short-lived JWT Access Tokens manage API authorization, paired with long-lived, rotating Refresh Tokens stored securely in PostgreSQL.
* **Multi-Factor Provisioning (OTP):** Registering a new workspace organization requires rigorous verification via both Email and Phone/SMS before the database transaction is permitted.
* **Cryptographic Hashing:** All user passwords and security question answers are securely salted and hashed using **Argon2id** (providing superior memory-hard resistance against brute-force attacks) before storage.
* **Role-Based Routing:** Every API request passes through a strict authentication middleware (`auth.ts`). Administrative endpoints mandate a secondary validation check to ensure the requester holds master administrative privileges.

## 🗺️ Roadmap & Next Steps

The frontend architecture and database schemas are fully robust. The following backend systems are slated for the next development sprint to bring the platform to full production readiness:

- [ ] **Redis Session Blacklist:** Upgrade the "Kill Session" functionality by pushing revoked JWT signatures to a high-speed Redis blacklist, intercepting compromised tokens mid-lifecycle.
- [ ] **Email Provider Integration:** Wire up a transactional email service (e.g., AWS SES, SendGrid) to dispatch time-sensitive, cryptographic tokens for the forced Password Reset protocol.
- [ ] **Brute-Force Defenses:** Finalize the `/login` controller logic to increment `failed_login_attempts` and dynamically enforce the `locked_until` timestamps, fully activating the Directory's "Clear Lockout" capability.
- [ ] **Global Audit Interceptor:** Inject an `AuditService.log()` middleware across all critical mutation endpoints (POST/PUT/DELETE) to autonomously populate the immutable `audit_logs` table.

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or modification of this codebase is strictly prohibited.