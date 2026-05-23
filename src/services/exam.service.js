const Exam = require('../models/exam.model');

/**
 * @desc Exam Service
 * Handles all exam-related database operations.
 * FIXED: Converted from ES Module to CommonJS.
 * FIXED: Import path now points to examModel.js (actual filename).
 */

const createExamService = async (payload) => {
    return await Exam.create(payload);
};

const getExamByIdService = async (examId, tenantId) => {
    return await Exam.findOne({ _id: examId, tenantId }).lean();
};

const updateExamService = async (examId, tenantId, updates) => {
    return await Exam.findOneAndUpdate(
        { _id: examId, tenantId },
        updates,
        { new: true, runValidators: true }
    );
};

const deleteExamService = async (examId, tenantId) => {
    return await Exam.findOneAndDelete({ _id: examId, tenantId });
};

/**
 * Status transition rules:
 *   draft → published → active → closed
 */
const updateExamStatusService = async (examId, tenantId, newStatus) => {
    const exam = await Exam.findOne({ _id: examId, tenantId });
    if (!exam) throw new Error('Exam not found');

    if (exam.status === 'closed' && newStatus === 'active') {
        throw new Error('Validation Error: Cannot reactivate a closed exam');
    }
    if (exam.status === 'active' && newStatus === 'draft') {
        throw new Error('Validation Error: Cannot revert an active exam to draft');
    }

    exam.status = newStatus;
    return await exam.save();
};

const getAllExamsService = async (tenantId) => {
    return await Exam.find({ tenantId }).lean();
};

module.exports = {
    createExamService,
    getExamByIdService,
    updateExamService,
    deleteExamService,
    updateExamStatusService,
    getAllExamsService,
};
