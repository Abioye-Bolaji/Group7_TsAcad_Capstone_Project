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

    email: Joi.string()
           .email()
           .required()
         .messages({
          'string.email': 'Please provide a valid email address',
        }),

    password: Joi.string()
         .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
         .required()
        .messages({
              'string.pattern.base':
            'Password must contain uppercase, lowercase, and a number',
        }),

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