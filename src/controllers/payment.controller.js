const paymentService = require('../services/payment-service');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @desc payment controller
 * Handles payment webhooks from Paystack and Flutterwave
 * No auth required - verified by signature
 */

class PaymentWebhookController {
    /**
     * POST /webhooks/paystack
     * Paystack webhook endpoint
     * Header: X-Paystack-Signature
     */
    async handlePaystackWebhook(req, res) {
        try {
            const signature = req.headers['x-paystack-signature'];

            if (!signature) {
                return sendError(res, 'Webhook signature missing', 400);
            }

            const result = await paymentService.handlePaystackWebhook(
                req.body,
                signature
            );

            // Always return 200 to acknowledge receipt
            return sendSuccess(res, 'Webhook processed', { webhookId: result.webhook });
        } catch (error) {
            console.error('Paystack webhook error:', error);

            // Still return 200 to prevent retries, but log the error
            return sendSuccess(res, 'Webhook received', {
                error: error.message,
            });
        }
    }

    /**
     * POST /webhooks/flutterwave
     * Flutterwave webhook endpoint
     * Header: veriff
     */
    async handleFlutterwaveWebhook(req, res) {
        try {
            const signature = req.headers.veriff;

            if (!signature) {
                return sendError(res, 'Webhook signature missing', 400);
            }

            const result = await paymentService.handleFlutterwaveWebhook(
                req.body,
                signature
            );

            // Always return 200 to acknowledge receipt
            return sendSuccess(res, 'Webhook processed', { webhookId: result.webhook });
        } catch (error) {
            console.error('Flutterwave webhook error:', error);

            // Still return 200 to prevent retries
            return sendSuccess(res, 'Webhook received', {
                error: error.message,
            });
        }
    }

    /**
     * GET /webhooks/logs
     * Get webhook logs for debugging (Super Admin only)
     * Query params: status, provider, limit, startDate, endDate
     */
    async getWebhookLogs(req, res) {
        try {
            if (req.user?.role !== 'super_admin') {
                return sendError(res, 'Only super admins can access this endpoint', 403);
            }

            const {
                status = null,
                provider = null,
                limit = 50,
                startDate = null,
                endDate = null,
            } = req.query;

            const logs = await paymentService.getWebhookLogs({
                status,
                provider,
                limit: parseInt(limit),
                startDate,
                endDate,
            });

            return sendSuccess(res, 'Webhook logs retrieved', logs);
        } catch (error) {
            console.error('Error fetching webhook logs:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * POST /webhooks/retry/:webhookId
     * Retry failed webhook processing (Super Admin only)
     */
    async retryWebhook(req, res) {
        try {
            if (req.user?.role !== 'super_admin') {
                return sendError(res, 'Only super admins can access this endpoint', 403);
            }

            const result = await paymentService.retryWebhook(req.params.webhookId);

            return sendSuccess(res, 'Webhook retry completed', result);
        } catch (error) {
            console.error('Error retrying webhook:', error);
            return sendError(res, error.message, 400);
        }
    }
}

module.exports = new PaymentWebhookController();
