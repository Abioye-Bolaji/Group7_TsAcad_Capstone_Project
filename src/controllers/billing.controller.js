const billingService = require('../services/billing.service');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @desc Billing Controller
 * Handles billing history, invoices, and usage tracking
 * Scoped by tenantId from middleware
 */

class BillingController {
    /**
     * GET /billing/history
     * Get tenant's billing history with filters
     * Query params: status, limit, skip, startDate, endDate
     * Scoped to req.tenantId
     */
    async getBillingHistory(req, res) {
        try {
            const {
                status = null,
                limit = 10,
                skip = 0,
                startDate = null,
                endDate = null,
            } = req.query;

            const result = await billingService.getBillingHistory(req.tenantId, {
                status,
                limit,
                skip,
                startDate,
                endDate,
            });

            return sendSuccess(res, 'Billing history retrieved', result);
        } catch (error) {
            console.error('Error fetching billing history:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * GET /billing/invoices/:invoiceId
     * Get a specific invoice
     * Scoped to req.tenantId
     */
    async getInvoice(req, res) {
        try {
            const invoice = await billingService.getInvoiceById(
                req.params.invoiceId,
                req.tenantId
            );

            if (!invoice) {
                return sendError(res, 'Invoice not found', 404);
            }

            return sendSuccess(res, 'Invoice retrieved', invoice);
        } catch (error) {
            console.error('Error fetching invoice:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * GET /billing/usage
     * Get tenant's current usage tracking
     * Scoped to req.tenantId
     */
    async getUsageTracking(req, res) {
        try {
            const usage = await billingService.getUsageTracking(req.tenantId);

            if (!usage) {
                return sendError(res, 'Usage tracking not found', 404);
            }

            return sendSuccess(res, 'Usage tracking retrieved', usage);
        } catch (error) {
            console.error('Error fetching usage tracking:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * GET /billing/summary
     * Get billing summary (subscription + usage + invoices)
     * Scoped to req.tenantId
     */
    async getBillingSummary(req, res) {
        try {
            const summary = await billingService.getBillingSummary(req.tenantId);

            return sendSuccess(res, 'Billing summary retrieved', summary);
        } catch (error) {
            console.error('Error fetching billing summary:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * GET /billing/usage-limits
     * Check if tenant has exceeded usage limits
     * Scoped to req.tenantId
     */
    async checkUsageLimits(req, res) {
        try {
            const limits = await billingService.checkUsageLimits(req.tenantId);

            return sendSuccess(
                res,
                limits.exceeded ? 'Usage limit(s) exceeded' : 'Usage within limits',
                limits
            );
        } catch (error) {
            console.error('Error checking usage limits:', error);
            return sendError(res, error.message, 500);
        }
    }

    //SUPER ADMIN ENDPOINTS

    /**
     * GET /billing/admin/dashboard
     * Get payment dashboard (Super Admin only)
     * Query params: status, limit, skip, startDate, endDate
     */
    async getPaymentDashboard(req, res) {
        try {
            // Verify super admin
            if (req.user?.role !== 'super_admin') {
                return sendError(res, 'Only super admins can access this endpoint', 403);
            }

            const {
                status = null,
                limit = 20,
                skip = 0,
                startDate = null,
                endDate = null,
            } = req.query;

            const result = await billingService.getPaymentDashboard({
                status,
                limit,
                skip,
                startDate,
                endDate,
            });

            return sendSuccess(res, 'Payment dashboard retrieved', result);
        } catch (error) {
            console.error('Error fetching payment dashboard:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * POST /billing/admin/send-reminders
     * Trigger sending payment reminders (Super Admin only)
     */
    async sendPaymentReminders(req, res) {
        try {
            if (req.user?.role !== 'super_admin') {
                return sendError(res, 'Only super admins can access this endpoint', 403);
            }

            const result = await billingService.sendUpcomingPaymentReminders();

            return sendSuccess(res, 'Payment reminders sent', result);
        } catch (error) {
            console.error('Error sending reminders:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * POST /billing/admin/process-renewals
     * Trigger processing of subscription renewals (Super Admin only)
     */
    async processRenewals(req, res) {
        try {
            if (req.user?.role !== 'super_admin') {
                return sendError(res, 'Only super admins can access this endpoint', 403);
            }

            const result = await billingService.processSubscriptionRenewals();

            return sendSuccess(res, 'Subscriptions processed for renewal', result);
        } catch (error) {
            console.error('Error processing renewals:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * POST /billing/admin/update-usage
     * Manually update tenant usage (Super Admin only)
     * Body: { tenantId, activeCandidates?, storageGB? }
     */
    async updateTenantUsage(req, res) {
        try {
            if (req.user?.role !== 'super_admin') {
                return sendError(res, 'Only super admins can access this endpoint', 403);
            }

            const { tenantId, activeCandidates, storageGB } = req.body;

            if (!tenantId) {
                return sendError(res, 'tenantId is required', 400);
            }

            const updates = {};

            if (activeCandidates !== undefined) {
                await billingService.updateActiveCandidatesCount(
                    tenantId,
                    activeCandidates
                );
                updates.activeCandidates = activeCandidates;
            }

            if (storageGB !== undefined) {
                await billingService.updateStorageUsed(tenantId, storageGB);
                updates.storageGB = storageGB;
            }

            const usage = await billingService.getUsageTracking(tenantId);

            return sendSuccess(res, 'Tenant usage updated', { updates, usage });
        } catch (error) {
            console.error('Error updating tenant usage:', error);
            return sendError(res, error.message, 500);
        }
    }

    /**
     * GET /billing/admin/all-invoices
     * Get all invoices across tenants (Super Admin only)
     * Query params: status, limit, skip, startDate, endDate, tenantId
     */
    async getAllInvoices(req, res) {
        try {
            if (req.user?.role !== 'super_admin') {
                return sendError(res, 'Only super admins can access this endpoint', 403);
            }

            const { status, limit = 20, skip = 0, tenantId } = req.query;

            // Build query
            const query = {};
            if (status) query.status = status;
            if (tenantId) query.tenantId = tenantId;

            const Billing = require('../models/billing-history.model');
            const [invoices, total] = await Promise.all([
                Billing.find(query)
                    .populate('tenantId', 'name email')
                    .populate('planId', 'name')
                    .sort({ invoiceDate: -1 })
                    .limit(parseInt(limit))
                    .skip(parseInt(skip))
                    .lean(),
                Billing.countDocuments(query),
            ]);

            return sendSuccess(res, 'All invoices retrieved', {
                invoices,
                pagination: {
                    limit: parseInt(limit),
                    skip: parseInt(skip),
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error('Error fetching all invoices:', error);
            return sendError(res, error.message, 500);
        }
    }
}

module.exports = new BillingController();
