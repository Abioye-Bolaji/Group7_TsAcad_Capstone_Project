const Joi = require('joi');

const validateBody = (schema, body) => {
    const { error } = schema.validate(body, {
        abortEarly: false,
    });

    if (!error) return null;

    return error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
    }));
};

const submitManualGradeSchema = Joi.object({
    questionId: Joi.string().required().messages({
        'any.required': 'questionId is required'
    }),
    marksAwarded: Joi.number().min(0).required().messages({
        'number.base': 'marksAwarded must be a number',
        'any.required': 'marksAwarded is required'
    }),
    feedback: Joi.string().allow('').optional()
});

module.exports = {
    validateBody,
    submitManualGradeSchema
};
