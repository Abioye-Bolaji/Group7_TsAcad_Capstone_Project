const {
    createExamService,
    getAllExamsService,
    getExamByIdService,
    updateExamService,
    deleteExamService,
    updateExamStatusService,
} = require('../services/exam.service');

const { sendSuccess, sendError } = require('../utils/response');

const createExam = async (req, res, next) => {
    try {
        const exam = await createExamService({
            ...req.body,
            tenantId: req.tenantId,
            createdBy: req.user._id,
        });
        return sendSuccess(res, 'Exam created successfully', exam, 201);
    } catch (error) {
        next(error);
    }
};

const getAllExams = async (req, res, next) => {
    try {
        const exams = await getAllExamsService(req.tenantId);
        return sendSuccess(res, 'Exams fetched successfully', exams, 200, {
            total: exams.length,
        });
    } catch (error) {
        next(error);
    }
};

const getExamById = async (req, res, next) => {
    try {
        const exam = await getExamByIdService(req.params.id, req.tenantId);
        if (!exam) return sendError(res, 'Exam not found', 404);
        return sendSuccess(res, 'Exam fetched successfully', exam);
    } catch (error) {
        next(error);
    }
};

const updateExam = async (req, res, next) => {
    try {
        const exam = await updateExamService(req.params.id, req.tenantId, req.body);
        if (!exam) return sendError(res, 'Exam not found', 404);
        return sendSuccess(res, 'Exam updated successfully', exam);
    } catch (error) {
        next(error);
    }
};

const deleteExam = async (req, res, next) => {
    try {
        const exam = await deleteExamService(req.params.id, req.tenantId);
        if (!exam) return sendError(res, 'Exam not found', 404);
        return sendSuccess(res, 'Exam deleted successfully', null);
    } catch (error) {
        next(error);
    }
};

const updateExamStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status) return sendError(res, 'status field is required', 400);
        const exam = await updateExamStatusService(req.params.id, req.tenantId, status);
        return sendSuccess(res, `Exam status updated to "${status}"`, exam);
    } catch (error) {
        if (error.message.startsWith('Validation Error')) {
            return sendError(res, error.message, 400);
        }
        next(error);
    }
};

module.exports = {
    createExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam,
    updateExamStatus,
};
