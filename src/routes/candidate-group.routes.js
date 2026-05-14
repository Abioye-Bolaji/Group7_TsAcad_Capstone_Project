const express = require('express');
const router = express.Router();

const authMiddleware   = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const authorizeRoles   = require('../middlewares/role.middleware');

const candidateController = require('../controllers/candidate.controller');

/**
 * @desc Candidate Group Routes
 * Feature: F5 - Candidate Management
 * Author: ainaseyim@gmail.com
 *
 * These routes are mounted at /api/v1/candidate-groups in app.js.
 *
 * F4 (Exam Setup) and F6 (Exam Session) depend on:
 *   GET /api/v1/candidate-groups        → list all groups
 *   GET /api/v1/candidate-groups/:id    → get a group with populated candidates
 *
 * Middleware chain on every route:
 *   authMiddleware → tenantMiddleware → authorizeRoles → controller
 */

// ─── Shared middleware stack ───────────────────────────────────────────────────
router.use(authMiddleware, tenantMiddleware);


// ═════════════════════════════════════════════════════════════════════════════
//  CANDIDATE GROUP ROUTES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/candidate-groups
 * Create a new candidate group / cohort within the tenant.
 * Body: { name, description (optional), candidateIds (optional) }
 */
router.post(
    '/',
    authorizeRoles('tenant_admin', 'examiner'),
    candidateController.createGroup
);

/**
 * GET /api/v1/candidate-groups
 * List all groups in the tenant.
 * Query params: ?search=batch-a&page=1&limit=20
 */
router.get(
    '/',
    authorizeRoles('tenant_admin', 'examiner'),
    candidateController.getAllGroups
);

/**
 * GET /api/v1/candidate-groups/:id
 * Get a single group — candidate members are populated with name, email, idNumber, status.
 * F4 and F6 call this endpoint to get the full candidate list for a group.
 */
router.get(
    '/:id',
    authorizeRoles('tenant_admin', 'examiner'),
    candidateController.getGroupById
);

/**
 * PATCH /api/v1/candidate-groups/:id
 * Update a group's name or description.
 * To add/remove members use the dedicated endpoints below.
 */
router.patch(
    '/:id',
    authorizeRoles('tenant_admin', 'examiner'),
    candidateController.updateGroup
);

/**
 * DELETE /api/v1/candidate-groups/:id
 * Delete a group. Also removes the groupId reference from all member candidates.
 * Restricted to tenant_admin only.
 */
router.delete(
    '/:id',
    authorizeRoles('tenant_admin'),
    candidateController.deleteGroup
);

/**
 * POST /api/v1/candidate-groups/:id/candidates
 * Add one or more candidates to a group.
 * Body: { candidateIds: ["mongo_id_1", "mongo_id_2"] }
 * Only candidates belonging to this tenant will be accepted.
 */
router.post(
    '/:id/candidates',
    authorizeRoles('tenant_admin', 'examiner'),
    candidateController.addCandidatesToGroup
);

/**
 * DELETE /api/v1/candidate-groups/:id/candidates
 * Remove one or more candidates from a group.
 * Body: { candidateIds: ["mongo_id_1", "mongo_id_2"] }
 */
router.delete(
    '/:id/candidates',
    authorizeRoles('tenant_admin', 'examiner'),
    candidateController.removeCandidatesFromGroup
);


module.exports = router;
