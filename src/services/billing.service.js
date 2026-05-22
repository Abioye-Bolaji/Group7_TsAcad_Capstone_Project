const Subscription = require('../models/subscription.model');
const SubscriptionPlan = require('../models/subscription-plan.model');
const BillingHistory = require('../models/billing-history.model');
const UsageTracking = require('../models/usage-tracking.model');
const mongoose = require('mongoose');
const sendEmail = require('../utils/send.email');

// Import subscription service for renewal operations
const subscriptionService = require('./subscription.service');

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
     * @throws {Error} If usage tracking not found or database error
     */
    async getUsageTracking(tenantId) {
        try {
            if (!tenantId) {
                throw new Error('tenantId is required');
            }

            const usage = await UsageTracking.findOne({ tenantId }).lean();
            
            if (!usage) {
                throw new Error(`Usage tracking not found for tenant ${tenantId}`);
            }

            return usage;
        } catch (error) {
            throw new Error(`Failed to get usage tracking: ${error.message}`);
        }
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
     * @returns {Object} Updated usage tracking
     * @throws {Error} If validation fails or database error
     */
    async incrementExamsThisMonth(tenantId, count = 1) {
        try {
            if (!tenantId) {
                throw new Error('tenantId is required');
            }

            if (!Number.isInteger(count) || count < 0) {
                throw new Error('count must be a positive integer');
            }

            const currentMonth = this._getMonthYear();
            const usage = await UsageTracking.findOne({ tenantId });

            if (!usage) {
                throw new Error(`Usage tracking not found for tenant ${tenantId}`);
            }

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
        } catch (error) {
            throw new Error(`Failed to increment exams: ${error.message}`);
        }
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
     * @returns {Object} Updated usage tracking
     * @throws {Error} If validation fails or database error
     */
    async incrementApiCalls(tenantId, count = 1) {
        try {
            if (!tenantId) {
                throw new Error('tenantId is required');
            }

            if (!Number.isInteger(count) || count < 0) {
                throw new Error('count must be a positive integer');
            }

            const currentMonth = this._getMonthYear();
            const usage = await UsageTracking.findOne({ tenantId });

            if (!usage) {
                throw new Error(`Usage tracking not found for tenant ${tenantId}`);
            }

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
        } catch (error) {
            throw new Error(`Failed to increment API calls: ${error.message}`);
        }
    }

    /**
     * Check if tenant has exceeded limits for their current plan
     * Scoped by tenantId
     * @param {String} tenantId - Tenant ID
     * @returns {Object} { exceeded, limits, usage }
     * @throws {Error} If validation fails or database error
     */
    async checkUsageLimits(tenantId) {
        try {
            if (!tenantId) {
                throw new Error('tenantId is required');
            }

            const subscription = await Subscription.findOne({
                tenantId,
                status: 'active',
            }).populate('planId');

            if (!subscription) {
                return { exceeded: true, reason: 'No active subscription' };
            }

            const usage = await UsageTracking.findOne({ tenantId });

            if (!usage) {
                throw new Error(`Usage tracking not found for tenant ${tenantId}`);
            }

            const plan = subscription.planId;

            if (!plan || !plan.features) {
                throw new Error('Subscription plan data is invalid');
            }

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
        } catch (error) {
            throw new Error(`Failed to check usage limits: ${error.message}`);
        }
    }

    /**
     * Get billing summary for a tenant
     * @param {String} tenantId - Tenant ID
     * @returns {Object} Summary stats
     * @throws {Error} If validation fails or database error
     */
    async getBillingSummary(tenantId) {
        try {
            if (!tenantId) {
                throw new Error('tenantId is required');
            }

            const subscription = await Subscription.findOne({ tenantId })
                .populate('planId');

            const usage = await UsageTracking.findOne({ tenantId });

            if (!usage) {
                throw new Error(`Usage tracking not found for tenant ${tenantId}`);
            }

            const [paidInvoices, pendingInvoices, failedInvoices] = await Promise.all([
                BillingHistory.countDocuments({ tenantId, status: 'paid' }),
                BillingHistory.countDocuments({ tenantId, status: { $in: ['pending', 'sent'] } }),
                BillingHistory.countDocuments({ tenantId, status: 'failed' }),
            ]);

            const totalRevenue = await BillingHistory.aggregate([
                { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'paid' } },
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
        } catch (error) {
            throw new Error(`Failed to get billing summary: ${error.message}`);
        }
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
                const tenant = invoice.tenantId;
                const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-NG', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                });
                const amount = `₦${Number(invoice.totalAmount).toLocaleString()}`;
                const planName = invoice.planId?.name || 'your current plan';

                const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <h2 style="color: #2c3e50;">📅 Upcoming Subscription Renewal</h2>
                        <p>Hello <strong>${tenant.name}</strong>,</p>
                        <p>This is a friendly reminder that your <strong>${planName}</strong> subscription is due for renewal in <strong>7 days</strong>.</p>
                        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
                            <tr style="background:#f4f6f8;">
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Plan</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd;">${planName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount Due</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd;">${amount}</td>
                            </tr>
                            <tr style="background:#f4f6f8;">
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Renewal Date</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd;">${dueDate}</td>
                            </tr>
                        </table>
                        <p>Your subscription will be automatically renewed on this date. If you wish to cancel or manage your subscription, please log in to your admin dashboard.</p>
                        <p style="color: #888; font-size: 12px; margin-top: 32px;">
                            If you believe this email was sent in error, please contact support.<br/>
                            &copy; ${new Date().getFullYear()} CBT Platform. All rights reserved.
                        </p>
                    </div>
                `;

                await sendEmail(
                    tenant.email,
                    `⏰ Subscription Renewal Reminder — ${planName} renews on ${dueDate}`,
                    html
                );

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
        try {
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
                    // Trigger renewal process
                    await subscriptionService.renewSubscription(subscription.tenantId);
                    results.renewed += 1;
                    console.log(`Successfully renewed subscription for tenant ${subscription.tenantId}`);
                } catch (error) {
                    console.error(`Failed to renew subscription ${subscription._id}:`, error.message);
                    results.failed += 1;
                }
            }

            return results;
        } catch (error) {
            console.error('Failed to process subscription renewals:', error.message);
            throw new Error(`Failed to process subscription renewals: ${error.message}`);
        }
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
