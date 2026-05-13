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

/**
 * Status transition rules:
 *   draft → published → active → closed
 * You cannot go backwards or skip states.
 */
const updateExamStatusService = async (examId, newStatus) => {
    const exam = await Exam.findById(examId);
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
    return await Exam.find({ tenantId });
};

module.exports = {
    createExamService,
    updateExamStatusService,
    getAllExamsService,
};
