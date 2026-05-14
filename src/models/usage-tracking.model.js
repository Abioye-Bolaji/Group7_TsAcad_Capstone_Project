const mongoose = require('mongoose');

/**
 * @desc Usage Tracking Model
 * Tracks tenant usage metrics (candidates, exams, storage, API calls)
 * Follows the tenantId contract for data isolation
 */

const usageTrackingSchema = new mongoose.Schema(
    {
        // Tenant Reference
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: [true, 'tenantId is required'],
            unique: true, // One usage record per tenant
            index: true,
        },

        // Active Candidates Count
        activeCandidates: {
            count: {
                type: Number,
                default: 0,
                min: [0, 'Active candidates cannot be negative'],
            },
            lastUpdated: {
                type: Date,
                default: Date.now,
            },
        },

        // Exams Run This Month
        examsRunThisMonth: {
            count: {
                type: Number,
                default: 0,
                min: [0, 'Exams count cannot be negative'],
            },
            monthYear: {
                type: String,
                default: null, // Format: YYYY-MM
            },
            lastUpdated: {
                type: Date,
                default: Date.now,
            },
        },

        // Total Exams All Time
        totalExamsAllTime: {
            type: Number,
            default: 0,
            min: [0, 'Total exams cannot be negative'],
        },

        // Storage Used
        storageUsedGB: {
            type: Number,
            default: 0,
            min: [0, 'Storage cannot be negative'],
        },

        storageLastUpdated: {
            type: Date,
            default: Date.now,
        },

        // API Calls This Month
        apiCallsThisMonth: {
            count: {
                type: Number,
                default: 0,
                min: [0, 'API calls count cannot be negative'],
            },
            monthYear: {
                type: String,
                default: null, // Format: YYYY-MM
            },
            lastUpdated: {
                type: Date,
                default: Date.now,
            },
        },
    },
    { timestamps: true }
);

// Indexes for quick lookups
usageTrackingSchema.index({ tenantId: 1 });
usageTrackingSchema.index({ 'examsRunThisMonth.monthYear': 1 });
usageTrackingSchema.index({ 'apiCallsThisMonth.monthYear': 1 });

module.exports = mongoose.model('UsageTracking', usageTrackingSchema);
