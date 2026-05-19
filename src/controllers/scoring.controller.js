const service = require('../services/scoring.service');
const { sendSuccess, sendError } = require('../utils/response');
const { auditLog } = require('../utils/audit-log.utils');
const { submitManualGradeSchema, validateBody } = require('../validations/scoring.validation');

const gradeSession = async (req, res) => {
    try {
        const result = await service.gradeSubmittedSession(req.params.sessionId, req.tenantId);
        
        await auditLog(req, 'GRADE_SESSION', 'result', {
            resourceId: result._id,
            description: `Exam session ${req.params.sessionId} graded successfully. Score: ${result.percentage}%.`,
            severity: 'LOW'
        });

        return sendSuccess(res, 'Session graded successfully', result, 201);
    } catch (err) {
        return sendError(res, err.message, 400);
    }
};

const getResult = async (req, res) => {
    try {
        const result = await service.getResultById(req.params.resultId, req.tenantId);
        if (!result) return sendError(res, 'Result not found', 404);
        return sendSuccess(res, 'Result fetched', result);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

const getCandidateResult = async (req, res) => {
    try {
        const result = await service.getResultBySession(req.params.sessionId, req.tenantId);
        if (!result) return sendError(res, 'Result not available yet', 404);
        return sendSuccess(res, 'Results fetched', result);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

const getExamResults = async (req, res) => {
    try {
        const filters = req.query.status ? { gradingStatus: req.query.status } : {};
        const results = await service.getResultByExam(req.params.examId, req.tenantId, filters);
        
        // Strip manualGradingQueue from the results returned to candidates/public (for security/clutter)
        const safeResults = results.map(r => {
            const { manualGradingQueue, ...rest } = r;
            return rest;
        });

        return sendSuccess(res, 'Results fetched', safeResults);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

const getManualQueue = async (req, res) => {
    try {
        const results = await service.getPendingManualGrading(req.tenantId);
        return sendSuccess(res, 'Manual grading queue fetched', results);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

const submitManualGrade = async (req, res) => {
    try {
        const errors = validateBody(submitManualGradeSchema, req.body);
        if (errors) {
            return sendError(res, 'Validation failed', 400, errors);
        }

        const { questionId, marksAwarded, feedback } = req.body;

        const result = await service.submitManualGrade(
            req.params.resultId,
            questionId,
            marksAwarded,
            req.user._id,
            feedback,
            req.tenantId
        );

        await auditLog(req, 'SUBMIT_MANUAL_GRADE', 'result', {
            resourceId: result._id,
            description: `Manual grade submitted for question ${questionId} in result ${req.params.resultId}. Marks awarded: ${marksAwarded}.`,
            severity: 'MEDIUM'
        });

        return sendSuccess(res, 'Manual grade saved', result);
    } catch (err) {
        return sendError(res, err.message, 400);
    }
};

const releaseResult = async (req, res) => {
    try {
        const result = await service.releaseResult(
            req.params.resultId,
            req.tenantId,
            req.user._id
        );

        await auditLog(req, 'RELEASE_RESULT', 'result', {
            resourceId: result._id,
            description: `Exam result ${req.params.resultId} released to candidate.`,
            severity: 'HIGH'
        });

        return sendSuccess(res, 'Result released to candidate', result);
    } catch (err) {
        return sendError(res, err.message, 400);
    }
};

module.exports = {
    gradeSession,
    getResult,
    getCandidateResult,
    getExamResults,
    getManualQueue,
    submitManualGrade,
    releaseResult,
};