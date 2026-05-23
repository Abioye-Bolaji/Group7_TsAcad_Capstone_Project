# Multitenant CBT Platform - Comprehensive API Testing Guide

This guide provides a structured, chronological step-by-step approach to testing the entire CBT platform using Postman. Follow this sequence to avoid dependency errors (e.g., trying to create an exam without questions, or starting a session without candidates).

> **Postman Setup:** 
> 1. In Postman, create an Environment variable named `token`.
> 2. After every Login step, copy the `token` from the response and update your `token` variable. 
> 3. Your `cbt_platform_postman_collection.json` is already configured to read this `{{token}}` variable for all protected routes!

---

## Phase 1: Platform Setup (Super Admin)

Before schools can use the platform, the Super Admin must exist and configure the system.

### 1. Register Super Admin (If not already seeded in DB)
- **Endpoint:** `POST /api/v1/auth/register`
- **Body:**
```json
{
  "name": "Super Admin",
  "email": "superadmin@cbtplatform.com",
  "password": "Password123",
  "role": "super_admin"
}
```

### 2. Login as Super Admin
- **Endpoint:** `POST /api/v1/auth/login`
- **Body:**
```json
{
  "email": "superadmin@cbtplatform.com",
  "password": "Password123"
}
```
**Important:** Copy the returned `token` and set it in your Postman Environment.

### 3. Create a Tenant (School/Organization)
- **Endpoint:** `POST /api/v1/tenants`
- **Body:**
```json
{
  "name": "Global Tech University",
  "email": "admin@globaltech.edu",
  "plan": "premium"
}
```
**Note:** Save the `_id` of the newly created tenant. This is your `tenantId`.

---

## Phase 2: School Setup (Tenant Admin)

Now we switch roles. The Tenant Admin (School) logs in to manage their candidates and questions.

### 4. Register Tenant Admin
- **Endpoint:** `POST /api/v1/auth/register`
- **Body:**
```json
{
  "name": "Global Tech Admin",
  "email": "admin@globaltech.edu",
  "password": "Password123",
  "role": "tenant_admin",
  "tenantId": "<INSERT_TENANT_ID_FROM_STEP_3>"
}
```

### 5. Login as Tenant Admin
- **Endpoint:** `POST /api/v1/auth/login`
- **Body:**
```json
{
  "email": "admin@globaltech.edu",
  "password": "Password123"
}
```
**Important:** Replace your Postman `token` variable with this new Tenant Admin token.

### 6. Subscribe Tenant to a Plan (Billing)
- **Endpoint:** `POST /api/v1/subscriptions/assign`
- **Body:**
```json
{
  "planId": "premium",
  "paymentProviderId": "paystack"
}
```

---

## Phase 3: Content Creation

The school creates candidates, groups, and the question bank.

### 7. Create Candidate Group
- **Endpoint:** `POST /api/v1/candidate-groups`
- **Body:**
```json
{
  "name": "Computer Science - Batch 2026",
  "description": "Final year students"
}
```
**Note:** Save the `_id` of the created group. This is your `groupId`.

### 8. Create Candidates
- **Endpoint:** `POST /api/v1/candidates`
- **Body:**
```json
{
  "name": "John Doe",
  "email": "johndoe@globaltech.edu",
  "groupId": "<INSERT_GROUP_ID_FROM_STEP_7>"
}
```
**Important:** The response will return a generated `idNumber` and a plain-text `accessPin`. Save these! The candidate needs them to log in later. Save the candidate's `_id` as well.

### 9. Create Questions (Question Bank)
- **Endpoint:** `POST /api/v1/questions`
- **Body:**
```json
{
  "type": "mcq",
  "question": "What does CPU stand for?",
  "options": ["Central Process Unit", "Computer Personal Unit", "Central Processing Unit", "Central Processor Unit"],
  "answer": "Central Processing Unit",
  "marks": 5,
  "category": "Computer Science"
}
```
**Note:** Create at least two questions. Save their `_id`s.

---

## Phase 4: Exam Setup

With candidates and questions ready, we can create the exam.

### 10. Create Exam
- **Endpoint:** `POST /api/v1/exams`
- **Body:**
```json
{
  "title": "Computer Science Finals",
  "subject": "CS101",
  "duration": 60,
  "passMark": 50,
  "questions": [
    "<INSERT_QUESTION_1_ID>",
    "<INSERT_QUESTION_2_ID>"
  ]
}
```
**Note:** Save the `_id` of the created exam. This is your `examId`.

### 11. Publish Exam Status
- **Endpoint:** `PATCH /api/v1/exams/<examId>/status`
- **Body:**
```json
{
  "status": "published"
}
```

---

## Phase 5: Candidate Exam Session

Switching roles again. The student sits for the exam.

### 12. Candidate Login
- **Endpoint:** `POST /api/v1/candidates/login`
- **Body:** (Use credentials generated in Step 8)
```json
{
  "idNumber": "STD-...",
  "accessPin": "123456"
}
```
**Important:** Replace your Postman `token` variable with this new Candidate token.

### 13. Start Exam Session
- **Endpoint:** `POST /api/v1/sessions/start`
- **Body:**
```json
{
  "examId": "<INSERT_EXAM_ID_FROM_STEP_10>"
}
```
**Note:** Save the `_id` of the created session. This is your `sessionId`.

### 14. Save Answer (During Exam)
- **Endpoint:** `POST /api/v1/sessions/save-answer`
- **Body:**
```json
{
  "sessionId": "<INSERT_SESSION_ID_FROM_STEP_13>",
  "questionId": "<INSERT_QUESTION_1_ID>",
  "answer": "Central Processing Unit"
}
```

### 15. Submit Exam
- **Endpoint:** `POST /api/v1/sessions/submit`
- **Body:**
```json
{
  "sessionId": "<INSERT_SESSION_ID_FROM_STEP_13>"
}
```

---

## Phase 6: Scoring & Results

The exam is autograded upon submission. If manual grading is needed (Essay/Short Answer), follow these steps.

### 16. Manual Grading (If Applicable)
- **Endpoint:** `PATCH /api/v1/scoring/results/<resultId>/manual`
- **Body:**
```json
{
  "questionId": "<QUESTION_ID>",
  "marksAwarded": 5,
  "feedback": "Well written!"
}
```

### 17. Release Result (Admin Action)
- **Endpoint:** `PATCH /api/v1/scoring/results/<resultId>/release`
- **Note:** Candidates can only view their results/certificates *after* this step is performed by an admin.

### 18. Get Candidate Result (Candidate View)
- **Endpoint:** `GET /api/v1/results/me`
- **No Body needed.** This confirms the candidate's score and passing status.

### 19. Download Certificate
- **Endpoint:** `GET /api/v1/results/<resultId>/certificate`
- **No Body needed.** This will stream the personalized PDF certificate with the candidate's name.

---

## Phase 7: Analytics & Audit

Finally, log back in as Tenant Admin to see reporting.

### 20. Login as Tenant Admin (Again)
- Execute **Step 5** again to get the Tenant Admin token.

### 21. Get Exam Analytics (Stats)
- **Endpoint:** `GET /api/v1/analytics/exams/<examId>/stats`
- **No Body needed.** Displays passing rate, highest/lowest scores.

### 22. View Audit Logs
- **Endpoint:** `GET /api/v1/audit`
- **No Body needed.** Displays all the actions (creations, logins, submissions, and status changes) that just occurred.

---

## Phase 8: Payment & Webhooks (Integration Testing)

### 23. Simulate Paystack Webhook
- **Endpoint:** `POST /api/v1/webhooks/paystack`
- **Headers:** `x-paystack-signature` (Must match HMAC-SHA512 of body)
- **Note:** The system checks for idempotency to prevent duplicate processing.

---
**Testing Complete!** Following this path ensures all interdependent relationships (Tenants -> Groups -> Candidates -> Questions -> Exams -> Sessions -> Results) are successfully created and verified.
