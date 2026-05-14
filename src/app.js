require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

// ─── UTILITIES AND MIDDLEWARES ───────────────────────────────────────────────
const { sendSuccess, sendError } = require("./utils/response");
const tenantMiddleware = require("./middlewares/tenant.middleware");
const authMiddleware = require("./middlewares/auth.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

// ─── ROUTE IMPORTS ────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth.routes"); // F1
const tenantRoutes = require("./routes/tenant.routes"); // F2
const subscriptionRoutes = require("./routes/subscription.routes"); // F11
const billingRoutes = require("./routes/billing.routes"); // F11
const examRoutes = require("./routes/exam.routes"); // F4
const candidateRoutes = require("./routes/candidate.routes"); // F5
const candidateGroupRoutes = require("./routes/candidateGroup.routes"); //F5
const notifyRoutes     = require('./routes/notification.routes');         // F10


// NOTE TO TEAM: Import your feature routes here as you complete them:
// const questionRoutes   = require('./routes/question.routes');       // F3
// const sessionRoutes    = require('./routes/session.routes');        // F6
// const gradingRoutes    = require('./routes/grading.routes');        // F7
// const resultsRoutes    = require('./routes/results.routes');        // F8
// const analyticsRoutes  = require('./routes/analytics.routes');      // F9
// const auditRoutes      = require('./routes/audit.routes');          // F12
// const searchRoutes     = require('./routes/search.routes');         // F14

const app = express();

// ─── 1. GLOBAL MIDDLEWARES ────────────────────────────────────────────────────
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── 2. PUBLIC ROUTES ─────────────────────────────────────────────────────────
// These do not require a login or a tenant ID.
app.get("/health", (req, res) => {
  return sendSuccess(res, "Multitenancy CBT API is running smoothly", {
    version: "v1",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes (Login/Register) must stay public.
app.use("/api/v1/auth", authRoutes);

// ─── 3. DEV-MODE AUTH SHIM ────────────────────────────────────────────────────
// This allows the team to test routes in Postman without a real JWT.
// Usage: Add 'X-Dev-Role' and 'X-Dev-Tenant-Id' to your Postman headers.
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const devRole = req.headers["x-dev-role"];
    const devTenantId = req.headers["x-dev-tenant-id"];
    if (devRole) {
      req.user = {
        _id: "dev-user-id",
        role: devRole,
        tenantId: devTenantId || null,
      };
    }
    next();
  });
}

// ─── 4. THE PROTECTED ZONE (ORDER IS CRITICAL) ────────────────────────────────
// All routes below this point are locked. 
// 1. We check WHO you are (authMiddleware).
// 2. We check WHICH school you belong to (tenantMiddleware).
app.use(authMiddleware);
app.use(tenantMiddleware);

// ─── 5. PROTECTED API ROUTES ──────────────────────────────────────────────────
// Every controller here has access to req.user and req.tenantId.

// F2: Tenant Management
app.use("/api/v1/tenants", tenantRoutes);

// F5: Candidate Management
app.use("/api/v1/candidates", candidateRoutes);
app.use("/api/v1/candidate-groups", candidateGroupRoutes);

// F4: Exam & Assessment Setup
app.use("/api/v1/exams", examRoutes);

// F11: Subscription & Billing
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/billing", billingRoutes);

// F10: Notifications & Messaging
app.use("/api/v1/notifications", notifyRoutes);

// NOTE TO TEAM: Uncomment your route below when your feature is ready:
// app.use('/api/v1/questions',     questionRoutes);    // F3
// app.use('/api/v1/sessions',      sessionRoutes);     // F6
// app.use('/api/v1/scores',        gradingRoutes);     // F7
// app.use('/api/v1/results',       resultsRoutes);     // F8
// app.use('/api/v1/analytics',     analyticsRoutes);   // F9
// app.use('/api/v1/audit',         auditRoutes);       // F12
// app.use('/api/v1/search',        searchRoutes);      // F14

// ─── 6. 404 HANDLER ───────────────────────────────────────────────────────────
app.use((req, res) => {
  return sendError(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    404
  );
});

// ─── 7. GLOBAL ERROR HANDLER ──────────────────────────────────────────────────
// This catches any errors thrown in your services or controllers.
app.use(errorMiddleware);

module.exports = app;