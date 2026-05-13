const express = require('express');
const billingController = require('../controllers/billing.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');

const router = express.Router();

/**
 * @desc Billing Routes
 * Tenant endpoints scoped by tenantId
 * Admin endpoints for super_admin role
 */

//TENANT BILLING ROUTES

/**
 * GET /billing/history
 * Get tenant's billing history with pagination and filters
 * Auth required, scoped to tenantId
 * Query: status, limit, skip, startDate, endDate
 */
router.get(
    '/history',
    authMiddleware,
    tenantMiddleware,
    billingController.getBillingHistory
);

/**
 * GET /billing/invoices/:invoiceId
 * Get specific invoice
 * Auth required, scoped to tenantId
 */
router.get(
    '/invoices/:invoiceId',
    authMiddleware,
    tenantMiddleware,
    billingController.getInvoice
);

/**
 * GET /billing/usage
 * Get current usage tracking
 * Auth required, scoped to tenantId
 */
router.get(
    '/usage',
    authMiddleware,
    tenantMiddleware,
    billingController.getUsageTracking
);

/**
 * GET /billing/summary
 * Get billing summary (subscription + invoices + usage)
 * Auth required, scoped to tenantId
 */
router.get(
    '/summary',
    authMiddleware,
    tenantMiddleware,
    billingController.getBillingSummary
);

/**
 * GET /billing/usage-limits
 * Check if tenant has exceeded usage limits
 * Auth required, scoped to tenantId
 */
router.get(
    '/usage-limits',
    authMiddleware,
    tenantMiddleware,
    billingController.checkUsageLimits
);

//SUPER ADMIN BILLING ROUTES

/**
 * GET /billing/admin/dashboard
 * Get payment dashboard across all tenants
 * Super Admin only
 * Query: status, limit, skip, startDate, endDate
 */
router.get(
    '/admin/dashboard',
    authMiddleware,
    billingController.getPaymentDashboard
);

/**
 * POST /billing/admin/send-reminders
 * Trigger sending payment reminders
 * Super Admin only
 */
router.post(
    '/admin/send-reminders',
    authMiddleware,
    billingController.sendPaymentReminders
);

/**
 * POST /billing/admin/process-renewals
 * Trigger subscription renewal processing
 * Super Admin only
 */
router.post(
    '/admin/process-renewals',
    authMiddleware,
    billingController.processRenewals
);

/**
 * POST /billing/admin/update-usage
 * Manually update tenant usage
 * Super Admin only
 * Body: { tenantId, activeCandidates?, storageGB? }
 */
router.post(
    '/admin/update-usage',
    authMiddleware,
    billingController.updateTenantUsage
);

/**
 * GET /billing/admin/all-invoices
 * Get all invoices across tenants
 * Super Admin only
 * Query: status, limit, skip, tenantId
 */
router.get(
    '/admin/all-invoices',
    authMiddleware,
    billingController.getAllInvoices
);

module.exports = router;
