const QuestionBank = require('../models/questionbank.model');
const Tenant = require('../models/tenant.model');
const { sendError, sendSuccess } = require('../utils/response');

/**
 * @desc Question Bank Controller
 * Handles HTTP requests related to question banks.
 * All business logic lives in the corresponding service layer.
 *
 * Author: [Your Name]
 * Date: [Date]
 */

// create a new question in the tenant's question bank

exports.createQuestion = async (req, res) => {
    try {
        const { questionText, options, difficulty } = req.body;
        const tenantId = req.tenantId; // Set by tenant middleware

        // Validate tenant existence (optional, since tenant middleware should have done this)
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return sendError(res, 'Tenant not found', 404);
        }
        // Create the question
        const question = new QuestionBank({
            tenantId,
            questionText,
            options,
            difficulty,
        });
        await question.save();
        return sendSuccess(res, 'Question created successfully', question, 201);
    } catch (error) {
        console.error('createQuestion error:', error);
        return sendError(res, 'Failed to create question', 500);
    }
};

// get all questions for the tenant, with optional filters (difficulty) and pagination

exports.getQuestions = async (req, res) => {
    try {
        const tenantId = req.tenantId; // Set by tenant middleware
        const questions = await QuestionBank.find({ tenantId }).lean();
        return sendSuccess(res, 'Questions fetched successfully', questions, 200);
    } catch (error) {
        console.error('getQuestions error:', error);
        return sendError(res, 'Failed to fetch questions', 500);
    }
};

// get a single question by id, ensuring it belongs to the tenant
exports.getQuestionById = async (req, res) => {
    try {
        const tenantId = req.tenantId; // Set by tenant middleware
        const questionId = req.params.id;
        const question = await QuestionBank.findOne({ _id: questionId, tenantId }).lean();
        if (!question) {
            return sendError(res, 'Question not found', 404);
        }     return sendSuccess(res, 'Question fetched successfully', question, 200);
    } catch (error) {
        console.error('getQuestionById error:', error);
        return sendError(res, 'Failed to fetch question', 500);
    }
};

// update a question by id, ensuring it belongs to the tenant

exports.updateQuestion = async (req, res) => {
    try {
        const tenantId = req.tenantId; // Set by tenant middleware
        const questionId = req.params.id;
        const updates = req.body;
        const question = await QuestionBank.findOneAndUpdate(
            { _id: questionId, tenantId },
            updates,
            { new: true, runValidators: true }
        );
        if (!question) {
            return sendError(res, 'Question not found', 404);
        }
        return sendSuccess(res, 'Question updated successfully', question, 200);
    } catch (error) {
        console.error('updateQuestion error:', error);
        return sendError(res, 'Failed to update question', 500);
    }
};

// delete a question by id, ensuring it belongs to the tenant

exports.deleteQuestion = async (req, res) => {
    try {
        const tenantId = req.tenantId; // Set by tenant middleware
        const questionId = req.params.id;
        const question = await QuestionBank.findOneAndDelete({ _id: questionId, tenantId });
        if (!question) {
            return sendError(res, 'Question not found', 404);
        }
        return sendSuccess(res, 'Question deleted successfully', null, 200);
    } catch (error) {
        console.error('deleteQuestion error:', error);
        return sendError(res, 'Failed to delete question', 500);
    }
};

