# Group 7: Multitenant CBT Platform 🚀

A high-performance, secure, and scalable Computer Based Testing (CBT) platform designed for multiple organizations (tenants). This platform allows schools, corporate bodies, and training centers to host exams with complete data isolation.

## 🏗 Project Architecture

This project follows a strict **Modular Monolith** structure with **Multitenant Isolation** at its core.

- **Backend**: Node.js + Express
- **Database**: MongoDB (Mongoose)
- **Security**: JWT Authentication + Tenant Scoping Middleware
- **Module System**: CommonJS (`require` / `module.exports`)
- **Coding Standard**: Strict `dot.notation.js` for all files

## 🚦 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas or local MongoDB instance

### 2. Installation
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```
*Make sure to fill in your `MONGO_URI` and `JWT_SECRET` in the `.env` file.*

### 3. Setup & Seeding
To populate the platform with initial data:
```bash
# Seed the Super Admin
npm run seed:admin

# Seed Demo Data (Tenants, Admins, Candidates, Exams)
npm run seed:demo
```

### 4. Run Development Server
```bash
npm run dev
```
The server will run on: `http://localhost:5000`

## 🛡 Core Feature Modules

| Module | Feature | Status |
| :--- | :--- | :--- |
| **F1/F2** | **Auth & Multi-tenancy** | Strict isolation between organizations. |
| **F3** | **Question Bank** | CRUD for questions with bulk upload support. |
| **F5** | **Candidate Mgmt** | Cohort grouping and CSV student import. |
| **F6/F8** | **Exams & Results** | Real-time session saving and automated grading. |
| **Certificates** | **PDF Generation** | Secure, verifiable certificate generation. |
| **F11** | **Billing** | Subscription-based access (Free/Basic/Pro). |
| **F12** | **Audit Logs** | Tracking of all tenant and platform actions. |

## 🤝 Team Contribution Rules

To maintain project stability, all contributors **must** follow these rules:

1.  **File Naming**: Use `feature.type.js` (e.g., `result.controller.js`).
2.  **Folder Structure**: All code must live inside the `src/` folder.
3.  **Tenant Security**: Every protected route must include `tenantMiddleware`.
    - `router.get('/path', authMiddleware, tenantMiddleware, controller);`
4.  **CommonJS**: Never use `import` or `export`. Use `require` and `module.exports`.

---

**Developed with ❤️ by Group 7 Capstone Team**
