const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');

const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

/**
 * @desc Tenant Management Routes
 * Middleware Order: authMiddleware -> tenantMiddleware -> authorizeRoles
 */

// ─── Tenant Admin Routes ──────────────────────────────────────────────────────

router.get(
    '/me',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('super_admin', 'tenant_admin'),
    tenantController.getMyTenant
);

router.patch(
    '/me/settings',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('super_admin', 'tenant_admin'),
    tenantController.updateMyTenantSettings
);


// ─── Super Admin Routes (Bypasses tenant scoping in middleware) ───────────────

router.post(
    '/',
    authMiddleware,
    tenantMiddleware, // Will bypass because role is super_admin
    authorizeRoles('super_admin'),
    tenantController.createTenant
);

router.get(
    '/',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('super_admin'),
    tenantController.getAllTenants
);

router.get(
    '/stats',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('super_admin'),
    tenantController.getTenantStats
);

router.get(
    '/:identifier',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('super_admin'),
    tenantController.getTenantById
);

router.patch(
    '/:id',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('super_admin'),
    tenantController.updateTenant
);

router.patch(
    '/:id/suspend',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('super_admin'),
    tenantController.suspendTenant
);

router.patch(
    '/:id/reactivate',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('super_admin'),
    tenantController.reactivateTenant
);

router.patch(
    '/:id/plan',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('super_admin'),
    tenantController.upgradeTenantPlan
);

router.delete(
    '/:id',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('super_admin'),
    tenantController.deleteTenant
);

module.exports = router;
