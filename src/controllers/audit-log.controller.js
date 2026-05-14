const auditLogService = require('../services/audit-log.service');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @desc Audit Log Controller
 * Handles HTTP layer for audit logs
 * Standards: CommonJS, next(err), standard response utils
 */

const getAuditLogs = async (req, res, next) => {
    try {
        const { logs, pagination } = await auditLogService.getAllLogs({
            user: req.user,
            tenantId: req.tenantId,
            query: req.query,
        });

        return sendSuccess(res, 'Audit logs fetched', logs, 200, pagination);
    } catch (err) {
        next(err);
    }
};

const getAuditLogById = async (req, res, next) => {
    try {
        const log = await auditLogService.getLogById({
            user: req.user,
            tenantId: req.tenantId,
            id: req.params.id,
        });

        if (!log) {
            return sendError(res, 'Audit log not found', 404);
        }

        return sendSuccess(res, 'Audit log fetched', log);
    } catch (err) {
        next(err);
    }
};

const getSecurityDashboard = async (req, res, next) => {
    try {
        const data = await auditLogService.getSecurityData({
            user: req.user,
            tenantId: req.tenantId,
        });

        return sendSuccess(res, 'Security dashboard fetched', data);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAuditLogs,
    getAuditLogById,
    getSecurityDashboard,
};