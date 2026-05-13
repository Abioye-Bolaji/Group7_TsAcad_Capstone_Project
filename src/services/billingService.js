const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const BillingHistory = require('../models/BillingHistory');

/**
 * @desc Billing Service
 * Handles usage tracking, billing history, and invoice generation
 * Follows the tenantId contract for data isolation
 */

class BillingService {
    /**
     * Get billing history for a tenant
     * Scoped by tenantId
     * @param {String} tenantId - Tenant ID
     * @param {Object} filters - Status, pagination, date range
     * @returns {Object} { count, invoices, pagination }
     */
    async getBillingHistory(tenantId, filters = {}) {
        const {
            status = null,
            limit = 10,
            skip = 0,
            startDate = null,
            endDate = null,
        } = filters;

        const query = { tenantId };

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.invoiceDate = {};
            if (startDate) query.invoiceDate.$gte = new Date(startDate);
            if (endDate) query.invoiceDate.$lte = new Date(endDate);
        }

        const [invoices, total] = await Promise.all([
            BillingHistory.find(query)
                .populate('planId', 'name price')
                .populate('subscriptionId', 'status')
                .sort({ invoiceDate: -1 })
                .limit(parseInt(limit))
                .skip(parseInt(skip))
                .lean(),
            BillingHistory.countDocuments(query),
        ]);

        return {
            count: total,
            invoices,
            pagination: {
                limit: parseInt(limit),
                skip: parseInt(skip),
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get a specific invoice
     * Scoped by tenantId
     * @param {String} invoiceId - Invoice ID
     * @param {String} tenantId - Tenant ID
     * @returns {Object} Invoice details
     */
    async getInvoiceById(invoiceId, tenantId) {
        return await BillingHistory.findOne({ _id: invoiceId, tenantId })
            .populate('planId')
            .populate('subscriptionId')
            .lean();
    }

    /**
     * Get usage tracking for a tenant
     * Scoped by tenantId
     * @param {String} tenantId - Tenant ID
     * @returns {Object} Usage data
     */
    async getUsageTracking(tenantId) {
        return await UsageTracking.findOne({ tenantId }).lean();
    }

    /**
     * Update active candidates count
     * Scoped by tenantId
     * @param {String} tenantId - Tenant ID
     * @param {Number} count - New count
     */
    async updateActiveCandidatesCount(tenantId, count) {
        return await UsageTracking.findOneAndUpdate(
            { tenantId },
            {
                'activeCandidates.count': count,
                'activeCandidates.lastUpdated': new Date(),
            },
            { new: true }
        ).lean();
    }

    /**
     * Increment exams run this month
     * Scoped by tenantId
     * @param {String} tenantId - Tenant ID
     * @param {Number} count - Number of exams to add (default 1)
     */
    async incrementExamsThisMonth(tenantId, count = 1) {
        const currentMonth = this._getMonthYear();

        const usage = await UsageTracking.findOne({ tenantId });

        // Check if we need to reset the month counter
        const needsReset = !usage.examsRunThisMonth.monthYear ||
            usage.examsRunThisMonth.monthYear !== currentMonth;

        if (needsReset) {
            usage.examsRunThisMonth.count = count;
            usage.examsRunThisMonth.monthYear = currentMonth;
        } else {
            usage.examsRunThisMonth.count += count;
        }

        usage.examsRunThisMonth.lastUpdated = new Date();
        usage.totalExamsAllTime += count;

        return await usage.save();
    }

    /**
     * Update storage used
     * Scoped by tenantId
     * @param {String} tenantId - Tenant ID
     * @param {Number} sizeGB - Storage size in GB
     */
    async updateStorageUsed(tenantId, sizeGB) {
        return await UsageTracking.findOneAndUpdate(
            { tenantId },
            {
                storageUsedGB: sizeGB,
                storageLastUpdated: new Date(),
            },
            { new: true }
        ).lean();
    }

    /**
     * Increment API calls this month
     * Scoped by tenantId
     * @param {String} tenantId - Tenant ID
     * @param {Number} count - Number of calls to add (default 1)
     */
    async incrementApiCalls(tenantId, count = 1) {
        const currentMonth = this._getMonthYear();

        const usage = await UsageTracking.findOne({ tenantId });

        // Check if we need to reset the month counter
        const needsReset = !usage.apiCallsThisMonth.monthYear ||
            usage.apiCallsThisMonth.monthYear !== currentMonth;

        if (needsReset) {
            usage.apiCallsThisMonth.count = count;
            usage.apiCallsThisMonth.monthYear = currentMonth;
        } else {
            usage.apiCallsThisMonth.count += count;
        }

        usage.apiCallsThisMonth.lastUpdated = new Date();

        return await usage.save();
    }

    /**
     * Check if tenant has exceeded limits for their current plan
     * Scoped by tenantId
     * @param {String} tenantId - Tenant ID
     * @returns {Object} { exceeded, limits, usage }
     */
    async checkUsageLimits(tenantId) {
        const subscription = await Subscription.findOne({
            tenantId,
            status: 'active',
        }).populate('planId');

        if (!subscription) {
            return { exceeded: true, reason: 'No active subscription' };
        }

        const usage = await UsageTracking.findOne({ tenantId });
        const plan = subscription.planId;

        const limits = {
            maxActiveCandidates: plan.features.maxActiveCandidates,
            maxExamsPerMonth: plan.features.maxExamsPerMonth,
            maxStorageGB: plan.features.maxStorageGB,
        };

        const exceeded = {
            activeCandidates: usage.activeCandidates.count >
                limits.maxActiveCandidates,
            examsPerMonth: usage.examsRunThisMonth.count >
                limits.maxExamsPerMonth,
            storage: usage.storageUsedGB > limits.maxStorageGB,
        };

        return {
            exceeded: Object.values(exceeded).some(v => v),
            limits,
            usage: {
                activeCandidates: usage.activeCandidates.count,
                examsPerMonth: usage.examsRunThisMonth.count,
                storage: usage.storageUsedGB,
            },
            exceededItems: Object.entries(exceeded)
                .filter(([, v]) => v)
                .map(([k]) => k),
        };
    }

    /**
     * Get billing summary for a tenant
     * @param {String} tenantId - Tenant ID
     * @returns {Object} Summary stats
     */
    async getBillingSummary(tenantId) {
        const subscription = await Subscription.findOne({ tenantId })
            .populate('planId');

        const usage = await UsageTracking.findOne({ tenantId });

        const [paidInvoices, pendingInvoices, failedInvoices] = await Promise.all([
            BillingHistory.countDocuments({ tenantId, status: 'paid' }),
            BillingHistory.countDocuments({ tenantId, status: { $in: ['pending', 'sent'] } }),
            BillingHistory.countDocuments({ tenantId, status: 'failed' }),
        ]);

        const totalRevenue = await BillingHistory.aggregate([
            { $match: { tenantId: require('mongoose').Types.ObjectId(tenantId), status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);

        return {
            subscription: {
                plan: subscription?.planId?.name || 'None',
                status: subscription?.status || 'inactive',
                startDate: subscription?.startDate,
                endDate: subscription?.endDate,
                autoRenew: subscription?.autoRenew,
            },
            invoices: {
                paid: paidInvoices,
                pending: pendingInvoices,
                failed: failedInvoices,
            },
            totalRevenue: totalRevenue[0]?.total || 0,
            usage,
        };
    }

    /**
     * Send reminder emails for upcoming payments
     * Call this periodically (e.g., via cron job)
     * @returns {Object} { sent, failed }
     */
    async sendUpcomingPaymentReminders() {
        const upcomingInvoices = await BillingHistory.find({
            status: { $in: ['pending', 'sent'] },
            reminderSent: false,
            dueDate: {
                $gte: new Date(),
                $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
            },
        })
            .populate('tenantId')
            .lean();

        const results = { sent: 0, failed: 0 };

        for (const invoice of upcomingInvoices) {
            try {
                // TODO: Send email reminder
                // await sendEmail(invoice.tenantId.email, 'Payment Due Soon', {...})

                // Mark as sent
                await BillingHistory.updateOne(
                    { _id: invoice._id },
                    {
                        reminderSent: true,
                        reminderSentDate: new Date(),
                    }
                );

                results.sent += 1;
            } catch (error) {
                console.error(`Failed to send reminder for invoice ${invoice._id}:`, error);
                results.failed += 1;
            }
        }

        return results;
    }

    /**
     * Process subscription renewals
     * Call this via cron job daily
     * @returns {Object} { renewed, failed }
     */
    async processSubscriptionRenewals() {
        const expiringSubscriptions = await Subscription.find({
            status: 'active',
            autoRenew: true,
            endDate: {
                $gte: new Date(),
                $lte: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Next 24 hours
            },
        }).lean();

        const results = { renewed: 0, failed: 0 };

        for (const subscription of expiringSubscriptions) {
            try {
                // TODO: Trigger renewal process
                // await subscriptionService.renewSubscription(subscription.tenantId)
                results.renewed += 1;
            } catch (error) {
                console.error(`Failed to renew subscription ${subscription._id}:`, error);
                results.failed += 1;
            }
        }

        return results;
    }

    /**
     * Get payment status dashboard (for super admin)
     * No tenantId filter - super admin can see everything
     * @param {Object} filters - Status, date range, pagination
     * @returns {Object} Payment data
     */
    async getPaymentDashboard(filters = {}) {
        const {
            status = null,
            limit = 20,
            skip = 0,
            startDate = null,
            endDate = null,
        } = filters;

        const query = {};

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.invoiceDate = {};
            if (startDate) query.invoiceDate.$gte = new Date(startDate);
            if (endDate) query.invoiceDate.$lte = new Date(endDate);
        }

        const [invoices, stats] = await Promise.all([
            BillingHistory.find(query)
                .populate('tenantId', 'name email')
                .populate('planId', 'name')
                .sort({ invoiceDate: -1 })
                .limit(parseInt(limit))
                .skip(parseInt(skip))
                .lean(),
            BillingHistory.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        total: { $sum: '$totalAmount' },
                    },
                },
            ]),
        ]);

        return {
            invoices,
            stats: stats.reduce((acc, s) => {
                acc[s._id] = { count: s.count, total: s.total };
                return acc;
            }, {}),
        };
    }

    //PRIVATE HELPER METHODS

    /**
     * Get current month-year string
     * @private
     */
    _getMonthYear() {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
}

module.exports = new BillingService();
