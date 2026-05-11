const express = require('express');
const router = express.Router();

const {
    getAuditLogs,
    getAuditLogById,
    getSecurityDashboard,
} = require('../controller/auditLogController');

router.get('/security', getSecurityDashboard);
router.get('/', getAuditLogs);
router.get('/:id', getAuditLogById);


module.exports = router;