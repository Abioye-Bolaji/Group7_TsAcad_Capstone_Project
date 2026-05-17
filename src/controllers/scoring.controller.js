const service = require('../services/scoring.service');
const { sendSuccess, sendError } = require('../utils/response');


const gradeSession = async (req, res) => {
    try {
        const result = await service.gradeSubmittedSession(req.params.sessionId, req.tenantId);
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
        return sendSuccess(res, 'Results fetched', results);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

const getExamResults = async (req, res) => {
    try {
        const filters = req.query.status ? { gradingStatus: req.query.status } : {};
        const results = await service.getResultByExam(req.params.examId, req.tenantId, filters);
        if (!result) return sendError(res, 'Result not available yet', 404);
        const { manualGradingQueue, ...safeResult } = result;
        return sendSuccess(res, 'Result fetched', safeResult);
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
        const { questionId, marksAwarded, feedback } = req.body;
        if (!questionId || marksAwarded === undefined)
            return sendError(res, 'QuestionId and marksAwarded are required', 400);
        if (typeof marksAwarded !== 'number')
            return sendError(res, 'marksAwarded must be a number', 400);

        const result = await service.submitManualGrade(
            req.prams.resultId,
            questionId,
            marksAwarded,
            req.user._id,
            feedback,
            req.tenantId
        );
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