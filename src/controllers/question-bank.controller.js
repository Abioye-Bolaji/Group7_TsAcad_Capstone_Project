const QuestionBank = require('../models/question-bank.model');
const Tenant = require('../models/tenant.model');
const { sendError, sendSuccess } = require('../utils/response');

/**
 * @desc Question Bank Controller
 * Handles HTTP requests related to question banks.
 * All business logic lives in the corresponding service layer.
 *
 * Author: Tobiloba Obiyomi
 * Date: 13-05-2026
 */

// create a new question in the tenant's question bank

exports.createQuestion = async (req, res) => {
    try {
        const { questionText, options, difficulty, subjectId, questionType, topic, tag } = req.body;
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
            subjectId,
            questionType,
            topic,
            tag,
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
        const filters = { tenantId };
        if (req.query.difficulty) {
            filters.difficulty = req.query.difficulty;
        }
        if (req.query.subjectId) {
            filters.subjectId = req.query.subjectId;
        }
        if (req.query.questionType) {
            filters.questionType = req.query.questionType;
        }
        if (req.query.topic) {
            filters.topic = req.query.topic;
        }
        if (req.query.tag) {
            filters.tag = req.query.tag;
        }
        if (req.query.search) {
            filters.questionText = {
                $regex: req.query.search,
                $options: 'i',
            };
        }
        const questions = await QuestionBank.countDocuments(filters).lean();
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

const XLSX = require('xlsx');

/**
 * @desc Bulk import questions via CSV/Excel
 * @route POST /api/questions/bulk-import
 */

exports.bulkImportQuestions = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        // Ensure file exists
        if (!req.file) {
            return sendError(res, 'No file uploaded', 400);
        }

        /**
         * Read uploaded Excel/CSV file
         */
        const workbook = XLSX.read(req.file.buffer, {
            type: 'buffer',
        });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        /**
         * Convert worksheet to JSON
         */
        const rows = XLSX.utils.sheet_to_json(worksheet);

        if (!rows.length) {
            return sendError(res, 'Uploaded file is empty', 400);
        }

        /**
         * Transform rows into DB format
         */
        const questions = rows.map((row) => {
            const questionType = row.questionType?.trim();
            let options = [];

            /**
             * Build options for MCQ / True-False
             */
            if (
                questionType === 'multiple_choice' ||
                questionType === 'true_false'
            ) {
                const rawOptions = [
                    row.optionA,
                    row.optionB,
                    row.optionC,
                    row.optionD,
                ].filter(Boolean);

                options = rawOptions.map((option) => ({
                    optionText: option,
                    isCorrect:
                        option.toString().trim() ===
                        row.correctAnswer.toString().trim(),
                }));
            }

            return {
                tenantId,
                subjectId: row.subjectId,
                topic: row.topic || '',
                questionType,
                questionText: row.questionText,
                options,
                correctAnswer: row.correctAnswer,
                difficulty: row.difficulty || 'medium',
                tags: row.tags
                    ? row.tags.split(',').map(tag => tag.trim())
                    : [],
            };
        });

        /**
         * Insert into DB
         */
        const importedQuestions =
            await QuestionBank.insertMany(questions);

        return sendSuccess(
            res,
            'Questions imported successfully',
            {
                totalImported: importedQuestions.length,
                questions: importedQuestions,
            },
            201
        );

    } catch (error) {
        console.error('bulkImportQuestions error:', error);
        return sendError(
            res,
            'Failed to import questions',
            500
        );
    }
};