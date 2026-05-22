const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @desc payement-webhook routes
 * Webhook endpoints for payment providers
 * Logging and debugging endpoints for super admin
 */

//WEBHOOK ENDPOINTS
// No authentication required - verified by signature

/**
 * POST /webhooks/paystack
 * Receive Paystack webhook events
 * Header required: X-Paystack-Signature
 */
router.post('/paystack', paymentController.handlePaystackWebhook);

/**
 * POST /webhooks/flutterwave
 * Receive Flutterwave webhook events
 * Header required: veriff
 */
router.post('/flutterwave', paymentController.handleFlutterwaveWebhook);

//DEBUG / ADMIN ENDPOINTS

/**
 * GET /webhooks/logs
 * Get webhook logs for debugging
 * Super Admin only
 * Query: status, provider, limit, startDate, endDate
 */
router.get(
    '/logs',
    authMiddleware,
    paymentController.getWebhookLogs
);

/**
 * POST /webhooks/retry/:webhookId
 * Manually retry failed webhook
 * Super Admin only
 */
router.post(
    '/retry/:webhookId',
    authMiddleware,
    paymentController.retryWebhook
);

module.exports = router;
