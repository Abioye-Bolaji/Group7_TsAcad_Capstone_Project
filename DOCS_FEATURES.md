# Group 7: Multitenant CBT Platform - Feature Status Report
**Current Branch**: `main`
**Last Updated**: 2026-05-23

This document tracks the features that have been successfully integrated and stabilized within the platform.

## 🚀 Integrated Features

| Feature ID | Feature Name | Status | Description |
| :--- | :--- | :--- | :--- |
| **F1** | **Authentication & Identity** | ✅ Stable | JWT-based authentication for all roles. Support for Blacklisting and Refresh Tokens. |
| **F2** | **Multitenancy Core** | ✅ Stable | Strict data isolation at the middleware level. Tenant registration and organization-specific scoping. |
| **F3** | **Question Bank** | ✅ Stable | CRUD for questions with bulk upload support and image handling via Cloudinary. |
| **F4** | **Exam Setup (Base)** | ✅ Stable | Backend API for creating, listing, and publishing exams. Integrated with F3. |
| **F5** | **Candidate Management** | ✅ Stable | Supports individual registration, **CSV Bulk Import**, cohort grouping, and **Plan Limit Enforcement**. |
| **F6** | **Exam Session** | ✅ Stable | Handles the test-taking lifecycle: Start Session, Save Answers (Persistence), and Submit. |
| **F10** | **Notifications** | ✅ Stable | Centralized Gmail-based notification system for email and in-app alerts. |
| **F11** | **Subscription & Billing** | ✅ Stable | Management of plans, usage limits, Paystack/Flutterwave webhooks, and prorated upgrades. |
| **F12** | **Audit Logging** | ✅ Stable | Platform-wide and Tenant-specific security logs tracking all significant user actions. |

---

## 🛠 Required Standards for New Submissions

All future feature submissions MUST adhere to these architectural standards to ensure compatibility with the existing core:

### 1. Naming Convention
Use strict `dot.notation.js` for all files.
*   ✅ `exam.controller.js`
*   ❌ `ExamController.js`

### 2. Module System
Use **CommonJS** only. The platform is not currently configured for ES Modules.
*   ✅ `const express = require('express');`
*   ❌ `import express from 'express';`

### 3. Middleware Chain (Security)
All protected routes must follow this exact sequence to guarantee tenant isolation:
1. `authMiddleware` (Identifies the user)
2. `tenantMiddleware` (Scopes the request to the correct organization)
3. `authorizeRoles` (Enforces permissions)

### 4. Database Schema
Every model (except Super Admin specific ones) MUST include a `tenantId` field:
```javascript
tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
}
```

---

## 🧪 Testing Credentials (Demo Seeder)
Run `npm run seed:demo` to populate your local DB with these test accounts:
*   **Super Admin**: `admin@cbtplatform.com` | `Admin123!`
*   **Tenant Admin**: `admin@lagos-grammar.com` | `Password123!`
*   **Student (Candidate)**: `FLEX-STUDENT-001` | Pin: `123456`
