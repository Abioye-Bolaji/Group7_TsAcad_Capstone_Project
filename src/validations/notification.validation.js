const Joi = require('joi');

const createNotificationSchema = Joi.object({
    recipientId: Joi.string().hex().length(24).required(),
    subject: Joi.string().min(3).max(100).required(),
    message: Joi.string().min(1).required(),
    type: Joi.string().valid('in-app', 'email', 'both').optional(),
    metadata: Joi.object().optional()
});

const batchNotificationSchema = Joi.object({
    groupId: Joi.string().hex().length(24).optional(),
    examId: Joi.string().hex().length(24).optional(),
    subject: Joi.string().min(3).max(100).required(),
    message: Joi.string().min(1).required(),
    type: Joi.string().valid('in-app', 'email', 'both').optional(),
    metadata: Joi.object().optional()
}).or('groupId', 'examId'); // Must provide at least one of these

// Helper to format Joi errors to match the team response style
const validateBody = (schema, body) => {
    const { error } = schema.validate(body, { abortEarly: false });
    if(!error) return null;
    return error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['\"]/g, '')
    }));
};

module.exports = {
    createNotificationSchema,
    batchNotificationSchema,
    validateBody
};