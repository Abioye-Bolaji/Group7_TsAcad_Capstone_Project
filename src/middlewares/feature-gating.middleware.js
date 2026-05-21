const Subscription = require('../models/subscription.model');
const billingService = require('../services/billing.service');
const { sendError } = require('../utils/response');

/**
 * @desc Feature Gating Middleware
 * Checks if the current tenant's plan allows the requested feature
 * Blocks features based on subscription plan limits
 */

const featureGatingMiddleware = (requiredFeature, requiredCheck = null) => {
    return async (req, res, next) => {
        try {
            // Skip for super admin
            if (req.user?.role === 'super_admin') {
                return next();
            }

            // Must have tenantId (from tenant middleware)
            if (!req.tenantId) {
                return sendError(res, 'Tenant context not found', 403);
            }

            // Get tenant's subscription
            const subscription = await Subscription.findOne({
                tenantId: req.tenantId,
                status: 'active',
            }).populate('planId');

            // No active subscription
            if (!subscription) {
                return sendError(
                    res,
                    'No active subscription. Please upgrade your plan.',
                    403
                );
            }

            const plan = subscription.planId;
            const features = plan.features;

            // Check 1: Basic feature availability in plan
            if (requiredFeature && !features.allowedFeatures.includes(requiredFeature)) {
                return sendError(
                    res,
                    `Feature '${requiredFeature}' is not available on your ${plan.name} plan. Please upgrade.`,
                    403
                );
            }

            // Check 2: Custom validation (e.g., usage limits)
            if (requiredCheck) {
                const checkResult = await requiredCheck(req, subscription, features);

                if (!checkResult.allowed) {
                    return sendError(res, checkResult.message, 403);
                }
            }

            // Store subscription and plan info on req for use in controllers
            req.subscription = subscription;
            req.subscriptionPlan = plan;

            next();
        } catch (error) {
            console.error('Feature gating middleware error:', error);
            return sendError(res, 'Error checking feature access', 500);
        }
    };
};

/**
 * Predefined feature check functions
 */

/**
 * Check active candidates limit
 */
const checkActiveCandidatesLimit = async (req, subscription, features) => {
    const usage = await billingService.getUsageTracking(req.tenantId);

    if (usage.activeCandidates.count >= features.maxActiveCandidates) {
        return {
            allowed: false,
            message: `Active candidates limit (${features.maxActiveCandidates}) reached. Please upgrade your plan or deactivate some candidates.`,
        };
    }

    return { allowed: true };
};

/**
 * Check exams per month limit
 */
const checkExamsPerMonthLimit = async (req, subscription, features) => {
    const usage = await billingService.getUsageTracking(req.tenantId);

    if (usage.examsRunThisMonth.count >= features.maxExamsPerMonth) {
        return {
            allowed: false,
            message: `Monthly exam limit (${features.maxExamsPerMonth}) reached. Please upgrade your plan or wait for the next month.`,
        };
    }

    return { allowed: true };
};

/**
 * Check storage limit
 */
const checkStorageLimit = async (req, subscription, features) => {
    const usage = await billingService.getUsageTracking(req.tenantId);

    if (usage.storageUsedGB >= features.maxStorageGB) {
        return {
            allowed: false,
            message: `Storage limit (${features.maxStorageGB} GB) reached. Please upgrade your plan or delete old data.`,
        };
    }

    return { allowed: true };
};

/**
 * Check API access available
 */
const checkApiAccess = async (req, subscription, features) => {
    if (!features.apiAccess) {
        return {
            allowed: false,
            message: 'API access is not available on your plan. Please upgrade to a higher tier.',
        };
    }

    return { allowed: true };
};

/**
 * Check advanced reporting available
 */
const checkAdvancedReporting = async (req, subscription, features) => {
    if (!features.advancedReporting) {
        return {
            allowed: false,
            message: 'Advanced reporting is not available on your plan. Please upgrade to Pro.',
        };
    }

    return { allowed: true };
};

/**
 * Check custom domain available
 */
const checkCustomDomain = async (req, subscription, features) => {
    if (!features.customBranding) {
        return {
            allowed: false,
            message: 'Custom domain/branding is not available on your plan. Please upgrade to Pro.',
        };
    }

    return { allowed: true };
};

/**
 * Check SSO available
 */
const checkSingleSignOn = async (req, subscription, features) => {
    if (!features.singleSignOn) {
        return {
            allowed: false,
            message: 'Single Sign-On is not available on your plan. Please upgrade to Pro.',
        };
    }

    return { allowed: true };
};

/**
 * Middleware to gate by plan name
 */
const requirePlan = (planNames) => {
    // Ensure planNames is an array
    const plans = Array.isArray(planNames) ? planNames : [planNames];

    return async (req, res, next) => {
        try {
            if (req.user?.role === 'super_admin') {
                return next();
            }

            const subscription = await Subscription.findOne({
                tenantId: req.tenantId,
                status: 'active',
            }).populate('planId');

            if (!subscription) {
                return sendError(res, 'No active subscription found', 403);
            }

            if (!plans.includes(subscription.planId.slug)) {
                const requiredPlan = plans.join(' or ');
                return sendError(
                    res,
                    `This feature requires ${requiredPlan} plan or higher. Your current plan: ${subscription.planId.slug}`,
                    403
                );
            }

            req.subscription = subscription;
            req.subscriptionPlan = subscription.planId;

            next();
        } catch (error) {
            console.error('Plan requirement middleware error:', error);
            return sendError(res, 'Error checking plan requirement', 500);
        }
    };
};

module.exports = {
    featureGatingMiddleware,
    requirePlan,
    // Predefined checks
    checkActiveCandidatesLimit,
    checkExamsPerMonthLimit,
    checkStorageLimit,
    checkApiAccess,
    checkAdvancedReporting,
    checkCustomDomain,
    checkSingleSignOn,
};
