const mongoose = require('mongoose');

/**
 * @desc payment.webhook model
 * Logs all webhook events from payment providers (Paystack, Flutterwave)
 * Used for debugging, audit trail, and handling retries
 */

const paymentWebhookSchema = new mongoose.Schema(
    {
        //Webhook Metadata
        provider: {
            type: String,
            enum: ['paystack', 'flutterwave'],
            required: [true, 'Provider is required'],
        },

        eventType: {
            type: String,
            required: [true, 'Event type is required'],
            // e.g., 'charge.success', 'charge.failed', 'subscription.create', etc.
        },

        //Event Data
        reference: {
            type: String,
            required: [true, 'Reference is required'],
            index: true,
        },

        webhookId: {
            type: String,
            default: null,
        },

        rawPayload: {
            type: mongoose.Schema.Types.Mixed,
            required: true, // Store the entire webhook payload
        },

        //Tenant Association
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            default: null,
            index: true,
        },

        //Processing Status
        status: {
            type: String,
            enum: ['received', 'processing', 'processed', 'failed', 'skipped'],
            default: 'received',
        },

        processedAt: {
            type: Date,
            default: null,
        },

        error: {
            type: String,
            default: null,
        },

        //Retry Tracking
        retryCount: {
            type: Number,
            default: 0,
            min: 0,
        },

        nextRetryAt: {
            type: Date,
            default: null,
        },

        // Idempotency Key for ensuring webhook events are processed only once
        idempotencyKey: {
            type: String,
            unique: true,
            sparse: true, // Allow multiple null values
        },
    },
    { timestamps: true }
);

// Indexes for quick lookups
paymentWebhookSchema.index({ provider: 1, eventType: 1 });
paymentWebhookSchema.index({ status: 1, createdAt: -1 });
paymentWebhookSchema.index({ nextRetryAt: 1 }); // For retry jobs

module.exports = mongoose.model('PaymentWebhook', paymentWebhookSchema);
