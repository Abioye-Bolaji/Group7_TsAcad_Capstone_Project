const express = require('express');
const router = express.Router();

const {
    getAuditLogs,
    getAuditLogById,
    getSecurityDashboard,
} = require('../controllers/audit-log.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');

/**
 * @desc Audit Log Routes
 */

router.get('/security', authMiddleware, tenantMiddleware, getSecurityDashboard);
router.get('/', authMiddleware, tenantMiddleware, getAuditLogs);
router.get('/:id', authMiddleware, tenantMiddleware, getAuditLogById);

module.exports = router;