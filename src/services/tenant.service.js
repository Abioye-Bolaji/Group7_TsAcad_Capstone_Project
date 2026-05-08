const Tenant = require('../models/tenant.model');

/**
 * @desc Tenant Service — Business Logic Layer
 * All database interactions for the Tenant feature live here.
 * Controllers are thin — they only call these service functions.
 *
 * Author: kaluvictor130@gmail.com (Team Lead)
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a tenant name to a URL-safe slug.
 * e.g. "Lagos Grammar School" → "lagos-grammar-school"
 */
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')  // remove special chars
        .replace(/\s+/g, '-')           // spaces → hyphens
        .replace(/-+/g, '-');           // collapse multiple hyphens
};


// ─── 1. CREATE TENANT ─────────────────────────────────────────────────────────

/**
 * Creates a new tenant (organisation) on the platform.
 * Called by Super Admin only.
 * @param {Object} data - { name, email, phone, address, logoUrl, plan, settings }
 * @param {String} createdBy - Super Admin's user _id
 */
const createTenant = async (data, createdBy) => {
    const { name, email, phone, address, logoUrl, plan, settings } = data;

    // Auto-generate slug from name, ensure uniqueness
    let slug = generateSlug(name);
    const slugExists = await Tenant.findOne({ slug });
    if (slugExists) {
        // Append a random suffix if slug is taken
        slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Only include createdBy if it's a valid MongoDB ObjectId (24-char hex).
    // Guards against dev-mode fake IDs like 'dev-user-id'.
    const isValidObjectId = /^[a-f\d]{24}$/i.test(String(createdBy));

    const tenant = await Tenant.create({
        name,
        slug,
        email,
        phone:     phone     || null,
        address:   address   || null,
        logoUrl:   logoUrl   || null,
        plan:      plan      || 'free',
        settings:  settings  || {},
        createdBy: isValidObjectId ? createdBy : null,
        status:    'active',
    });

    return tenant;
};


// ─── 2. GET ALL TENANTS ───────────────────────────────────────────────────────

/**
 * Returns all tenants with optional filters.
 * Super Admin only.
 * @param {Object} filters - { status, plan, page, limit }
 */
const getAllTenants = async ({ status, plan, page = 1, limit = 20 }) => {
    const query = {};
    if (status) query.status = status;
    if (plan)   query.plan   = plan;

    const skip = (page - 1) * limit;

    const [tenants, total] = await Promise.all([
        Tenant.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean(),
        Tenant.countDocuments(query),
    ]);

    return {
        tenants,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / limit),
        },
    };
};


// ─── 3. GET SINGLE TENANT ─────────────────────────────────────────────────────

/**
 * Returns a single tenant by ID or slug.
 * @param {String} identifier - MongoDB _id or slug string
 */
const getTenantById = async (identifier) => {
    // Try by _id first, fall back to slug
    const isObjectId = /^[a-f\d]{24}$/i.test(identifier);
    const tenant = isObjectId
        ? await Tenant.findById(identifier).lean()
        : await Tenant.findOne({ slug: identifier }).lean();

    return tenant; // null if not found — controller handles the 404
};


// ─── 4. UPDATE TENANT ─────────────────────────────────────────────────────────

/**
 * Updates an existing tenant's details.
 * Super Admin can update any tenant.
 * Tenant Admin can update their own tenant (limited fields only).
 * @param {String} tenantId - MongoDB _id of tenant to update
 * @param {Object} updates  - Fields to update
 */
const updateTenant = async (tenantId, updates) => {
    // Strip protected fields — these are not updatable via this endpoint
    delete updates.slug;       // slug cannot be changed once set
    delete updates.createdBy;  // ownership cannot be transferred here
    delete updates.status;     // status changes go through dedicated endpoints

    const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { $set: updates },
        { new: true, runValidators: true } // return updated doc + run schema validation
    ).lean();

    return tenant; // null if not found
};


// ─── 5. SUSPEND TENANT ───────────────────────────────────────────────────────

/**
 * Suspends a tenant — blocks all their API access immediately.
 * The tenant middleware checks for 'suspended' status on every request.
 * Super Admin only.
 * @param {String} tenantId
 */
const suspendTenant = async (tenantId) => {
    const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { $set: { status: 'suspended' } },
        { new: true }
    ).lean();

    return tenant;
};


// ─── 6. REACTIVATE TENANT ────────────────────────────────────────────────────

/**
 * Reactivates a suspended or inactive tenant.
 * Super Admin only.
 * @param {String} tenantId
 */
const reactivateTenant = async (tenantId) => {
    const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { $set: { status: 'active' } },
        { new: true }
    ).lean();

    return tenant;
};


// ─── 7. DELETE TENANT ────────────────────────────────────────────────────────

/**
 * Hard-deletes a tenant from the database.
 * Use with extreme caution — this is irreversible.
 * Super Admin only. In production you'd soft-delete instead.
 * @param {String} tenantId
 */
const deleteTenant = async (tenantId) => {
    const result = await Tenant.findByIdAndDelete(tenantId);
    return result; // null if not found
};


// ─── 8. GET TENANT STATS ─────────────────────────────────────────────────────

/**
 * Returns platform-wide usage stats.
 * Used by Super Admin dashboard.
 */
const getTenantStats = async () => {
    const stats = await Tenant.aggregate([
        {
            $group: {
                _id: null,
                total:     { $sum: 1 },
                active:    { $sum: { $cond: [{ $eq: ['$status', 'active'] },    1, 0] } },
                suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
                inactive:  { $sum: { $cond: [{ $eq: ['$status', 'inactive'] },  1, 0] } },
                freePlan:  { $sum: { $cond: [{ $eq: ['$plan', 'free'] },  1, 0] } },
                basicPlan: { $sum: { $cond: [{ $eq: ['$plan', 'basic'] }, 1, 0] } },
                proPlan:   { $sum: { $cond: [{ $eq: ['$plan', 'pro'] },   1, 0] } },
            },
        },
        { $project: { _id: 0 } },
    ]);

    return stats[0] || {
        total: 0, active: 0, suspended: 0, inactive: 0,
        freePlan: 0, basicPlan: 0, proPlan: 0,
    };
};


// ─── 9. UPDATE TENANT SETTINGS ───────────────────────────────────────────────

/**
 * Updates the embedded settings object for a tenant.
 * Tenant Admin can call this for their own tenant.
 * @param {String} tenantId
 * @param {Object} settings - { allowedFeatures, maxCandidates, maxExams, customDomain }
 */
const updateTenantSettings = async (tenantId, settings) => {
    const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { $set: { settings } },
        { new: true, runValidators: true }
    ).lean();

    return tenant;
};


// ─── 10. UPGRADE TENANT PLAN ─────────────────────────────────────────────────

/**
 * Changes a tenant's subscription plan.
 * Typically triggered by the Billing feature (F11).
 * Can also be called by Super Admin manually.
 * @param {String} tenantId
 * @param {String} plan - 'free' | 'basic' | 'pro'
 */
const upgradeTenantPlan = async (tenantId, plan) => {
    const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { $set: { plan } },
        { new: true, runValidators: true }
    ).lean();

    return tenant;
};


module.exports = {
    createTenant,
    getAllTenants,
    getTenantById,
    updateTenant,
    suspendTenant,
    reactivateTenant,
    deleteTenant,
    getTenantStats,
    updateTenantSettings,
    upgradeTenantPlan,
};
