const QuestionBank = require('../models/question-bank.model');
const Tenant = require('../models/tenant.model');
const { sendError, sendSuccess } = require('../utils/response');
const XLSX = require('xlsx');
const cloudinary = require('../config/cloudinary.js');

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
        const { questionText, options, difficulty, subjectId, questionType, topic, tags } = req.body;

        const imageUrl = req.file ? req.file.path : null; 

        const tenantId = req.tenantId; 

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
            tags,
            imageUrl,
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
        const tenantId = req.tenantId; 
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
        if (req.query.tags) {
            filters.tags = { $in: req.query.tags.split(',') };
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

exports.updateQuestionImage = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const questionId = req.params.id;
        const imageUrl = req.file ? req.file.path : null;
        const question = await QuestionBank.findOneAndUpdate(
            { _id: questionId, tenantId },
            { imageUrl },
            { new: true, runValidators: true }
        );
        if (!question) {
            return sendError(res, 'Question not found', 404);
        }
        if (question.imageUrl) {
            await cloudinary.uploader.upload(question.imageUrl, {
                folder: `tenants/${tenantId}/questions/${questionId}`,
            });
        }
        return sendSuccess(res, 'Question image updated successfully', question, 200);
    } catch (error) {
        console.error('updateQuestionImage error:', error);
        return sendError(res, 'Failed to update question image', 500);
    }
};

exports.bulkImportQuestions = async (req, res) => {
    try {
        const tenantId = req.tenantId;

        if (!req.file) {
            return sendError(res, 'No file uploaded', 400);
        }

        /**
         * Read uploaded Excel/CSV file
         */
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

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
         * Transform rows into DB format, collecting validation errors along the way
         */
        const errors = []; 

        const questions = rows
            .map((row, index) => {
                const rowNum = index + 1;

                // FIX 2: removed the dangling validation block above the loop
                //        and consolidated all validation here, inside the map
                if (!row.questionType) {
                    errors.push(`Row ${rowNum}: missing questionType`);
                    return null;
                }

                if (!row.questionText) {
                    errors.push(`Row ${rowNum}: missing questionText`);
                    return null;
                }

                if (!row.correctAnswer) {
                    errors.push(`Row ${rowNum}: missing correctAnswer for question: "${row.questionText}"`);
                    return null;
                }

                const questionType = row.questionType.trim();

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

                    const correctAnswer = String(row.correctAnswer).trim().toLowerCase();

                    options = rawOptions.map((option) => ({
                        optionText: String(option).trim(),
                        isCorrect: String(option).trim().toLowerCase() === correctAnswer,
                    }));

                    // Guard: catch mismatch early before hitting the DB
                    const hasCorrect = options.some((o) => o.isCorrect);
                    if (!hasCorrect) {
                        errors.push(
                            `Row ${rowNum}: correctAnswer "${row.correctAnswer}" does not match any of the provided options`
                        );
                        return null;
                    }
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
                        ? row.tags.split(',').map((t) => t.trim())
                        : [],
                    imageUrl: row.imageUrl || '',
                };
            })
            .filter(Boolean);

        if (errors.length > 0) {
            return sendError(res, 'Validation failed for one or more rows', 400, { errors });
        }

        if (!questions.length) {
            return sendError(res, 'No valid questions to import', 400);
        }

        /**
         * Insert into DB
         */
        const importedQuestions = await QuestionBank.insertMany(questions);

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
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};