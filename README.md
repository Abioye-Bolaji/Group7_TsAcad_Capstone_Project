# Multitenancy Computer Based Test (CBT) Platform
### Group 7 Capstone Project — TS Academy

A robust, scalable, and secure multitenancy platform designed to host and manage Computer Based Tests for multiple organizations (tenants). This project implements strict data isolation using a `tenantId` architecture.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas account or local MongoDB instance
- Postman (for API testing)

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Abioye-Bolaji/Group7_TsAcad_Capstone_Project.git
   cd Group7_TsAcad_Capstone_Project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Copy the example file: `cp .env.example .env`
   - Open `.env` and fill in your `MONGO_URI` and other secrets.

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The server will start at `http://localhost:5000`

---

## 🛠 Project Architecture

### Data Isolation (The Tenant Contract)
Every database model (except Super Admin data) **MUST** include a `tenantId` field.
- **Middleware:** The `tenant.middleware.js` automatically extracts the `tenantId` from the authenticated user.
- **Contract:** Teammates should refer to `TENANT_ID_CONTRACT.md` for implementation details.

### Naming Conventions
To maintain consistency, we use the following dot-notation naming convention:
- **Controllers:** `name.controller.js`
- **Services:** `name.service.js`
- **Models:** `name.model.js`
- **Routes:** `name.routes.js`
- **Middlewares:** `name.middleware.js`
- **Validations:** `name.validation.js`

---

## 📂 Folder Structure
```text
src/
├── config/         # Database and third-party configs
├── controllers/    # Route handlers (Request/Response logic)
├── middlewares/    # Custom Express middlewares (Auth, Tenant, Errors)
├── models/         # Mongoose schemas
├── routes/         # API Route definitions
├── services/       # Business logic (DB queries, calculations)
├── utils/          # Helper functions (Response handlers, tokens)
└── validations/    # Joi/Validation schemas
```

---

## 🛣 API Roadmap (v1)

### 🏢 Tenant Management (F2)
- `GET /api/v1/tenants` - List all tenants (Super Admin)
- `POST /api/v1/tenants` - Create new tenant (Super Admin)
- `GET /api/v1/tenants/me` - Get own tenant info (Tenant Admin)

### 🔐 Auth & Authorization (F1)
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout

### 💳 Subscription & Billing (F11)
- `GET /api/v1/subscriptions/plans` - View plans
- `POST /api/v1/subscriptions/assign` - Subscribe to a plan

---

## 🤝 Contributing
1. Always pull the latest `develop` branch before starting.
2. Create a feature branch: `feat/your-feature-name`.
3. Follow the naming conventions listed above.
4. Open a Pull Request into `develop` for review.