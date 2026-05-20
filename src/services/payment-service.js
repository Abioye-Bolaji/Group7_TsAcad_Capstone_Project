const PaymentWebhook = require('../models/payment-webhook.model');
const BillingHistory = require('../models/billing-history.model');
const Subscription = require('../models/subscription.model');
const crypto = require('crypto');

/**
 * @desc payment service
 * Handles payment webhooks from Paystack and Flutterwave
 * Processes payments, updates subscriptions, and tracks billing
 */

class PaymentService {
    /**
     * Handle Paystack webhook event
     * Verify signature and process payment
     * @param {Object} payload - Webhook payload
     * @param {String} signature - X-Paystack-Signature header
     * @returns {Object} Processing result
     */
    async handlePaystackWebhook(payload, signature) {
        const secret = process.env.PAYSTACK_SECRET_KEY;

        // Verify signature
        const hash = crypto
            .createHmac('sha512', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (hash !== signature) {
            throw new Error('Invalid Paystack signature');
        }

        // Store webhook for audit trail
        const webhook = await PaymentWebhook.create({
            provider: 'paystack',
            eventType: payload.event,
            reference: payload.data?.reference || payload.data?.access_code || '',
            webhookId: payload.data?.id?.toString() || null,
            rawPayload: payload,
            status: 'received',
        });

        try {
            // Process based on event type
            let result;

            switch (payload.event) {
                case 'charge.success':
                    result = await this._handlePaystackChargeSuccess(payload.data);
                    break;
                case 'charge.failed':
                    result = await this._handlePaystackChargeFailed(payload.data);
                    break;
                case 'subscription.create':
                    result = await this._handlePaystackSubscriptionCreate(payload.data);
                    break;
                case 'subscription.disable':
                    result = await this._handlePaystackSubscriptionDisable(payload.data);
                    break;
                default:
                    result = { status: 'ignored', reason: `Event type ${payload.event} not handled` };
            }

            // Update webhook status
            await PaymentWebhook.updateOne(
                { _id: webhook._id },
                {
                    status: 'processed',
                    processedAt: new Date(),
                    tenantId: result.tenantId || null,
                }
            );

            return { success: true, webhook: webhook._id, result };
        } catch (error) {
            // Update webhook with error
            await PaymentWebhook.updateOne(
                { _id: webhook._id },
                {
                    status: 'failed',
                    error: error.message,
                    retryCount: 1,
                    nextRetryAt: new Date(Date.now() + 60 * 60 * 1000), // Retry in 1 hour
                }
            );

            throw error;
        }
    }

    /**
     * Handle Flutterwave webhook event
     * Verify signature and process payment
     * @param {Object} payload - Webhook payload
     * @param {String} signature - Veriff header
     * @returns {Object} Processing result
     */
    async handleFlutterwaveWebhook(payload, signature) {
        const secret = process.env.FLUTTERWAVE_SECRET_HASH;

        // Verify signature
        const hash = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (hash !== signature) {
            throw new Error('Invalid Flutterwave signature');
        }

        // Store webhook for audit trail
        const webhook = await PaymentWebhook.create({
            provider: 'flutterwave',
            eventType: payload.event,
            reference: payload.data?.tx_ref || payload.data?.reference || '',
            webhookId: payload.data?.id?.toString() || null,
            rawPayload: payload,
            status: 'received',
        });

        try {
            let result;

            switch (payload.event) {
                case 'charge.completed':
                    result = await this._handleFlutterwaveChargeCompleted(payload.data);
                    break;
                case 'charge.failed':
                    result = await this._handleFlutterWaveChargeFailed(payload.data);
                    break;
                default:
                    result = { status: 'ignored', reason: `Event type ${payload.event} not handled` };
            }

            // Update webhook status
            await PaymentWebhook.updateOne(
                { _id: webhook._id },
                {
                    status: 'processed',
                    processedAt: new Date(),
                    tenantId: result.tenantId || null,
                }
            );

            return { success: true, webhook: webhook._id, result };
        } catch (error) {
            // Update webhook with error
            await PaymentWebhook.updateOne(
                { _id: webhook._id },
                {
                    status: 'failed',
                    error: error.message,
                    retryCount: 1,
                    nextRetryAt: new Date(Date.now() + 60 * 60 * 1000),
                }
            );

            throw error;
        }
    }

    /**
     * Retry failed webhook processing
     * Used by background job
     * @param {String} webhookId - Webhook ID
     * @returns {Object} Retry result
     */
    async retryWebhook(webhookId) {
        const webhook = await PaymentWebhook.findById(webhookId);

        if (!webhook) {
            throw new Error('Webhook not found');
        }

        if (webhook.retryCount >= 3) {
            throw new Error('Max retries exceeded');
        }

        try {
            let result;

            if (webhook.provider === 'paystack') {
                result = await this._handlePaystackChargeSuccess(webhook.rawPayload.data);
            } else if (webhook.provider === 'flutterwave') {
                result = await this._handleFlutterwaveChargeCompleted(webhook.rawPayload.data);
            }

            await PaymentWebhook.updateOne(
                { _id: webhook._id },
                {
                    status: 'processed',
                    processedAt: new Date(),
                    retryCount: webhook.retryCount + 1,
                    tenantId: result.tenantId || null,
                }
            );

            return { success: true, result };
        } catch (error) {
            await PaymentWebhook.updateOne(
                { _id: webhook._id },
                {
                    status: 'failed',
                    error: error.message,
                    retryCount: webhook.retryCount + 1,
                    nextRetryAt: new Date(Date.now() + 60 * 60 * 1000),
                }
            );

            throw error;
        }
    }

    /**
     * Get webhook logs for debugging
     * @param {Object} filters - Status, provider, date range
     * @returns {Array} Webhook records
     */
    async getWebhookLogs(filters = {}) {
        const query = {};

        if (filters.status) query.status = filters.status;
        if (filters.provider) query.provider = filters.provider;

        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
            if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
        }

        return await PaymentWebhook.find(query)
            .sort({ createdAt: -1 })
            .limit(filters.limit || 50)
            .lean();
    }

    // ─── PRIVATE PAYSTACK HANDLERS ────────────────────────────────

    /**
     * Handle Paystack charge success
     * @private
     */
    async _handlePaystackChargeSuccess(data) {
        const { reference, amount, customer } = data;

        // Find billing record by payment provider ID
        const billing = await BillingHistory.findOne({
            paymentProviderId: reference,
        });

        if (!billing) {
            throw new Error(`Invoice not found for reference: ${reference}`);
        }

        // Update billing status
        await BillingHistory.updateOne(
            { _id: billing._id },
            {
                status: 'paid',
                paymentDate: new Date(),
                paymentMethod: 'paystack',
            }
        );

        // Update subscription status if needed
        if (billing.subscriptionId) {
            const subscription = await Subscription.findById(billing.subscriptionId);
            if (subscription && subscription.status === 'paused') {
                // Resume if it was paused due to non-payment
                await Subscription.updateOne(
                    { _id: subscription._id },
                    { status: 'active' }
                );
            }
        }

        return {
            status: 'success',
            tenantId: billing.tenantId,
            reference,
            amount,
        };
    }

    /**
     * Handle Paystack charge failed
     * @private
     */
    async _handlePaystackChargeFailed(data) {
        const { reference } = data;

        const billing = await BillingHistory.findOne({
            paymentProviderId: reference,
        });

        if (!billing) {
            throw new Error(`Invoice not found for reference: ${reference}`);
        }

        await BillingHistory.updateOne(
            { _id: billing._id },
            {
                status: 'failed',
            }
        );

        return {
            status: 'failed',
            tenantId: billing.tenantId,
            reference,
        };
    }

    /**
     * Handle Paystack subscription created
     * @private
     */
    async _handlePaystackSubscriptionCreate(data) {
        const { subscription, customer } = data;
        // Implementation depends on your subscription workflow
        return { status: 'logged', type: 'subscription.create' };
    }

    /**
     * Handle Paystack subscription disabled
     * @private
     */
    async _handlePaystackSubscriptionDisable(data) {
        const { subscription } = data;
        // Implementation depends on your subscription workflow
        return { status: 'logged', type: 'subscription.disable' };
    }

    // ─── PRIVATE FLUTTERWAVE HANDLERS ────────────────────────────

    /**
     * Handle Flutterwave charge completed
     * @private
     */
    async _handleFlutterwaveChargeCompleted(data) {
        const { id, tx_ref, amount_settled, status } = data;

        if (status !== 'successful') {
            throw new Error('Payment status is not successful');
        }

        // Find billing record by payment provider ID
        const billing = await BillingHistory.findOne({
            paymentProviderId: tx_ref,
        });

        if (!billing) {
            throw new Error(`Invoice not found for reference: ${tx_ref}`);
        }

        // Update billing status
        await BillingHistory.updateOne(
            { _id: billing._id },
            {
                status: 'paid',
                paymentDate: new Date(),
                paymentMethod: 'flutterwave',
            }
        );

        // Update subscription status if needed
        if (billing.subscriptionId) {
            const subscription = await Subscription.findById(billing.subscriptionId);
            if (subscription && subscription.status === 'paused') {
                await Subscription.updateOne(
                    { _id: subscription._id },
                    { status: 'active' }
                );
            }
        }

        return {
            status: 'success',
            tenantId: billing.tenantId,
            reference: tx_ref,
            amount: amount_settled,
        };
    }

    /**
     * Handle Flutterwave charge failed
     * @private
     */
    async _handleFlutterWaveChargeFailed(data) {
        const { tx_ref } = data;

        const billing = await BillingHistory.findOne({
            paymentProviderId: tx_ref,
        });

        if (!billing) {
            throw new Error(`Invoice not found for reference: ${tx_ref}`);
        }

        await BillingHistory.updateOne(
            { _id: billing._id },
            { status: 'failed' }
        );

        return {
            status: 'failed',
            tenantId: billing.tenantId,
            reference: tx_ref,
        };
    }
}

module.exports = new PaymentService();
