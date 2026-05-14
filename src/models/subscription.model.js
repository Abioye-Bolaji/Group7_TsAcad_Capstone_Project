const mongoose = require('mongoose');

/**
 * @desc Subscription Model
 * Tracks which plan each tenant is on and subscription lifecycle
 * Follows the tenantId contract for data isolation
 */

const subscriptionSchema = new mongoose.Schema(
    {
        //Tenant Reference
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'tenantId is required'],
            unique: true, // One active subscription per tenant
            index: true,
        },

        //Plan Reference
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubscriptionPlan',
            required: [true, 'Plan is required'],
        },

        //Subscription Status
        status: {
            type: String,
            enum: ['active', 'paused', 'expired', 'cancelled'],
            default: 'active',
        },

        //Billing Dates
        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
            default: Date.now,
        },

        endDate: {
            type: Date,
            required: [true, 'End date is required'],
        },

        renewalDate: {
            type: Date,
            default: null,
        },

        //Payment Reference
        paymentProviderId: {
            type: String, // e.g., Paystack subscription ID
            default: null,
        },

        paymentProvider: {
            type: String,
            enum: ['paystack', 'flutterwave', 'manual', null],
            default: null,
        },

        //Pricing at time of subscription
        planPrice: {
            type: Number,
            required: true,
        },

        currency: {
            type: String,
            default: 'NGN',
        },

        //Auto-renewal
        autoRenew: {
            type: Boolean,
            default: true,
        },

        //Metadata
        downgradedFromPlanId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubscriptionPlan',
            default: null,
        },

        upgradedToPlanId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubscriptionPlan',
            default: null,
        },

        notes: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

// Index for quick lookups
subscriptionSchema.index({ tenantId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 }); // For expiry checks

module.exports = mongoose.model('Subscription', subscriptionSchema);
