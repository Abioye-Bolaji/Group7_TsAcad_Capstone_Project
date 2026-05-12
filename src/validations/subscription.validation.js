const Joi = require('joi');

/**
 * @desc Subscription Validation Schemas
 * Validates request bodies for subscription endpoints
 */

const subscriptionValidation = {
    /**
     * Assign plan to tenant
     */
    assignPlan: Joi.object({
        planId: Joi.string().required().messages({
            'string.empty': 'planId is required',
            'any.required': 'planId is required',
        }),
        paymentMethod: Joi.string()
            .valid('paystack', 'flutterwave')
            .optional(),
        paymentProviderId: Joi.string().optional(),
    }),

    /**
     * Upgrade/Downgrade plan
     */
    upgradePlan: Joi.object({
        planId: Joi.string().required().messages({
            'string.empty': 'planId is required',
            'any.required': 'planId is required',
        }),
    }),

    /**
     * Cancel subscription
     */
    cancelSubscription: Joi.object({
        reason: Joi.string()
            .max(500)
            .optional(),
        immediate: Joi.boolean().optional().default(false),
    }),

    /**
     * Query filters for billing history
     */
    billingHistoryFilters: Joi.object({
        status: Joi.string()
            .valid('draft', 'sent', 'pending', 'paid', 'failed', 'cancelled', 'refunded')
            .optional(),
        limit: Joi.number().integer().min(1).max(100).optional().default(10),
        skip: Joi.number().integer().min(0).optional().default(0),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
    }),

    /**
     * Update tenant usage (Super Admin)
     */
    updateTenantUsage: Joi.object({
        tenantId: Joi.string().required(),
        activeCandidates: Joi.number().integer().min(0).optional(),
        storageGB: Joi.number().min(0).optional(),
    }),

    /**
     * Webhook logs filter
     */
    webhookLogsFilter: Joi.object({
        status: Joi.string()
            .valid('received', 'processing', 'processed', 'failed', 'skipped')
            .optional(),
        provider: Joi.string()
            .valid('paystack', 'flutterwave')
            .optional(),
        limit: Joi.number().integer().min(1).max(100).optional().default(50),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
    }),
};

/**
 * Validation middleware creator
 */
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(
            req.body || req.query,
            {
                abortEarly: false,
                stripUnknown: true,
            }
        );

        if (error) {
            const messages = error.details
                .map((detail) => detail.message)
                .join(', ');
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.details,
            });
        }

        req.validatedData = value;
        next();
    };
};

module.exports = {
    subscriptionValidation,
    validateRequest,
};
