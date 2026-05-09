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

const registerSchema = Joi.object({
    firstName: Joi.string().min(2).max(50).required(),

    lastName: Joi.string().min(2).max(50).required(),

    email: Joi.string().email().required(),

    password: Joi.string().min(6).required(),

    role: Joi.string()
        .valid(
            'super_admin',
            'tenant_admin',
            'examiner',
            'candidate'
        )
        .optional(),

    tenantId: Joi.string().optional(),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),

    password: Joi.string().required(),
});

module.exports = {
    validateBody,
    registerSchema,
    loginSchema,
};