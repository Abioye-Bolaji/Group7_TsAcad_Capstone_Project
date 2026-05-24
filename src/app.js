require("dotenv").config();

if (process.env.NODE_ENV !== "production") {
  const dns = require("node:dns");
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

// ─── UTILITIES AND MIDDLEWARES ───────────────────────────────────────────────
const { sendSuccess, sendError } = require("./utils/response");
const tenantMiddleware = require("./middlewares/tenant.middleware");
const authMiddleware = require("./middlewares/auth.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes'); // F1
const tenantRoutes = require('./routes/tenant.routes');
const examRoutes = require('./routes/exam.routes'); // F4
const candidateRoutes  = require('./routes/candidate.routes');  // F5
const candidateGroupRoutes = require('./routes/candidate-group.routes');  // F5
const sessionRoutes = require('./routes/exam-session.routes');    // F6
const auditRoutes = require('./routes/audit-log.routes'); // F12
const questionBankRoutes = require('./routes/question-bank.routes'); // F3
const resultRoutes = require('./routes/result.routes'); // F8
const subscriptionRoutes = require('./routes/subscription.routes'); //F11
const billingRoutes = require('./routes/billing.routes'); //F11
const webhookRoutes = require('./routes/payment-webhook.routes'); // F11
const notifyRoutes = require('./routes/notification.routes'); // F10
const scoringRoutes = require('./routes/scoring.routes'); // F7
const analyticsRoutes = require('./routes/analytics.routes'); // F9

const app = express();

// swagger docs setup
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load swagger.yaml from project root
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));

// Serve docs at /docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true // keeps JWT after refresh
  }
}));


// ─── 1. GLOBAL MIDDLEWARES ────────────────────────────────────────────────────
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/v1/webhooks')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: false }));

// ─── 2. PUBLIC ROUTES ─────────────────────────────────────────────────────────
// These do not require a login or a tenant ID.
app.get("/health", (req, res) => {
  return sendSuccess(res, "Multitenancy CBT API is running smoothly", {
    version: "v1",
    timestamp: new Date().toISOString(),
  });
});

// ─── 3a. Auth Routes (Public — login/register don't need tenant scope) ─────────
app.use('/api/v1/auth', authRoutes);

//3b. Subscription Routes (Mixed: public plans + protected subscription)
app.use('/api/v1/subscriptions', subscriptionRoutes); // F11

//3c. Webhook Routes (No auth - signature-verified)
app.use('/api/v1/webhooks', webhookRoutes); // F11


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

// ─── 5. Protected API Routes ──────────────────────────────────────────────────
// Note: tenantMiddleware is now applied within individual route files 
// AFTER authMiddleware to ensure correct context.
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/candidates', candidateRoutes);  // F5
app.use('/api/v1/candidate-groups', candidateGroupRoutes);    // F5
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/billing', billingRoutes); // F11
app.use('/api/v1/audit', auditRoutes); // F12
app.use('/api/v1/questions', questionBankRoutes); // F3
app.use('/api/v1/results', resultRoutes); // F8
app.use('/api/v1/notifications', notifyRoutes); // F10
app.use('/api/v1/scoring', scoringRoutes); // F7
app.use('/api/v1/analytics', analyticsRoutes); // F9

// Future protected routes (add as teammates complete their features):

// ─── 6. 404 HANDLER ───────────────────────────────────────────────────────────
app.use((req, res) => {
  return sendError(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    404
  );
});

// ─── 7. Global Error Handler ──────────────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
