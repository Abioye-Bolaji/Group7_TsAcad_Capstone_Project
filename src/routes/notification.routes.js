const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

/**
 * All notification routes require the user to be logged in (authMiddleware)
 * and their organization to be verified (tenantMiddleware).
 */
router.use(authMiddleware, tenantMiddleware);

/**
 * GET /api/v1/notifications/me
 * Allows any logged-in user to see their own notifications.
 */
router.get('/me', notificationController.getMyNotifications);

/**
 * PATCH /api/v1/notifications/:id/read
 * Allows a user to mark one of their notifications as read.
 */
router.patch('/:id/read', notificationController.markRead);


/**
 * POST /api/v1/notifications
 * Restricted: Only admins or examiners can send manual notifications.
 */
router.post(
    '/', 
    authorizeRoles('super_admin', 'tenant_admin', 'examiner'), 
    notificationController.createManualNotification
);

/**
 * POST /api/v1/notifications/bulk
 * Restricted: Only admins or examiners can send bulk notifications.
 */
router.post(
    '/bulk',
    authorizeRoles('super_admin', 'tenant_admin', 'examiner'),
    notificationController.createBatchNotification
);

/**
 * POST /api/v1/notifications/preferences
 * Candidates to manage their own alert choices.
 */
router.patch('/preferences', notificationController.updateMyPreferences);

module.exports = router;