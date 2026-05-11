const Joi = require('joi');

/**
 * @desc Validation schemas for Candidate Management routes.
 * Uses Joi for consistent, declarative input validation.
 * All validation errors are formatted to match the team's error envelope.
 *
 * Author: ainaseyim@gmail.com
 */

// ─── Reusable Validation Helper ───────────────────────────────────────────────
// Same helper pattern as tenant.validation.js for consistency across modules.

const validateBody = (schema, body) => {
    const { error } = schema.validate(body, { abortEarly: false });
    if (!error) return null;

    return error.details.map((d) => ({
        field:   d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
    }));
};


// ─── 1. Create Single Candidate ───────────────────────────────────────────────
const createCandidateSchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        'string.min':   'Name must be at least 2 characters',
        'string.max':   'Name cannot exceed 100 characters',
        'any.required': 'Candidate name is required',
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
    }),
    phone:           Joi.string().allow('', null).optional(),
    idNumber:        Joi.string().allowed('', null).optional().messages({
        'any.required': 'Candidate ID/Matriculation number is required',
    }),
    profilePhotoUrl: Joi.string().uri().allow('', null).optional().messages({
        'string.uri': 'Profile photo must be a valid URL',
    }),
    password: Joi.string().min(6).optional().messages({
        'string.min': 'Password must be at least 6 characters',
    }),
    groupIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
});


// ─── 2. Update Candidate ──────────────────────────────────────────────────────
const updateCandidateSchema = Joi.object({
    name:            Joi.string().min(2).max(100).optional(),
    phone:           Joi.string().allow('', null).optional(),
    idNumber:        Joi.string().allow('', null).optional(),
    profilePhotoUrl: Joi.string().uri().allow('', null).optional(),
}).min(1).messages({
    'object.min': 'At least one field is required to update',
});


// ─── 3. Update Candidate Status ───────────────────────────────────────────────
const updateStatusSchema = Joi.object({
    status: Joi.string().valid('active', 'inactive', 'suspended').required().messages({
        'any.only':     'Status must be active, inactive, or suspended',
        'any.required': 'Status is required',
    }),
});


// ─── 4. Create Group ─────────────────────────────────────────────────────────
const createGroupSchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        'string.min':   'Group name must be at least 2 characters',
        'string.max':   'Group name cannot exceed 100 characters',
        'any.required': 'Group name is required',
    }),
    description:  Joi.string().allow('', null).optional(),
    candidateIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
});


// ─── 5. Update Group ─────────────────────────────────────────────────────────
const updateGroupSchema = Joi.object({
    name:        Joi.string().min(2).max(100).optional(),
    description: Joi.string().allow('', null).optional(),
}).min(1).messages({
    'object.min': 'At least one field is required to update',
});


// ─── 6. Add / Remove Candidates from Group ───────────────────────────────────
const candidateIdsSchema = Joi.object({
    candidateIds: Joi.array()
        .items(Joi.string().hex().length(24))
        .min(1)
        .required()
        .messages({
            'array.min':    'At least one candidate ID is required',
            'any.required': 'candidateIds array is required',
        }),
});


// ─── 7. PIN Login ─────────────────────────────────────────────────────────────
const pinLoginSchema = Joi.object({
    idNumber: Joi.string().required().messages({
        'any.required': 'ID number is required',
    }),
    accessPin: Joi.string().length(6).pattern(/^\d+$/).required().messages({
        'string.length':       'Access PIN must be exactly 6 digits',
        'string.pattern.base': 'Access PIN must contain digits only',
        'any.required':        'Access PIN is required',
    }),
});

module.exports = {
    validateBody,
    createCandidateSchema,
    updateCandidateSchema,
    updateStatusSchema,
    createGroupSchema,
    updateGroupSchema,
    candidateIdsSchema,
    pinLoginSchema,
};