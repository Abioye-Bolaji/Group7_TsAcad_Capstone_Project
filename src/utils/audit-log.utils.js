const AuditLog = require('../models/audit-log.model');

/**
 * @desc Global Utility to create audit logs
 * Standardized for use in controllers/services
 */
const auditLog = async (req, action, resource, details = {}) => {
    try {
        const {
            resourceId = null,
            metadata = null,
            oldValues = null,
            newValues = null,
            status = 'SUCCESS',
            statusCode = null,
            severity = 'LOW',
            description = '',
        } = details;

        const userId = req.user?._id || req.user?.id;
        const userEmail = req.user?.email || 'unknown';
        const userRole = req.user?.role || 'unknown';
        const tenantId = req.tenantId || null;

        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const userAgent = req.headers['user-agent'] || null;
        const method = req.method || null;
        const endpoint = req.originalUrl || null;

        await AuditLog.create({
            userId,
            userEmail,
            userRole,
            tenantId,
            action: action.toUpperCase(),
            resource: resource.toLowerCase(),
            resourceId: resourceId ? String(resourceId) : 'N/A',
            status,
            statusCode,
            description: description || `${action} performed on ${resource}`,
            ipAddress,
            userAgent,
            method,
            endpoint,
            metadata,
            oldValues,
            newValues,
            severity,
        });
    } catch (err) {
        // We log the failure but don't crash the main request flow
        console.error('Audit Log Utility Error:', err.message);
    }
};

module.exports = { auditLog };