const mongoose = require('mongoose');

/**
 * @desc SubscriptionPlan Model
 * Defines the available subscription plans (Free, Basic, Pro)
 * These are global, shared across all tenants
 */

const subscriptionPlanSchema = new mongoose.Schema(
    {
        //Plan Identity
        name: {
            type: String,
            enum: ['Free', 'Basic', 'Pro'],
            required: [true, 'Plan name is required'],
            unique: true,
        },

        slug: {
            type: String,
            enum: ['free', 'basic', 'pro'],
            required: [true, 'Plan slug is required'],
            unique: true,
            lowercase: true,
        },

        description: {
            type: String,
            default: null,
        },

        // Pricing
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },

        currency: {
            type: String,
            default: 'NGN', // Nigerian Naira
        },

        billingCycle: {
            type: String,
            enum: ['monthly', 'yearly', 'one-time'],
            default: 'monthly',
        },

        // Feature Limits
        features: {
            maxActiveCandidates: {
                type: Number,
                required: true,
                min: [1, 'Max candidates must be at least 1'],
            },
            maxExamsPerMonth: {
                type: Number,
                required: true,
                min: [1, 'Max exams must be at least 1'],
            },
            maxStorageGB: {
                type: Number,
                required: true,
                min: [0.1, 'Max storage must be at least 0.1 GB'],
            },
            // Feature flags for plan
            allowedFeatures: {
                type: [String],
                default: [],
                // Examples: 'exam-setup', 'candidate-management', 'results-analytics', 'api-access', 'custom-domain'
            },
            advancedReporting: {
                type: Boolean,
                default: false,
            },
            customBranding: {
                type: Boolean,
                default: false,
            },
            apiAccess: {
                type: Boolean,
                default: false,
            },
            prioritySupport: {
                type: Boolean,
                default: false,
            },
            singleSignOn: {
                type: Boolean,
                default: false,
            },
        },

        // Metadata
        isActive: {
            type: Boolean,
            default: true,
        },

        displayOrder: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
