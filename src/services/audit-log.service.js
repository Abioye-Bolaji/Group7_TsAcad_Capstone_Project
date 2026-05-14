const AuditLog = require('../models/audit-log.model');

/**
 * @desc Audit Log Service
 * Standards: CommonJS, Tenant isolation
 */

const buildBaseQuery = (user, tenantId) =>
    user.role === 'super_admin'
        ? {}
        : { tenantId };

const createLog = async (data) => {
    return await AuditLog.create(data);
};

const getAllLogs = async ({ user, tenantId, query: q }) => {
    const {
        page = 1,
        limit = 20,
        action,
        resource,
        userId,
        startDate,
        endDate,
    } = q;

    const query = buildBaseQuery(user, tenantId);

    if (action) query.action = action.toUpperCase();
    if (resource) query.resource = resource.toLowerCase();
    if (userId) query.userId = userId;

    if (startDate || endDate) {
        query.createdAt = {}; // Fixed typo createAt -> createdAt
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const pageNum = Number(page);
    const limitNum = Number(limit); // Fixed typo limiNum -> limitNum
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
        AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        AuditLog.countDocuments(query),
    ]);

    return {
        logs,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum),
        },
    };
};

const getLogById = async ({ user, tenantId, id }) => {
    const query = buildBaseQuery(user, tenantId);
    query._id = id;

    const log = await AuditLog.findOne(query).lean();
    return log;
};

const getSecurityData = async ({ user, tenantId }) => {
    const base = buildBaseQuery(user, tenantId);
    const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const m10 = new Date(Date.now() - 10 * 60 * 1000);

    const recentActivity = await AuditLog
        .find({ ...base, createdAt: { $gte: h24 } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    const recentFailedLogins = await AuditLog
        .find({ ...base, action: 'FAILED_LOGIN', createdAt: { $gte: m10 } })
        .lean();

    const ipCounts = {};
    recentFailedLogins.forEach(({ ipAddress }) => {
        if (!ipAddress) return;
        ipCounts[ipAddress] = (ipCounts[ipAddress] || 0) + 1;
    });

    const flaggedIps = Object.entries(ipCounts)
        .filter(([, count]) => count >= 5)
        .map(([ip, failedAttempts]) => ({ ip, failedAttempts }));

    return {
        recentActivity,
        totalRecentActions: recentActivity.length,
        failedLoginAttempts: recentFailedLogins.length,
        flaggedIps,
    };
};

module.exports = {
    createLog,
    getAllLogs,
    getLogById,
    getSecurityData,
};