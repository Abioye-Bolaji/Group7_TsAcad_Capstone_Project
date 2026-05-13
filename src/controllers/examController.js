const {
    createExamService,
    getAllExamsService,
} = require('../services/examService');

const { sendSuccess, sendError } = require('../utils/response');

/**
 * @desc Exam Controller
 * Thin HTTP layer — validates input, calls service, sends response.
 * FIXED: Converted from ES Module to CommonJS.
 * FIXED: Import path now points to examService.js (actual filename).
 * FIXED: Uses project-standard sendSuccess/sendError utilities.
 */

/**
 * @route  POST /api/v1/exams
 * @access Examiner / Tenant Admin
 * @desc   Create a new exam scoped to the logged-in user's tenant
 */
const createExam = async (req, res, next) => {
    try {
        const exam = await createExamService({
            ...req.body,
            tenantId: req.tenantId,      // ← from tenant.middleware, NOT req.user.tenantId
            createdBy: req.user._id,
        });

        return sendSuccess(res, 'Exam created successfully', exam, 201);
    } catch (error) {
        next(error);
    }
};

/**
 * @route  GET /api/v1/exams
 * @access Examiner / Tenant Admin
 * @desc   List all exams scoped to the logged-in user's tenant
 */
const getAllExams = async (req, res, next) => {
    try {
        const exams = await getAllExamsService(req.tenantId); // ← from tenant.middleware

        return sendSuccess(
            res,
            'Exams fetched successfully',
            exams,
            200,
            {
                total: exams.length,
                page: 1,
                limit: 10,
                pages: Math.ceil(exams.length / 10),
            }
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createExam,
    getAllExams,
};
