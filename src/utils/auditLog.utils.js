const auditLog = async (req, action, resource, resourceId = null, metadata = null, oldValues = null, newValues = null) => {
    try{
        const userId = req.user?._id || req.user?.id;
        const userEmail = req.user?.email || 'unknown';
        const userRole = req.user?.role || 'unknown';

        const tenantId = req.tenantId || null;

        const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
        const userAgent = req.headers['user-agent'] || null;
        const method = req.method || null;
        const endpoint = req.originalUrl || null;


        await auditLog.create({
            userId,
            userEmail,
            userRole,
            tenantId,
            action,
            resource,
            reourceId : resourceId ? String(resourceId) : null,
            status,
            statusCode,
            description,
            ipAddress,
            userAgent,
            flagged,
            severity,
            method,
            endpoint,
            metada,
            OldValues,
            newValues,
        });
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
};

module.exports = { auditLog };