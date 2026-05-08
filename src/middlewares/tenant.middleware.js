const Tenant = require('../models/tenant.model');
const { sendError } = require('../utils/response');

/**
 * ============================================================
 *  TENANT SCOPE MIDDLEWARE
 *  File: src/middlewares/tenant.js
 *  Author: kaluvictor130@gmail.com (Team Lead)
 * ============================================================
 *
 * PURPOSE:
 *   This middleware runs on every protected API route.
 *   It reads the tenantId from the decoded JWT (attached by auth middleware),
 *   validates the tenant in MongoDB, and stamps req.tenantId + req.tenant
 *   onto the request object so all downstream controllers can use it safely.
 *
 * ─────────────────────────────────────────────────────────────
 *  THE tenantId CONTRACT (READ THIS — ALL TEAMMATES MUST FOLLOW)
 * ─────────────────────────────────────────────────────────────
 *
 *  After this middleware runs, every request will have:
 *
 *    req.tenantId  → String  (the tenant's MongoDB _id as a string)
 *    req.tenant    → Object  (the full Tenant document from MongoDB)
 *
 *  HOW TO USE IN YOUR FEATURE:
 *
 *    ✅ CORRECT — Always filter queries by tenantId:
 *       const exams = await Exam.find({ tenantId: req.tenantId });
 *
 *    ✅ CORRECT — Always save tenantId on new records:
 *       const exam = new Exam({ ...req.body, tenantId: req.tenantId });
 *
 *    ❌ WRONG — Never query without tenantId:
 *       const exams = await Exam.find({});  ← This leaks ALL tenants' data!
 *
 *  SUPER ADMIN BYPASS:
 *    If req.user.role === 'super_admin', this middleware skips tenant scoping.
 *    Super Admins can query across all tenants (they manage the platform).
 *
 *  EXECUTION ORDER IN app.js:
 *    1. authMiddleware runs first  → decodes JWT, sets req.user
 *    2. tenantMiddleware runs next → validates tenant, sets req.tenantId
 *    3. Your route controller runs → use req.tenantId freely
 *
 * ─────────────────────────────────────────────────────────────
 */

const tenantMiddleware = async (req, res, next) => {
    try {
        // ── STEP 1: Super Admin Bypass ─────────────────────────────────
        // Super Admins manage ALL tenants — they don't belong to one tenant.
        // Skip scoping so they can reach platform-wide admin routes.
        if (req.user && req.user.role === 'super_admin') {
            return next();
        }

        // ── STEP 2: Extract tenantId from JWT payload ──────────────────
        // The Auth middleware (F1) decodes the JWT and attaches req.user.
        // The JWT payload must include a tenantId field.
        const tenantId = req.user?.tenantId;

        if (!tenantId) {
            return sendError(
                res,
                'No tenant context found. Please log in with a valid account.',
                403
            );
        }

        // ── STEP 3: Look up the tenant in the database ─────────────────
        const tenant = await Tenant.findById(tenantId).lean();

        if (!tenant) {
            return sendError(
                res,
                'Tenant not found. This account does not belong to a registered organisation.',
                404
            );
        }

        // ── STEP 4: Check tenant status ────────────────────────────────
        if (tenant.status === 'suspended') {
            return sendError(
                res,
                `Your organisation account has been suspended. Contact support at support@cbtplatform.com`,
                403
            );
        }

        if (tenant.status === 'inactive') {
            return sendError(
                res,
                'Your organisation account is inactive. Please complete your setup.',
                403
            );
        }

        // ── STEP 5: Stamp tenantId and full tenant onto the request ────
        // From this point forward, req.tenantId and req.tenant are available
        // in every controller, service, and subsequent middleware.
        req.tenantId = tenant._id.toString();
        req.tenant   = tenant; // Full tenant object — includes plan, settings, etc.

        next();
    } catch (error) {
        console.error('❌ Tenant Middleware Error:', error.message);
        return sendError(res, 'Internal server error in tenant validation.', 500);
    }
};

module.exports = tenantMiddleware;
