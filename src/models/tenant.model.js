const mongoose = require('mongoose');

/**
 * @desc Tenant Model
 * This is the core model for the entire platform.
 * Every other collection (Exam, Candidate, Question, etc.) will reference
 * a tenantId that points to a document in this collection.
 *
 * Strategy: Shared Database with tenantId field (agreed by team).
 */

const tenantSettingsSchema = new mongoose.Schema(
    {
        allowedFeatures: {
            type: [String],
            default: ['exam-setup', 'candidate-management', 'question-bank', 'results'],
        },
        maxCandidates: {
            type: Number,
            default: 500,
        },
        maxExams: {
            type: Number,
            default: 50,
        },
        customDomain: {
            type: String,
            default: null,
        },
    },
    { _id: false } // Embedded, no separate _id needed
);

const tenantSchema = new mongoose.Schema(
    {
        // ─── Identity ──────────────────────────────────────────────
        name: {
            type: String,
            required: [true, 'Tenant name is required'],
            trim: true,
            minlength: [2, 'Tenant name must be at least 2 characters'],
            maxlength: [100, 'Tenant name cannot exceed 100 characters'],
        },

        /**
         * Slug: URL-safe unique identifier for the tenant.
         * e.g. "lagos-grammar-school" → used in subdomains or URL paths
         * All teammates will query using this or the _id as tenantId
         */
        slug: {
            type: String,
            required: [true, 'Tenant slug is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
        },

        // ─── Contact & Branding ────────────────────────────────────
        email: {
            type: String,
            required: [true, 'Tenant contact email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
        },
        phone: {
            type: String,
            default: null,
        },
        logoUrl: {
            type: String,
            default: null,
        },
        address: {
            type: String,
            default: null,
        },

        // ─── Status ────────────────────────────────────────────────
        /**
         * active   → fully operational
         * suspended → blocked from API access (middleware enforces this)
         * inactive → soft-deleted / awaiting setup
         */
        status: {
            type: String,
            enum: ['active', 'suspended', 'inactive'],
            default: 'active',
        },

         //Subscription Plan
        // Legacy string field for backward compatibility
        plan: {
            type: String,
            enum: ['free', 'basic', 'pro'],
            default: 'free',
        },

        //Current Subscription Reference
        subscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subscription',
            default: null,
        },

        // ─── Tenant Settings (embedded) ────────────────────────────
        settings: {
            type: tenantSettingsSchema,
            default: () => ({}),
        },

        // ─── Super Admin Tracking ──────────────────────────────────
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true, // adds createdAt and updatedAt automatically
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Note: slug and email indexes are already created by unique:true on the field definitions above.
// Only adding index for fields that don't have inline index declarations.
tenantSchema.index({ status: 1 });

// ─── Virtual: tenantId alias ──────────────────────────────────────────────────
// Allows teammates to call tenant.tenantId and get the _id string
tenantSchema.virtual('tenantId').get(function () {
    return this._id.toHexString();
});

const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;
