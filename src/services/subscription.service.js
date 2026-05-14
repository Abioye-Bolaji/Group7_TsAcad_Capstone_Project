const Subscription = require('../models/subscription.model');
const SubscriptionPlan = require('../models/subscription-plan.model');
const BillingHistory = require('../models/billing-history.model');
const UsageTracking = require('../models/usage-tracking.model');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc Subscription Service
 * Handles all subscription-related business logic
 * Follows the tenantId contract for data isolation
 */

class SubscriptionService {
    /**
     * Get all available plans
     * @returns {Array} List of all active subscription plans
     */
    async getAllPlans() {
        return await SubscriptionPlan.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
    }

    /**
     * Get plan by ID or slug
     * @param {String} identifier - Plan ID or slug
     * @returns {Object} Plan details
     */
    async getPlanByIdentifier(identifier) {
        return await SubscriptionPlan.findOne({
            $or: [{ _id: identifier }, { slug: identifier }],
        }).lean();
    }

    /**
     * Get tenant's current subscription
     * Scoped by tenantId
     * @param {String} tenantId - Tenant ID
     * @returns {Object} Subscription details with plan info
     */
    async getTenantSubscription(tenantId) {
        return await Subscription.findOne({ tenantId })
            .populate('planId', '-__v')
            .lean();
    }

    /**
     * Assign a plan to a tenant
     * Creates new subscription and starts billing
     * @param {String} tenantId - Tenant ID
     * @param {String} planId - Plan ID
     * @param {Object} options - Additional options (paymentMethod, paymentProviderId, etc.)
     * @returns {Object} Created subscription
     * @throws {Error} If validation fails or database error
     */
    async assignPlanToTenant(tenantId, planId, options = {}) {
        try {
            // Validate inputs
            if (!tenantId) {
                throw new Error('tenantId is required');
            }
            if (!planId) {
                throw new Error('planId is required');
            }

            // Verify plan exists
            const plan = await SubscriptionPlan.findById(planId);
            if (!plan) {
                throw new Error('Subscription plan not found');
            }

            // Check if tenant already has an active subscription
            const existingSubscription = await Subscription.findOne({
                tenantId,
                status: { $in: ['active', 'paused'] },
            });

            if (existingSubscription) {
                throw new Error('Tenant already has an active subscription');
            }

            // Calculate dates
            const startDate = new Date();
            const endDate = this._calculateEndDate(startDate, plan.billingCycle);

            // Create subscription
            const subscription = await Subscription.create({
                tenantId,
                planId,
                status: 'active',
                startDate,
                endDate,
                planPrice: plan.price,
                currency: plan.currency,
                autoRenew: options.autoRenew ?? true,
                paymentProvider: options.paymentProvider || null,
                paymentProviderId: options.paymentProviderId || null,
                notes: options.notes || null,
            });

            // Create initial usage tracking record
            await this._initializeUsageTracking(tenantId);

            // Generate first invoice
            await this._generateInvoice(subscription, plan, startDate, endDate);

            return subscription.populate('planId', '-__v');
        } catch (error) {
            throw new Error(`Failed to assign plan to tenant: ${error.message}`);
        }
    }

    /**
     * Upgrade/Downgrade tenant's subscription plan
     * Prorates the price if needed
     * @param {String} tenantId - Tenant ID
     * @param {String} newPlanId - New plan ID
     * @param {String} reason - Upgrade or downgrade reason
     * @returns {Object} Updated subscription
     * @throws {Error} If validation fails or database error
     */
    async upgradePlan(tenantId, newPlanId, reason = 'manual') {
        try {
            // Validate inputs
            if (!tenantId) {
                throw new Error('tenantId is required');
            }
            if (!newPlanId) {
                throw new Error('newPlanId is required');
            }

            const currentSubscription = await Subscription.findOne({ tenantId });
            if (!currentSubscription) {
                throw new Error('No active subscription found for tenant');
            }

            const newPlan = await SubscriptionPlan.findById(newPlanId);
            if (!newPlan) {
                throw new Error('New subscription plan not found');
            }

            // Store previous plan info
            const previousPlanId = currentSubscription.planId;

            // Update subscription
            const updatedSubscription = await Subscription.findByIdAndUpdate(
                currentSubscription._id,
                {
                    planId: newPlanId,
                    planPrice: newPlan.price,
                    upgradedToPlanId: newPlanId,
                    notes: `${reason} - ${new Date().toISOString()}`,
                },
                { new: true, runValidators: true }
            ).populate('planId', '-__v');

            // Generate adjustment invoice for prorated amount
            await this._generateUpgradeInvoice(
                updatedSubscription,
                previousPlanId,
                newPlan,
                currentSubscription.planPrice
            );

            return updatedSubscription;
        } catch (error) {
            throw new Error(`Failed to upgrade plan: ${error.message}`);
        }
    }

    /**
     * Cancel a subscription
     * @param {String} tenantId - Tenant ID
     * @param {String} reason - Cancellation reason
     * @param {Boolean} immediate - Cancel immediately or at end of billing cycle
     * @returns {Object} Cancelled subscription
     * @throws {Error} If validation fails or database error
     */
    async cancelSubscription(tenantId, reason = 'user-requested', immediate = false) {
        try {
            // Validate input
            if (!tenantId) {
                throw new Error('tenantId is required');
            }

            const subscription = await Subscription.findOne({ tenantId });
            if (!subscription) {
                throw new Error('No active subscription found for tenant');
            }

            if (!immediate) {
                // Cancel at end of billing cycle
                return await Subscription.findByIdAndUpdate(
                    subscription._id,
                    {
                        status: 'cancelled',
                        autoRenew: false,
                        notes: `Scheduled cancellation: ${reason}`,
                    },
                    { new: true }
                ).populate('planId', '-__v');
            }

            // Immediate cancellation with refund processing
            const refundedSubscription = await Subscription.findByIdAndUpdate(
                subscription._id,
                {
                    status: 'cancelled',
                    notes: `Immediate cancellation: ${reason}`,
                },
                { new: true }
            );

            // Generate refund invoice
            await this._generateRefundInvoice(refundedSubscription);

            return refundedSubscription.populate('planId', '-__v');
        } catch (error) {
            throw new Error(`Failed to cancel subscription: ${error.message}`);
        }
    }

    /**
     * Renew expiring subscription
     * @param {String} tenantId - Tenant ID
     * @returns {Object} Renewed subscription
     * @throws {Error} If validation fails or database error
     */
    async renewSubscription(tenantId) {
        try {
            // Validate input
            if (!tenantId) {
                throw new Error('tenantId is required');
            }

            const subscription = await Subscription.findOne({
                tenantId,
                status: { $in: ['active', 'expired'] },
            });

            if (!subscription) {
                throw new Error('No subscription found for renewal');
            }

            const plan = await SubscriptionPlan.findById(subscription.planId);
            if (!plan) {
                throw new Error('Subscription plan data is invalid');
            }

            const newStartDate = subscription.endDate;
            const newEndDate = this._calculateEndDate(newStartDate, plan.billingCycle);

            const renewedSubscription = await Subscription.findByIdAndUpdate(
                subscription._id,
                {
                    status: 'active',
                    startDate: newStartDate,
                    endDate: newEndDate,
                    renewalDate: new Date(),
                },
                { new: true, runValidators: true }
            ).populate('planId', '-__v');

            // Generate renewal invoice
            await this._generateInvoice(renewedSubscription, plan, newStartDate, newEndDate);

            return renewedSubscription;
        } catch (error) {
            throw new Error(`Failed to renew subscription: ${error.message}`);
        }
    }

    /**
     * Pause a subscription temporarily
     * @param {String} tenantId - Tenant ID
     * @returns {Object} Paused subscription
     */
    async pauseSubscription(tenantId) {
        return await Subscription.findOneAndUpdate(
            { tenantId },
            { status: 'paused' },
            { new: true }
        ).populate('planId', '-__v');
    }

    /**
     * Resume a paused subscription
     * @param {String} tenantId - Tenant ID
     * @returns {Object} Active subscription
     */
    async resumeSubscription(tenantId) {
        return await Subscription.findOneAndUpdate(
            { tenantId },
            { status: 'active' },
            { new: true }
        ).populate('planId', '-__v');
    }

    // ─── PRIVATE HELPER METHODS ──────────────────────────────────

    /**
     * Calculate end date based on billing cycle
     * @private
     */
    _calculateEndDate(startDate, billingCycle) {
        const endDate = new Date(startDate);

        if (billingCycle === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else if (billingCycle === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }
        // For 'one-time', no automatic renewal

        return endDate;
    }

    /**
     * Initialize usage tracking for a new tenant
     * @private
     * @param {String} tenantId - Tenant ID
     * @throws {Error} If database error
     */
    async _initializeUsageTracking(tenantId) {
        try {
            const existingTracking = await UsageTracking.findOne({ tenantId });

            if (!existingTracking) {
                await UsageTracking.create({
                    tenantId,
                    activeCandidates: { count: 0 },
                    examsRunThisMonth: { count: 0, monthYear: this._getMonthYear() },
                    totalExamsAllTime: 0,
                    storageUsedGB: 0,
                    apiCallsThisMonth: { count: 0, monthYear: this._getMonthYear() },
                });
            }
        } catch (error) {
            console.error(`Failed to initialize usage tracking for tenant ${tenantId}:`, error.message);
            throw new Error(`Failed to initialize usage tracking: ${error.message}`);
        }
    }

    /**
     * Generate invoice for subscription
     * @private
     * @param {Object} subscription - Subscription object
     * @param {Object} plan - Plan object
     * @param {Date} startDate - Billing period start
     * @param {Date} endDate - Billing period end
     * @returns {Object} Created invoice
     * @throws {Error} If database error
     */
    async _generateInvoice(subscription, plan, startDate, endDate) {
        try {
            const invoiceNumber = `INV-${Date.now()}-${uuidv4().substring(0, 8)}`;
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + 30); // 30 days to pay

            return await BillingHistory.create({
                tenantId: subscription.tenantId,
                invoiceNumber,
                invoiceDate: startDate,
                dueDate,
                subscriptionId: subscription._id,
                planId: subscription.planId,
                amount: subscription.planPrice,
                currency: subscription.currency,
                discount: 0,
                tax: 0,
                totalAmount: subscription.planPrice,
                status: 'sent',
                description: `${plan.name} Plan - ${plan.billingCycle} subscription`,
                billingPeriod: { startDate, endDate },
            });
        } catch (error) {
            console.error(`Failed to generate invoice for subscription ${subscription._id}:`, error.message);
            throw new Error(`Failed to generate invoice: ${error.message}`);
        }
    }

    /**
     * Generate upgrade/downgrade adjustment invoice
     * @private
     * @param {Object} subscription - Updated subscription object
     * @param {String} previousPlanId - Previous plan ID
     * @param {Object} newPlan - New plan object
     * @param {Number} oldPrice - Previous plan price
     * @returns {Object|null} Created invoice or null if no difference
     * @throws {Error} If database error
     */
    async _generateUpgradeInvoice(subscription, previousPlanId, newPlan, oldPrice) {
        try {
            const invoiceNumber = `INV-${Date.now()}-${uuidv4().substring(0, 8)}`;
            const difference = newPlan.price - oldPrice;

            // Create invoice only if there's a difference
            if (Math.abs(difference) > 0) {
                return await BillingHistory.create({
                    tenantId: subscription.tenantId,
                    invoiceNumber,
                    invoiceDate: new Date(),
                    dueDate: subscription.endDate,
                    subscriptionId: subscription._id,
                    planId: subscription.planId,
                    amount: Math.abs(difference),
                    currency: subscription.currency,
                    discount: 0,
                    tax: 0,
                    totalAmount: Math.abs(difference),
                    status: 'sent',
                    description: `Plan upgrade/downgrade adjustment`,
                    billingPeriod: {
                        startDate: new Date(),
                        endDate: subscription.endDate,
                    },
                });
            }
            return null;
        } catch (error) {
            console.error(`Failed to generate upgrade invoice for subscription ${subscription._id}:`, error.message);
            throw new Error(`Failed to generate upgrade invoice: ${error.message}`);
        }
    }

    /**
     * Generate refund invoice for cancelled subscription
     * @private
     * @param {Object} subscription - Cancelled subscription object
     * @returns {Object} Created refund invoice
     * @throws {Error} If database error
     */
    async _generateRefundInvoice(subscription) {
        try {
            const invoiceNumber = `REFUND-${Date.now()}-${uuidv4().substring(0, 8)}`;

            // Calculate refund amount (prorated)
            const today = new Date();
            const daysUsed = Math.floor(
                (today - subscription.startDate) / (1000 * 60 * 60 * 24)
            );
            const totalDays = Math.floor(
                (subscription.endDate - subscription.startDate) / (1000 * 60 * 60 * 24)
            );
            const refundAmount = (subscription.planPrice * (totalDays - daysUsed)) / totalDays;

            return await BillingHistory.create({
                tenantId: subscription.tenantId,
                invoiceNumber,
                invoiceDate: new Date(),
                dueDate: new Date(),
                subscriptionId: subscription._id,
                planId: subscription.planId,
                amount: -Math.abs(refundAmount), // Negative amount for refund
                currency: subscription.currency,
                discount: 0,
                tax: 0,
                totalAmount: -Math.abs(refundAmount),
                status: 'paid',
                description: 'Refund for cancelled subscription (prorated)',
                billingPeriod: {
                    startDate: subscription.startDate,
                    endDate: new Date(),
                },
            });
        } catch (error) {
            console.error(`Failed to generate refund invoice for subscription ${subscription._id}:`, error.message);
            throw new Error(`Failed to generate refund invoice: ${error.message}`);
        }
    }

    /**
     * Get current month-year string
     * @private
     */
    _getMonthYear() {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
}

module.exports = new SubscriptionService();
