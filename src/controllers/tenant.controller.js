const tenantService = require('../services/tenant.service');
const { sendSuccess, sendError } = require('../utils/response');
const {
    validateBody,
    createTenantSchema,
    updateTenantSchema,
    updateSettingsSchema,
    upgradePlanSchema,
} = require('../utils/tenant.validation');

/**
 * @desc Tenant Controller — HTTP layer only
 * Thin controllers: validate input → call service → send response.
 * Zero business logic or DB calls here.
 *
 * Author: kaluvictor130@gmail.com (Team Lead)
 */


// ─── SUPER ADMIN CONTROLLERS ─────────────────────────────────────────────────


/**
 * @route  POST /api/v1/tenants
 * @access Super Admin only
 * @desc   Create a new tenant (onboard a new organisation)
 */
const createTenant = async (req, res, next) => {
    try {
        const errors = validateBody(createTenantSchema, req.body);
        if (errors) return sendError(res, 'Validation failed', 400, errors);

        const tenant = await tenantService.createTenant(req.body, req.user?._id);

        return sendSuccess(res, 'Tenant created successfully', tenant, 201);
    } catch (error) {
        if (error.code === 11000) {
            // MongoDB duplicate key — email or slug conflict
            const field = Object.keys(error.keyPattern)[0];
            return sendError(res, `A tenant with this ${field} already exists.`, 409);
        }
        next(error);
    }
};


/**
 * @route  GET /api/v1/tenants
 * @access Super Admin only
 * @desc   List all tenants with optional filters (status, plan) and pagination
 */
const getAllTenants = async (req, res, next) => {
    try {
        const { status, plan, page, limit } = req.query;
        const result = await tenantService.getAllTenants({ status, plan, page, limit });

        return sendSuccess(
            res,
            'Tenants fetched successfully',
            result.tenants,
            200,
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};


/**
 * @route  GET /api/v1/tenants/stats
 * @access Super Admin only
 * @desc   Platform-wide tenant usage statistics
 */
const getTenantStats = async (req, res, next) => {
    try {
        const stats = await tenantService.getTenantStats();
        return sendSuccess(res, 'Tenant statistics fetched successfully', stats);
    } catch (error) {
        next(error);
    }
};


/**
 * @route  GET /api/v1/tenants/:identifier
 * @access Super Admin only
 * @desc   Get a single tenant by MongoDB _id OR slug
 */
const getTenantById = async (req, res, next) => {
    try {
        const tenant = await tenantService.getTenantById(req.params.identifier);
        if (!tenant) return sendError(res, 'Tenant not found', 404);

        return sendSuccess(res, 'Tenant fetched successfully', tenant);
    } catch (error) {
        next(error);
    }
};


/**
 * @route  PATCH /api/v1/tenants/:id
 * @access Super Admin only
 * @desc   Update a tenant's profile information
 */
const updateTenant = async (req, res, next) => {
    try {
        const errors = validateBody(updateTenantSchema, req.body);
        if (errors) return sendError(res, 'Validation failed', 400, errors);

        const tenant = await tenantService.updateTenant(req.params.id, req.body);
        if (!tenant) return sendError(res, 'Tenant not found', 404);

        return sendSuccess(res, 'Tenant updated successfully', tenant);
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return sendError(res, `A tenant with this ${field} already exists.`, 409);
        }
        next(error);
    }
};


/**
 * @route  PATCH /api/v1/tenants/:id/suspend
 * @access Super Admin only
 * @desc   Suspend a tenant — immediately blocks their API access
 */
const suspendTenant = async (req, res, next) => {
    try {
        const tenant = await tenantService.suspendTenant(req.params.id);
        if (!tenant) return sendError(res, 'Tenant not found', 404);

        return sendSuccess(res, `Tenant "${tenant.name}" has been suspended.`, tenant);
    } catch (error) {
        next(error);
    }
};


/**
 * @route  PATCH /api/v1/tenants/:id/reactivate
 * @access Super Admin only
 * @desc   Reactivate a suspended or inactive tenant
 */
const reactivateTenant = async (req, res, next) => {
    try {
        const tenant = await tenantService.reactivateTenant(req.params.id);
        if (!tenant) return sendError(res, 'Tenant not found', 404);

        return sendSuccess(res, `Tenant "${tenant.name}" has been reactivated.`, tenant);
    } catch (error) {
        next(error);
    }
};


/**
 * @route  DELETE /api/v1/tenants/:id
 * @access Super Admin only
 * @desc   Permanently delete a tenant (irreversible)
 */
const deleteTenant = async (req, res, next) => {
    try {
        const result = await tenantService.deleteTenant(req.params.id);
        if (!result) return sendError(res, 'Tenant not found', 404);

        return sendSuccess(res, 'Tenant permanently deleted.', null, 200);
    } catch (error) {
        next(error);
    }
};


/**
 * @route  PATCH /api/v1/tenants/:id/plan
 * @access Super Admin only
 * @desc   Upgrade or downgrade a tenant's subscription plan
 */
const upgradeTenantPlan = async (req, res, next) => {
    try {
        const errors = validateBody(upgradePlanSchema, req.body);
        if (errors) return sendError(res, 'Validation failed', 400, errors);

        const tenant = await tenantService.upgradeTenantPlan(req.params.id, req.body.plan);
        if (!tenant) return sendError(res, 'Tenant not found', 404);

        return sendSuccess(res, `Tenant plan updated to "${req.body.plan}".`, tenant);
    } catch (error) {
        next(error);
    }
};


// ─── TENANT ADMIN CONTROLLERS ────────────────────────────────────────────────


/**
 * @route  GET /api/v1/tenants/me
 * @access Tenant Admin (their own tenant)
 * @desc   Get the currently logged-in admin's own tenant profile
 */
const getMyTenant = async (req, res, next) => {
    try {
        // req.tenantId is stamped by the tenant middleware — always safe
        const tenant = await tenantService.getTenantById(req.tenantId);
        if (!tenant) return sendError(res, 'Tenant not found', 404);

        return sendSuccess(res, 'Your tenant profile fetched successfully', tenant);
    } catch (error) {
        next(error);
    }
};


/**
 * @route  PATCH /api/v1/tenants/me/settings
 * @access Tenant Admin (their own tenant only)
 * @desc   Update the settings for the current tenant (logo, features, limits etc.)
 */
const updateMyTenantSettings = async (req, res, next) => {
    try {
        const errors = validateBody(updateSettingsSchema, req.body);
        if (errors) return sendError(res, 'Validation failed', 400, errors);

        // Use req.tenantId from middleware — can only update THEIR OWN tenant
        const tenant = await tenantService.updateTenantSettings(req.tenantId, req.body);
        if (!tenant) return sendError(res, 'Tenant not found', 404);

        return sendSuccess(res, 'Tenant settings updated successfully', tenant);
    } catch (error) {
        next(error);
    }
};


module.exports = {
    // Super Admin
    createTenant,
    getAllTenants,
    getTenantStats,
    getTenantById,
    updateTenant,
    suspendTenant,
    reactivateTenant,
    deleteTenant,
    upgradeTenantPlan,
    // Tenant Admin
    getMyTenant,
    updateMyTenantSettings,
};
