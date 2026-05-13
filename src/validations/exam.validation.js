const Joi = require('joi');

/**
 * @desc Exam Validation Schemas
 * FIXED: Converted from ES Module to CommonJS.
 */

const createExamSchema = Joi.object({
    title: Joi.string().required(),
    subject: Joi.string().required(),
    duration: Joi.number().positive().required(),   // in minutes
    passMark: Joi.number().min(0).required(),
    attemptsAllowed: Joi.number().integer().min(1).required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    randomQuestionCount: Joi.number().integer().min(0).optional(),
    instructions: Joi.string().optional(),
    description: Joi.string().optional(),
    totalMarks: Joi.number().min(0).optional(),
    randomizeQuestions: Joi.boolean().optional(),
    randomizeOptions: Joi.boolean().optional(),
});

/**
 * Inline validation middleware (same pattern as auth.validation.js)
 * Usage: const errors = validateExam(createExamSchema, req.body);
 */
const validateExam = (schema, body) => {
    const { error } = schema.validate(body, { abortEarly: false });
    if (!error) return null;
    return error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
    }));
};

module.exports = {
    createExamSchema,
    validateExam,
};
