const express = require('express');
const subscriptionController = require('../controllers/subscription.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { subscriptionValidation, validateRequest } = require('../validations/subscription.validation');


const router = express.Router();

/**
 * @desc Subscription Routes
 * All routes scoped by tenantId from tenant middleware
 */

//PUBLIC PLAN ROUTES

/**
 * GET /subscriptions/plans
 * Get all available plans
 * Public - no auth required
 */
router.get('/plans', subscriptionController.getAllPlans);

/**
 * GET /subscriptions/plans/:planId
 * Get specific plan details
 * Public - no auth required
 */
router.get('/plans/:planId', subscriptionController.getPlan);

//PROTECTED SUBSCRIPTION ROUTES

/**
 * GET /subscriptions/current
 * Get tenant's current subscription
 * Auth required, scoped to tenantId
 */
router.get(
    '/current',
    authMiddleware,
    tenantMiddleware,
    subscriptionController.getCurrentSubscription
);

/**
 * POST /subscriptions/assign
 * Assign a plan to tenant (new subscription)
 * Auth required, scoped to tenantId
 * Body: { planId, paymentMethod?, paymentProviderId? }
 */
router.post(
    '/assign',
    authMiddleware,
    tenantMiddleware,
    validateRequest(subscriptionValidation.assignPlan),
    subscriptionController.assignPlan
);

/**
 * PUT /subscriptions/upgrade
 * Upgrade to higher plan
 * Auth required, scoped to tenantId
 * Body: { planId }
 */
router.put(
    '/upgrade',
    authMiddleware,
    tenantMiddleware,
    validateRequest(subscriptionValidation.upgradePlan),
    subscriptionController.upgradePlan
);

/**
 * PUT /subscriptions/downgrade
 * Downgrade to lower plan
 * Auth required, scoped to tenantId
 * Body: { planId }
 */
router.put(
    '/downgrade',
    authMiddleware,
    tenantMiddleware,
    validateRequest(subscriptionValidation.upgradePlan),
    subscriptionController.downgradePlan
);

/**
 * POST /subscriptions/cancel
 * Cancel subscription
 * Auth required, scoped to tenantId
 * Body: { reason?, immediate? }
 */
router.post(
    '/cancel',
    authMiddleware,
    tenantMiddleware,
    validateRequest(subscriptionValidation.cancelSubscription),
    subscriptionController.cancelSubscription
);

/**
 * POST /subscriptions/pause
 * Pause subscription
 * Auth required, scoped to tenantId
 */
router.post(
    '/pause',
    authMiddleware,
    tenantMiddleware,
    subscriptionController.pauseSubscription
);

/**
 * POST /subscriptions/resume
 * Resume paused subscription
 * Auth required, scoped to tenantId
 */
router.post(
    '/resume',
    authMiddleware,
    tenantMiddleware,
    subscriptionController.resumeSubscription
);

/**
 * POST /subscriptions/renew
 * Manually trigger renewal
 * Auth required, scoped to tenantId
 */
router.post(
    '/renew',
    authMiddleware,
    tenantMiddleware,
    subscriptionController.renewSubscription
);

module.exports = router;
