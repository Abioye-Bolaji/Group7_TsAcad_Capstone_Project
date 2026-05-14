require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const tenantMiddleware = require("./middlewares/tenant.middleware");
const { sendSuccess, sendError } = require("./utils/response");
const authRoutes = require('./routes/auth.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const billingRoutes = require('./routes/billing.routes');
const errorMiddleware = require('./middlewares/error.middleware');

// ─── Route Imports ────────────────────────────────────────────────────────────
const tenantRoutes = require('./routes/tenant.routes');
const examRoutes = require('./routes/exam.routes'); // F4
const candidateRoutes  = require('./routes/candidate.routes');  // F5
const candidateGroupRoutes = require('./routes/candidate-group.routes');  // F5
const sessionRoutes = require('./routes/exam-session.routes');    // F6
const auditRoutes = require('./routes/audit-log.routes'); // F12

// Future routes (added by teammates as they complete their features):
// const questionRoutes   = require('./routes/questionRoutes');   // F3
// const gradingRoutes    = require('./routes/gradingRoutes');    // F7
// const resultsRoutes    = require('./routes/resultsRoutes');    // F8
// const analyticsRoutes  = require('./routes/analyticsRoutes'); // F9
// const notifyRoutes     = require('./routes/notifyRoutes');     // F10
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
app.use('/api/v1/auth', authRoutes);

// ─── 3b. Subscription Routes (Mixed: public plans + protected subscription) ──
app.use('/api/v1/subscriptions', subscriptionRoutes); // F11

// ─── 4. DEV-MODE Auth Shim ────────────────────────────────────────────────────
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

// ─── 5. Tenant Isolation Middleware ───────────────────────────────────────────
// All routes BELOW this line are tenant-scoped.
app.use(tenantMiddleware);

// ─── 5. Protected API Routes ──────────────────────────────────────────────────
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/candidates', candidateRoutes);  // F5
app.use('/api/v1/candidate-groups', candidateGroupRoutes);    // F5
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/billing', billingRoutes); // F11
app.use('/api/v1/audit', auditRoutes); // F12

// ─── 6. 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  return sendError(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
  );
});

// ─── 7. Global Error Handler ──────────────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;