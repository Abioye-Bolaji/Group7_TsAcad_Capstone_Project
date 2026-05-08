const Joi = require('joi');

/**
 * @desc Validation schemas for Tenant Management routes.
 * Uses Joi for consistent, declarative input validation.
 * All validation errors are formatted to match the team's error envelope.
 *
 * Author: kaluvictor130@gmail.com (Team Lead)
 */

// ─── Reusable Validation Helper ───────────────────────────────────────────────

/**
 * Runs a Joi schema against req.body and returns formatted errors.
 * Use this in your controllers like so:
 *   const errors = validateBody(createTenantSchema, req.body);
 *   if (errors) return sendError(res, 'Validation failed', 400, errors);
 */
const validateBody = (schema, body) => {
    const { error } = schema.validate(body, { abortEarly: false });
    if (!error) return null;

    // Format to match team's error envelope: [{ field, message }]
    return error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
    }));
};


// ─── 1. Create Tenant Schema ──────────────────────────────────────────────────
const createTenantSchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        'string.min':  'Tenant name must be at least 2 characters',
        'string.max':  'Tenant name cannot exceed 100 characters',
        'any.required': 'Tenant name is required',
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Contact email is required',
    }),
    phone:   Joi.string().allow('', null).optional(),
    address: Joi.string().allow('', null).optional(),
    logoUrl: Joi.string().uri().allow('', null).optional().messages({
        'string.uri': 'Logo URL must be a valid URL',
    }),
    plan: Joi.string().valid('free', 'basic', 'pro').default('free'),
    settings: Joi.object({
        allowedFeatures: Joi.array().items(Joi.string()).optional(),
        maxCandidates:   Joi.number().integer().min(1).optional(),
        maxExams:        Joi.number().integer().min(1).optional(),
        customDomain:    Joi.string().allow('', null).optional(),
    }).optional(),
});


// ─── 2. Update Tenant Schema ──────────────────────────────────────────────────
const updateTenantSchema = Joi.object({
    name:    Joi.string().min(2).max(100).optional(),
    email:   Joi.string().email().optional(),
    phone:   Joi.string().allow('', null).optional(),
    address: Joi.string().allow('', null).optional(),
    logoUrl: Joi.string().uri().allow('', null).optional(),
    plan:    Joi.string().valid('free', 'basic', 'pro').optional(),
}).min(1).messages({
    'object.min': 'At least one field is required to update',
});


// ─── 3. Update Settings Schema ────────────────────────────────────────────────
const updateSettingsSchema = Joi.object({
    allowedFeatures: Joi.array().items(Joi.string()).optional(),
    maxCandidates:   Joi.number().integer().min(1).optional(),
    maxExams:        Joi.number().integer().min(1).optional(),
    customDomain:    Joi.string().allow('', null).optional(),
}).min(1).messages({
    'object.min': 'At least one setting field is required',
});


// ─── 4. Upgrade Plan Schema ───────────────────────────────────────────────────
const upgradePlanSchema = Joi.object({
    plan: Joi.string().valid('free', 'basic', 'pro').required().messages({
        'any.only':    'Plan must be one of: free, basic, pro',
        'any.required': 'Plan is required',
    }),
});


module.exports = {
    validateBody,
    createTenantSchema,
    updateTenantSchema,
    updateSettingsSchema,
    upgradePlanSchema,
};
