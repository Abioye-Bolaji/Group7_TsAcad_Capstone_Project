const express = require('express');
const router = express.Router();
const multer = require('multer');

const authMiddleware   = require('../middlewares/authMiddleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const authorizeRoles   = require('../middlewares/roleMiddleware');

const candidateController = require('../controllers/candidate.controller');

/**
 * @desc Candidate Management Routes
 * Feature: F5 - Candidate Management
 * Author: ainaseyim@gmail.com
 *
 * Two types of routes in this file:
 *
 * 1. ADMIN routes (tenant_admin / examiner):
 *    authMiddleware → tenantMiddleware → authorizeRoles → controller
 *
 * 2. CANDIDATE self-service routes:
 *    POST /login  → tenantMiddleware only (public, no auth yet)
 *    GET  /me     → authMiddleware → tenantMiddleware → controller
 *                   (candidate must be logged in with their own JWT)
 */

// ─── Multer Setup (CSV Bulk Import) ───────────────────────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed for bulk import'), false);
        }
    },
});


// ═════════════════════════════════════════════════════════════════════════════
//  CANDIDATE SELF-SERVICE ROUTES  ← NEW
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/candidates/login
 * Candidate logs in with idNumber + 6-digit accessPin.
 * tenantMiddleware runs so login is scoped to the right organisation.
 * No authMiddleware here — the candidate doesn't have a token yet.
 * IMPORTANT: defined before /:id routes to avoid route conflict.
 */
router.post(
    '/login',
    candidateController.candidateLogin
);

/**
 * GET /api/v1/candidates/me
 * Candidate views their own profile after logging in.
 * authMiddleware verifies the candidate's JWT → req.user.id = candidate._id
 * tenantMiddleware ensures tenant scope is still enforced.
 * IMPORTANT: defined before /:id routes to avoid conflict.
 */
router.get(
    '/me',
    authMiddleware,
    tenantMiddleware,
    candidateController.getMyProfile
);


// ═════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES  (tenant_admin / examiner)
//  Shared middleware applied from here down
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/candidates/bulk-import
 * Bulk import candidates from a CSV file.
 * Form field name must be "file".
 * Defined before /:id to avoid route conflict with POST /:id.
 */
router.post(
    '/bulk-import',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('tenant_admin'),
    upload.single('file'),
    candidateController.bulkImportCandidates
);

/**
 * POST /api/v1/candidates
 * Create a single candidate. Returns candidate + one-time plain accessPin.
 */
router.post(
    '/',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('tenant_admin', 'examiner'),
    candidateController.createCandidate
);

/**
 * GET /api/v1/candidates
 * List all candidates in the tenant.
 * Query: ?status=active&groupId=xxx&search=john&page=1&limit=20
 */
router.get(
    '/',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('tenant_admin', 'examiner'),
    candidateController.getAllCandidates
);

/**
 * GET /api/v1/candidates/:id
 * Get a single candidate by MongoDB _id.
 */
router.get(
    '/:id',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('tenant_admin', 'examiner'),
    candidateController.getCandidateById
);

/**
 * PATCH /api/v1/candidates/:id
 * Update a candidate's profile (name, phone, idNumber, profilePictureUrl).
 */
router.patch(
    '/:id',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('tenant_admin', 'examiner'),
    candidateController.updateCandidate
);

/**
 * PATCH /api/v1/candidates/:id/status
 * Update a candidate's status. tenant_admin only.
 */
router.patch(
    '/:id/status',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('tenant_admin'),
    candidateController.updateCandidateStatus
);

/**
 * DELETE /api/v1/candidates/:id
 * Permanently delete a candidate. tenant_admin only.
 */
router.delete(
    '/:id',
    authMiddleware,
    tenantMiddleware,
    authorizeRoles('tenant_admin'),
    candidateController.deleteCandidate
);


module.exports = router;
