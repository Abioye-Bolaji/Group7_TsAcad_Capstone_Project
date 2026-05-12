require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const tenantMiddleware = require('./middlewares/tenant.middleware');
const { sendSuccess, sendError } = require('./utils/response');
const authRoutes = require('./routes/authRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');

// ─── Route Imports ────────────────────────────────────────────────────────────
const tenantRoutes = require("./routes/tenant.routes");
// Future routes (added by teammates as they complete their features):
// const authRoutes       = require('./routes/authRoutes');       // F1
// const questionRoutes   = require('./routes/questionRoutes');   // F3
const examRoutes = require("./routes/examRoutes"); // F4
// const candidateRoutes  = require('./routes/candidateRoutes');  // F5
// const sessionRoutes    = require('./routes/sessionRoutes');    // F6
// const gradingRoutes    = require('./routes/gradingRoutes');    // F7
// const resultsRoutes    = require('./routes/resultsRoutes');    // F8
// const analyticsRoutes  = require('./routes/analyticsRoutes'); // F9
// const notifyRoutes     = require('./routes/notifyRoutes');     // F10
// const billingRoutes    = require('./routes/billingRoutes');    // F11
// const auditRoutes      = require('./routes/auditRoutes');      // F12
// const searchRoutes     = require('./routes/searchRoutes');     // F14

const app = express();

// ─── 1. Global Middlewares ────────────────────────────────────────────────────
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── 2. Public Routes (No auth required) ─────────────────────────────────────
app.get("/health", (req, res) => {
  return sendSuccess(res, "Multitenancy CBT API is running smoothly 🚀", {
    version: "v1",
    timestamp: new Date().toISOString(),
  });
});

// ─── 3a. Auth Routes (Public — login/register don't need tenant scope) ─────────
// Uncomment when F1 (aniwinner00@gmail.com) publishes their routes:

app.use("/api/v1/auth", authRoutes);

// ─── 3b. Subscription Routes (Mixed: public plans + protected subscription) ──
// Public /plans endpoints don't need auth
// Protected endpoints explicitly use tenantMiddleware
app.use('/api/v1/subscriptions', subscriptionRoutes);   //F11

// ─── 4. DEV-MODE Auth Shim ────────────────────────────────────────────────────
// ⚠️  TEMPORARY — Remove this entire block when F1 delivers their auth middleware.
// This simulates a decoded JWT by reading a request header, so we can test
// all protected routes locally without a real login flow.
//
// HOW TO USE IN TESTING (Postman / curl):
//   To act as Super Admin:  add header  X-Dev-Role: super_admin
//   To act as Tenant Admin: add headers X-Dev-Role: tenant_admin
//                                       X-Dev-Tenant-Id: <a real tenant _id from DB>
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const devRole = req.headers["x-dev-role"];
    const devTenantId = req.headers["x-dev-tenant-id"];
    if (devRole) {
      req.user = {
        _id: "dev-user-id",
        role: devRole, // e.g. 'super_admin'
        tenantId: devTenantId || null, // required for tenant_admin
      };
    }
    next();
  });
}

// ─── 5. Tenant Isolation Middleware ───────────────────────────────────────────
// All routes BELOW this line are tenant-scoped.
// req.tenantId and req.tenant are available to every controller from here down.
app.use(tenantMiddleware);

// ─── 5. Protected API Routes ──────────────────────────────────────────────────
app.use("/api/v1/tenants", tenantRoutes);

// Teammates: uncomment your routes below as you complete your features:
// app.use('/api/v1/questions',    questionRoutes);
app.use("/api/v1/exams", examRoutes);
// app.use('/api/v1/candidates',   candidateRoutes);
// app.use('/api/v1/sessions',     sessionRoutes);
// app.use('/api/v1/scores',       gradingRoutes);
// app.use('/api/v1/results',      resultsRoutes);
// app.use('/api/v1/analytics',    analyticsRoutes);
// app.use('/api/v1/notifications',notifyRoutes);
// app.use('/api/v1/billing',      billingRoutes);
// app.use('/api/v1/audit',        auditRoutes);
// app.use('/api/v1/search',       searchRoutes);

// ─── 6. 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  return sendError(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
  );
});

// ─── 7. Global Error Handler ──────────────────────────────────────────────────
// Catches any unhandled errors thrown by async route handlers
app.use(errorMiddleware);

module.exports = app;
