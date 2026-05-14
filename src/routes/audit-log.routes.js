const express = require('express');
const router = express.Router();

const {
    getAuditLogs,
    getAuditLogById,
    getSecurityDashboard,
} = require('../controllers/audit-log.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @desc Audit Log Routes
 * Scoped by tenantId via tenantMiddleware in app.js
 */

router.get('/security', authMiddleware, getSecurityDashboard);
router.get('/', authMiddleware, getAuditLogs);
router.get('/:id', authMiddleware, getAuditLogById);

module.exports = router;