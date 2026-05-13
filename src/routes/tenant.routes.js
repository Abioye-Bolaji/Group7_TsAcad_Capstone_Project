const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');

const authMiddleware = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
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
    authMiddleware,
    authorizeRoles('super_admin', 'tenant_admin'),
    tenantController.getMyTenant
);

/**
 * PATCH /api/v1/tenants/me/settings
 * Lets a Tenant Admin update their own organisation's settings.
 * (logo, allowed features, exam limits, custom domain, etc.)
 */
router.patch(
    '/me/settings',
    authMiddleware,
    authorizeRoles('super_admin', 'tenant_admin'),
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
    authMiddleware,
    authorizeRoles('super_admin'),
    tenantController.createTenant
);

/**
 * GET /api/v1/tenants
 * List all tenants. Supports query params: ?status=active&plan=pro&page=1&limit=20
 */
router.get(
    '/',
    authMiddleware,
    authorizeRoles('super_admin'),
    tenantController.getAllTenants
);

/**
 * GET /api/v1/tenants/stats
 * Get platform-wide usage stats (total tenants, by status, by plan).
 */
router.get(
    '/stats',
    authMiddleware,
    authorizeRoles('super_admin'),
    tenantController.getTenantStats
);

/**
 * GET /api/v1/tenants/:identifier
 * Get a single tenant by MongoDB _id or by slug.
 * e.g. GET /api/v1/tenants/6640abc123  OR  GET /api/v1/tenants/lagos-grammar-school
 */
router.get(
    '/:identifier',
    authMiddleware,
    authorizeRoles('super_admin'),
    tenantController.getTenantById
);

/**
 * PATCH /api/v1/tenants/:id
 * Update a tenant's profile (name, email, phone, logo, plan).
 */
router.patch(
    '/:id',
    authMiddleware,
    authorizeRoles('super_admin'),
    tenantController.updateTenant
);

/**
 * PATCH /api/v1/tenants/:id/suspend
 * Suspend a tenant — immediately blocks their API access.
 * The tenant middleware enforces this on every request.
 */
router.patch(
    '/:id/suspend',
    authMiddleware,
    authorizeRoles('super_admin'),
    tenantController.suspendTenant
);

/**
 * PATCH /api/v1/tenants/:id/reactivate
 * Restore a suspended or inactive tenant to active status.
 */
router.patch(
    '/:id/reactivate',
    authMiddleware,
    authorizeRoles('super_admin'),
    tenantController.reactivateTenant
);

/**
 * PATCH /api/v1/tenants/:id/plan
 * Upgrade or downgrade a tenant's subscription plan.
 * Body: { "plan": "pro" }
 */
router.patch(
    '/:id/plan',
    authMiddleware,
    authorizeRoles('super_admin'),
    tenantController.upgradeTenantPlan
);

/**
 * DELETE /api/v1/tenants/:id
 * Permanently delete a tenant. Irreversible — use with caution.
 */
router.delete(
    '/:id',
    authMiddleware,
    authorizeRoles('super_admin'),
    tenantController.deleteTenant
);


module.exports = router;
