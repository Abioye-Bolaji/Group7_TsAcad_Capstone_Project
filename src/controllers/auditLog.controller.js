const AuditLog = require('../services/auditLog.service');

const sendSuccess = (res, message, data, statusCode = 200, pagination = null) => {
    const body = { success: true, message, data };
    if (pagination) body.pagination = pagination;
    return res.status(statusCode).json(body);
};

const sendError = (res, message, statusCode = 500) => {
    res.status(statusCode).json({ success: false, message });

const getAuditLogs = async (req, res) => {
    try {
        const { logs, pagination } = await auditLogService.getAllLogs({
            user: req.user,
            tenantId: req.tenantId,
            query: req.query,
        });

        return sendSuccess(res, 'Audit logs fetched', logs, 200, pagination);

    } catch (err) {
        console.error('getAuditLogs:', err);
        return sendError(res, 'Failed to fetch audit logs');
    }
};
};

const getAuditLogById = async (req, res) => {
  try {
    const log = await auditLogService.getLogById({
        user: req.user,
        tenantId: req.tenantId,
        id: req.params.id,
    });

    if (!log) return sendError(res, 'Auit log not found', 404);

    return sendSuccess(res, 'Audit log fetched', log);
  } catch (err) {
    console.error('getAuditLogById:', err);
    return sendError(res, 'Failed to fetch audit log');
  }

};

const getSecurityDashboard = async (req, res) => {
    try {
        const data = await auditLogService.getSecurityData({
            user: req.user,
            tenantId: req.tenantId,
        });

        return sendSuccess(res, 'Security dashboard fetched', data);
    } catch (err) {
        console.error('getSecurityDashboard:', err);
        return sendError(res, 'Failed to fetch security dashboard');
    }
};

module.exports = { getAuditLogs, getAuditLogById, getSecurityDashboard };