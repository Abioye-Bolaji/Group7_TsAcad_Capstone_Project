const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');

/**
 * @desc Tenant Management Routes
 * Branch: feat/tenant-management
 * Author: kaluvictor130@gmail.com (Team Lead)
 *
 * NOTE ON AUTH GUARDS:
 * The auth middleware (F1 - aniwinner00@gmail.com) will provide:
 *   - requireAuth        → checks valid JWT token
 *   - requireRole(roles) → checks user role
 *
 * These are imported here as placeholders so routes are ready the moment
 * F1 publishes their middleware. Swap the placeholder with the real import.
 *
 * PLACEHOLDER — replace with real auth when F1 is ready:
 *   const { requireAuth, requireRole } = require('../middlewares/auth');
 */

// ─── Placeholder Auth Guards (remove when F1 publishes auth middleware) ────────
const requireAuth = (req, res, next) => {
    // TEMP: Simulates an authenticated super_admin user for development/testing
    // Replace entirely with: const { requireAuth } = require('../middlewares/auth');
    if (!req.user) {
        req.user = {
            _id: 'temp-super-admin-id',
            role: 'super_admin',
            tenantId: null,
        };
    }
    next();
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. Required role(s): ${roles.join(', ')}`,
        });
    }
    next();
};
// ──────────────────────────────────────────────────────────────────────────────


// ═════════════════════════════════════════════════════════════════════════════
//  TENANT ADMIN ROUTES (scoped to their own tenant via middleware)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/tenants/me
 * Returns the currently logged-in Tenant Admin's own organisation profile.
 * Used by the Tenant Admin dashboard to show their own info.
 */
router.get(
    '/me',
    requireAuth,
    requireRole('tenant_admin', 'super_admin'),
    tenantController.getMyTenant
);

/**
 * PATCH /api/v1/tenants/me/settings
 * Lets a Tenant Admin update their own organisation's settings.
 * (logo, allowed features, exam limits, custom domain, etc.)
 */
router.patch(
    '/me/settings',
    requireAuth,
    requireRole('tenant_admin', 'super_admin'),
    tenantController.updateMyTenantSettings
);


// ═════════════════════════════════════════════════════════════════════════════
//  SUPER ADMIN ROUTES (platform-wide management)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/tenants
 * Create (onboard) a new tenant/organisation on the platform.
 */
router.post(
    '/',
    requireAuth,
    requireRole('super_admin'),
    tenantController.createTenant
);

/**
 * GET /api/v1/tenants
 * List all tenants. Supports query params: ?status=active&plan=pro&page=1&limit=20
 */
router.get(
    '/',
    requireAuth,
    requireRole('super_admin'),
    tenantController.getAllTenants
);

/**
 * GET /api/v1/tenants/stats
 * Get platform-wide usage stats (total tenants, by status, by plan).
 */
router.get(
    '/stats',
    requireAuth,
    requireRole('super_admin'),
    tenantController.getTenantStats
);

/**
 * GET /api/v1/tenants/:identifier
 * Get a single tenant by MongoDB _id or by slug.
 * e.g. GET /api/v1/tenants/6640abc123  OR  GET /api/v1/tenants/lagos-grammar-school
 */
router.get(
    '/:identifier',
    requireAuth,
    requireRole('super_admin'),
    tenantController.getTenantById
);

/**
 * PATCH /api/v1/tenants/:id
 * Update a tenant's profile (name, email, phone, logo, plan).
 */
router.patch(
    '/:id',
    requireAuth,
    requireRole('super_admin'),
    tenantController.updateTenant
);

/**
 * PATCH /api/v1/tenants/:id/suspend
 * Suspend a tenant — immediately blocks their API access.
 * The tenant middleware enforces this on every request.
 */
router.patch(
    '/:id/suspend',
    requireAuth,
    requireRole('super_admin'),
    tenantController.suspendTenant
);

/**
 * PATCH /api/v1/tenants/:id/reactivate
 * Restore a suspended or inactive tenant to active status.
 */
router.patch(
    '/:id/reactivate',
    requireAuth,
    requireRole('super_admin'),
    tenantController.reactivateTenant
);

/**
 * PATCH /api/v1/tenants/:id/plan
 * Upgrade or downgrade a tenant's subscription plan.
 * Body: { "plan": "pro" }
 */
router.patch(
    '/:id/plan',
    requireAuth,
    requireRole('super_admin'),
    tenantController.upgradeTenantPlan
);

/**
 * DELETE /api/v1/tenants/:id
 * Permanently delete a tenant. Irreversible — use with caution.
 */
router.delete(
    '/:id',
    requireAuth,
    requireRole('super_admin'),
    tenantController.deleteTenant
);


module.exports = router;
