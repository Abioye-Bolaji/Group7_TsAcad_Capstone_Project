const mongoose = require('mongoose');

/**
 * @desc BillingHistory Model
 * Tracks all invoices, payments, and billing events per tenant
 * Follows the tenantId contract for data isolation
 */

const billingHistorySchema = new mongoose.Schema(
    {
        //Tenant Reference
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'tenantId is required'],
            index: true,
        },

        //Invoice Details
        invoiceNumber: {
            type: String,
            required: [true, 'Invoice number is required'],
            unique: true, // Globally unique invoice number
        },

        invoiceDate: {
            type: Date,
            required: [true, 'Invoice date is required'],
            default: Date.now,
        },

        dueDate: {
            type: Date,
            required: [true, 'Due date is required'],
        },

        //Subscription Reference
        subscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subscription',
            required: [true, 'Subscription reference is required'],
        },

        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubscriptionPlan',
            required: [true, 'Plan reference is required'],
        },

        //Amount Details    
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount cannot be negative'],
        },

        currency: {
            type: String,
            default: 'NGN',
        },

        discount: {
            type: Number,
            default: 0,
            min: [0, 'Discount cannot be negative'],
        },

        tax: {
            type: Number,
            default: 0,
            min: [0, 'Tax cannot be negative'],
        },

        totalAmount: {
            type: Number,
            required: [true, 'Total amount is required'],
            min: [0, 'Total amount cannot be negative'],
        },

        //Payment Status
        status: {
            type: String,
            enum: ['draft', 'sent', 'pending', 'paid', 'failed', 'cancelled', 'refunded'],
            default: 'draft',
        },

        //Payment Information
        paymentMethod: {
            type: String,
            enum: ['paystack', 'flutterwave', 'bank-transfer', 'card', null],
            default: null,
        },

        paymentProviderId: {
            type: String, // Transaction reference from payment provider
            default: null,
        },

        paymentDate: {
            type: Date,
            default: null,
        },

        //Line Items
        description: {
            type: String,
            default: null, // e.g., "Monthly subscription - Pro Plan"
        },

        billingPeriod: {
            startDate: {
                type: Date,
                required: true,
            },
            endDate: {
                type: Date,
                required: true,
            },
        },

        //Notes & Metadata
        notes: {
            type: String,
            default: null,
        },

        reminderSent: {
            type: Boolean,
            default: false,
        },

        reminderSentDate: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Indexes for quick lookups
billingHistorySchema.index({ tenantId: 1, status: 1 });
billingHistorySchema.index({ tenantId: 1, invoiceDate: -1 });
billingHistorySchema.index({ dueDate: 1 }); // For reminder queries

module.exports = mongoose.model('BillingHistory', billingHistorySchema);
