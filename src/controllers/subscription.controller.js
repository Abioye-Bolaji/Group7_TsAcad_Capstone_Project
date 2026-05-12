const subscriptionService = require('../services/subscription.service');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @desc Subscription Controller
 * Handles subscription management endpoints
 * Scoped by tenantId from middleware
 */

class SubscriptionController {
    /**
     * GET /subscriptions/plans
     * Get all available subscription plans
     */
    async getAllPlans(req, res) {
        try {
            const plans = await subscriptionService.getAllPlans();
            return sendSuccess(res, 'Plans retrieved successfully', plans);
        } catch (error) {
            console.error('Error fetching plans:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * GET /subscriptions/plans/:planId
     * Get a specific plan
     */
    async getPlan(req, res) {
        try {
            const plan = await subscriptionService.getPlanByIdentifier(req.params.planId);

            if (!plan) {
                return sendError(res, 'Plan not found', 404);
            }

            return sendSuccess(res, 'Plan retrieved successfully', plan);
        } catch (error) {
            console.error('Error fetching plan:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * GET /subscriptions/current
     * Get tenant's current subscription
     * Scoped to req.tenantId
     */
    async getCurrentSubscription(req, res) {
        try {
            const subscription = await subscriptionService.getTenantSubscription(req.tenantId);

            if (!subscription) {
                return sendSuccess(res, 'No active subscription', null);
            }

            return sendSuccess(res, 'Subscription retrieved successfully', subscription);
        } catch (error) {
            console.error('Error fetching subscription:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * POST /subscriptions/assign
     * Assign a plan to tenant (new subscription)
     * Body: { planId, paymentMethod?, paymentProviderId? }
     * Scoped to req.tenantId
     */
    async assignPlan(req, res) {
        try {
            const { planId, paymentMethod, paymentProviderId } = req.body;

            if (!planId) {
                return sendError(res, 'planId is required', 400);
            }

            const subscription = await subscriptionService.assignPlanToTenant(
                req.tenantId,
                planId,
                {
                    paymentProvider: paymentMethod,
                    paymentProviderId,
                }
            );

            return sendSuccess(
                res,
                'Plan assigned successfully',
                subscription,
                201
            );
        } catch (error) {
            console.error('Error assigning plan:', error);
            return sendError(res, error.message, 400);
        }
    }

    /**
     * PUT /subscriptions/upgrade
     * Upgrade to a higher plan
     * Body: { planId }
     * Scoped to req.tenantId
     */
    async upgradePlan(req, res) {
        try {
            const { planId } = req.body;

            if (!planId) {
                return sendError(res, 'planId is required', 400);
            }

            const subscription = await subscriptionService.upgradePlan(req.tenantId, planId);

            return sendSuccess(res, 'Plan upgraded successfully', subscription);
        } catch (error) {
            console.error('Error upgrading plan:', error);
            return sendError(res, error.message, 400);
        }
    }

    /**
     * PUT /subscriptions/downgrade
     * Downgrade to a lower plan
     * Body: { planId }
     * Scoped to req.tenantId
     */
    async downgradePlan(req, res) {
        try {
            const { planId } = req.body;

            if (!planId) {
                return sendError(res, 'planId is required', 400);
            }

            const subscription = await subscriptionService.upgradePlan(
                req.tenantId,
                planId,
                'downgrade'
            );

            return sendSuccess(res, 'Plan downgraded successfully', subscription);
        } catch (error) {
            console.error('Error downgrading plan:', error);
            return sendError(res, error.message, 400);
        }
    }

    /**
     * POST /subscriptions/cancel
     * Cancel subscription
     * Body: { reason?, immediate? }
     * Scoped to req.tenantId
     */
    async cancelSubscription(req, res) {
        try {
            const { reason = 'user-requested', immediate = false } = req.body;

            const subscription = await subscriptionService.cancelSubscription(
                req.tenantId,
                reason,
                immediate
            );

            return sendSuccess(res, 'Subscription cancelled', subscription);
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            return sendError(res, error.message, 400);
        }
    }

    /**
     * POST /subscriptions/pause
     * Pause subscription temporarily
     * Scoped to req.tenantId
     */
    async pauseSubscription(req, res) {
        try {
            const subscription = await subscriptionService.pauseSubscription(req.tenantId);

            if (!subscription) {
                return sendError(res, 'No active subscription to pause', 404);
            }

            return sendSuccess(res, 'Subscription paused', subscription);
        } catch (error) {
            console.error('Error pausing subscription:', error);
            return sendError(res, error.message, 400);
        }
    }

    /**
     * POST /subscriptions/resume
     * Resume a paused subscription
     * Scoped to req.tenantId
     */
    async resumeSubscription(req, res) {
        try {
            const subscription = await subscriptionService.resumeSubscription(req.tenantId);

            if (!subscription) {
                return sendError(res, 'No paused subscription to resume', 404);
            }

            return sendSuccess(res, 'Subscription resumed', subscription);
        } catch (error) {
            console.error('Error resuming subscription:', error);
            return sendError(res, error.message, 400);
        }
    }

    /**
     * POST /subscriptions/renew
     * Manually trigger renewal
     * Scoped to req.tenantId
     */
    async renewSubscription(req, res) {
        try {
            const subscription = await subscriptionService.renewSubscription(req.tenantId);

            return sendSuccess(res, 'Subscription renewed successfully', subscription);
        } catch (error) {
            console.error('Error renewing subscription:', error);
            return sendError(res, error.message, 400);
        }
    }
}

module.exports = new SubscriptionController();
