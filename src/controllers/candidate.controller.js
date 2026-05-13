const { sendSuccess, sendError } = require('../utils/response');
const {
    validateBody,
    createCandidateSchema,
    updateCandidateSchema,
    updateStatusSchema,
    createGroupSchema,
    updateGroupSchema,
    candidateIdsSchema,
    pinLoginSchema,
} = require('../validations/candidate.validation');

const candidateService = require('../services/candidate.service');

/**
 * @desc Candidate Controller — HTTP layer only
 * Thin controllers: validate input → call service → send response.
 * Zero business logic or DB calls here.
 *
 * Middleware chain on every ADMIN route:
 *   authMiddleware → tenantMiddleware → authorizeRoles(...) → controller
 *
 * Middleware chain on CANDIDATE self-service routes:
 *   tenantMiddleware → controller (login is public within tenant scope)
 *   authMiddleware → tenantMiddleware → controller (for /me — candidate must be logged in)
 *
 * Feature: F5 - Candidate Management
 * Author: ainaseyim@gmail.com
 */


// ═════════════════════════════════════════════════════════════════════════════
//  CANDIDATE AUTH CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @route  POST /api/v1/candidates/login
 * @access Public (within tenant scope — tenantMiddleware runs but no auth required)
 * @desc   Candidate logs in using idNumber + 6-digit accessPin
 *         Returns a JWT token the candidate uses for subsequent requests
 */
const candidateLogin = async (req, res, next) => {
    try {
        const errors = validateBody(pinLoginSchema, req.body);
        if (errors) {
            return sendError(res, 'Validation failed', 400, errors);
        }

        const { idNumber, accessPin, tenantId } = req.body;

        if (!tenantId) {
            return sendError(res, 'Tenant ID is required to log in', 400);
        }


        const { candidate, token } = await candidateService.candidateLogin(
            tenantId, // from body instead of middleware
            idNumber,
            accessPin
        );

        return sendSuccess(res, 'Login successful', { candidate, token });
    } catch (error) {
        // Use 401 for invalid credentials — never reveal which field was wrong
        if (
            error.message === 'Invalid ID number or access PIN' ||
            error.message.includes('suspended') ||
            error.message.includes('inactive')
        ) {
            return sendError(res, error.message, 401);
        }
        next(error);
    }
};

/**
 * @route  GET /api/v1/candidates/me
 * @access Candidate only (must be logged in via candidateLogin above)
 * @desc   Candidate views their own profile
 *         req.user is set by authMiddleware after verifying the candidate's JWT
 *         req.user.candidateId is the candidate's _id (embedded in the token)
 */
const getMyProfile = async (req, res, next) => {
    try {
        // req.user.id is the candidate's _id (set by authMiddleware from JWT)
        // req.tenantId ensures they can only see their own tenant's data
        const candidate = await candidateService.getCandidateById(
            req.user.id,
            req.tenantId
        );

        if (!candidate) {
            return sendError(res, 'Candidate profile not found', 404);
        }

        return sendSuccess(res, 'Profile fetched successfully', candidate);
    } catch (error) {
        next(error);
    }
};


// ═════════════════════════════════════════════════════════════════════════════
//  CANDIDATE CRUD CONTROLLERS  (Admin access)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @route  POST /api/v1/candidates
 * @access tenant_admin, examiner
 * @desc   Register a single new candidate within the tenant
 */
const createCandidate = async (req, res, next) => {
    try {
        const errors = validateBody(createCandidateSchema, req.body);
        if (errors) {
            return sendError(res, 'Validation failed', 400, errors);
        }

        const { candidate, plainPin } = await candidateService.createCandidate(
            req.body,
            req.tenantId,
            req.user._id
        );

        return sendSuccess(
            res,
            'Candidate created successfully. Share the PIN with the candidate — it will not be shown again.',
            { candidate, accessPin: plainPin },
            201
        );
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return sendError(res, `A candidate with this ${field} already exists in your organisation.`, 409);
        }
        next(error);
    }
};

/**
 * @route  GET /api/v1/candidates
 * @access tenant_admin, examiner
 * @desc   List all candidates — supports ?status, ?groupId, ?search, ?page, ?limit
 */
const getAllCandidates = async (req, res, next) => {
    try {
        const { status, groupId, search, page, limit } = req.query;

        const result = await candidateService.getAllCandidates(req.tenantId, {
            status, groupId, search, page, limit,
        });

        return sendSuccess(
            res,
            'Candidates fetched successfully',
            result.candidates,
            200,
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

/**
 * @route  GET /api/v1/candidates/:id
 * @access tenant_admin, examiner
 * @desc   Get a single candidate by MongoDB _id
 */
const getCandidateById = async (req, res, next) => {
    try {
        const candidate = await candidateService.getCandidateById(
            req.params.id,
            req.tenantId
        );

        if (!candidate) {
            return sendError(res, 'Candidate not found', 404);
        }

        return sendSuccess(res, 'Candidate fetched successfully', candidate);
    } catch (error) {
        next(error);
    }
};

/**
 * @route  PATCH /api/v1/candidates/:id
 * @access tenant_admin, examiner
 * @desc   Update a candidate's profile (name, phone, idNumber, profilePictureUrl)
 */
const updateCandidate = async (req, res, next) => {
    try {
        const errors = validateBody(updateCandidateSchema, req.body);
        if (errors) {
            return sendError(res, 'Validation failed', 400, errors);
        }

        const candidate = await candidateService.updateCandidate(
            req.params.id,
            req.tenantId,
            req.body
        );

        if (!candidate) {
            return sendError(res, 'Candidate not found', 404);
        }

        return sendSuccess(res, 'Candidate updated successfully', candidate);
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return sendError(res, `A candidate with this ${field} already exists.`, 409);
        }
        next(error);
    }
};

/**
 * @route  PATCH /api/v1/candidates/:id/status
 * @access tenant_admin only
 * @desc   Update a candidate's status (active / inactive / suspended)
 */
const updateCandidateStatus = async (req, res, next) => {
    try {
        const errors = validateBody(updateStatusSchema, req.body);
        if (errors) {
            return sendError(res, 'Validation failed', 400, errors);
        }

        const candidate = await candidateService.updateCandidateStatus(
            req.params.id,
            req.tenantId,
            req.body.status
        );

        if (!candidate) {
            return sendError(res, 'Candidate not found', 404);
        }

        return sendSuccess(res, `Candidate status updated to "${req.body.status}"`, candidate);
    } catch (error) {
        next(error);
    }
};

/**
 * @route  DELETE /api/v1/candidates/:id
 * @access tenant_admin only
 * @desc   Permanently delete a candidate and remove them from all groups
 */
const deleteCandidate = async (req, res, next) => {
    try {
        const result = await candidateService.deleteCandidate(req.params.id, req.tenantId);

        if (!result) {
            return sendError(res, 'Candidate not found', 404);
        }

        return sendSuccess(res, 'Candidate deleted successfully', null, 200);
    } catch (error) {
        next(error);
    }
};

/**
 * @route  POST /api/v1/candidates/bulk-import
 * @access tenant_admin only
 * @desc   Bulk import candidates from a CSV file (field name: "file")
 */
const bulkImportCandidates = async (req, res, next) => {
    try {
        if (!req.file) {
            return sendError(res, 'No CSV file uploaded. Please attach a file with field name "file".', 400);
        }

        const result = await candidateService.bulkImportCandidates(
            req.file.buffer,
            req.tenantId,
            req.user._id
        );

        const message = result.created.length > 0
            ? `Bulk import complete. ${result.created.length} created, ${result.failed.length} failed.`
            : 'Bulk import failed. No candidates were created.';

        return sendSuccess(res, message, result, 207);
    } catch (error) {
        next(error);
    }
};


// ═════════════════════════════════════════════════════════════════════════════
//  CANDIDATE GROUP CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @route  POST /api/v1/candidate-groups
 * @access tenant_admin, examiner
 */
const createGroup = async (req, res, next) => {
    try {
        const errors = validateBody(createGroupSchema, req.body);
        if (errors) return sendError(res, 'Validation failed', 400, errors);

        const group = await candidateService.createGroup(req.body, req.tenantId, req.user._id);

        return sendSuccess(res, 'Candidate group created successfully', group, 201);
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 'A group with this name already exists in your organisation.', 409);
        }
        next(error);
    }
};

/**
 * @route  GET /api/v1/candidate-groups
 * @access tenant_admin, examiner
 */
const getAllGroups = async (req, res, next) => {
    try {
        const { search, page, limit } = req.query;

        const result = await candidateService.getAllGroups(req.tenantId, { search, page, limit });

        return sendSuccess(res, 'Candidate groups fetched successfully', result.groups, 200, result.pagination);
    } catch (error) {
        next(error);
    }
};

/**
 * @route  GET /api/v1/candidate-groups/:id
 * @access tenant_admin, examiner
 */
const getGroupById = async (req, res, next) => {
    try {
        const group = await candidateService.getGroupById(req.params.id, req.tenantId);

        if (!group) return sendError(res, 'Candidate group not found', 404);

        return sendSuccess(res, 'Candidate group fetched successfully', group);
    } catch (error) {
        next(error);
    }
};

/**
 * @route  PATCH /api/v1/candidate-groups/:id
 * @access tenant_admin, examiner
 */
const updateGroup = async (req, res, next) => {
    try {
        const errors = validateBody(updateGroupSchema, req.body);
        if (errors) return sendError(res, 'Validation failed', 400, errors);

        const group = await candidateService.updateGroup(req.params.id, req.tenantId, req.body);

        if (!group) return sendError(res, 'Candidate group not found', 404);

        return sendSuccess(res, 'Candidate group updated successfully', group);
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, 'A group with this name already exists in your organisation.', 409);
        }
        next(error);
    }
};

/**
 * @route  DELETE /api/v1/candidate-groups/:id
 * @access tenant_admin only
 */
const deleteGroup = async (req, res, next) => {
    try {
        const result = await candidateService.deleteGroup(req.params.id, req.tenantId);

        if (!result) return sendError(res, 'Candidate group not found', 404);

        return sendSuccess(res, 'Candidate group deleted successfully', null, 200);
    } catch (error) {
        next(error);
    }
};

/**
 * @route  POST /api/v1/candidate-groups/:id/candidates
 * @access tenant_admin, examiner
 */
const addCandidatesToGroup = async (req, res, next) => {
    try {
        const errors = validateBody(candidateIdsSchema, req.body);
        if (errors) return sendError(res, 'Validation failed', 400, errors);

        const group = await candidateService.addCandidatesToGroup(
            req.params.id, req.tenantId, req.body.candidateIds
        );

        if (!group) return sendError(res, 'Candidate group not found', 404);

        return sendSuccess(res, 'Candidates added to group successfully', group);
    } catch (error) {
        if (error.message.includes('None of the provided')) {
            return sendError(res, error.message, 400);
        }
        next(error);
    }
};

/**
 * @route  DELETE /api/v1/candidate-groups/:id/candidates
 * @access tenant_admin, examiner
 */
const removeCandidatesFromGroup = async (req, res, next) => {
    try {
        const errors = validateBody(candidateIdsSchema, req.body);
        if (errors) return sendError(res, 'Validation failed', 400, errors);

        const group = await candidateService.removeCandidatesFromGroup(
            req.params.id, req.tenantId, req.body.candidateIds
        );

        if (!group) return sendError(res, 'Candidate group not found', 404);

        return sendSuccess(res, 'Candidates removed from group successfully', group);
    } catch (error) {
        next(error);
    }
};


module.exports = {
    // Auth
    candidateLogin,
    getMyProfile,
    // Candidates
    createCandidate,
    getAllCandidates,
    getCandidateById,
    updateCandidate,
    updateCandidateStatus,
    deleteCandidate,
    bulkImportCandidates,
    // Groups
    createGroup,
    getAllGroups,
    getGroupById,
    updateGroup,
    deleteGroup,
    addCandidatesToGroup,
    removeCandidatesFromGroup,
};
