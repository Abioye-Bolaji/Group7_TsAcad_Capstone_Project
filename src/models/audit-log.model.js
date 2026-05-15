const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    //who has acted
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    userEmail: {
        type: String,
        required: true,
    },

    userRole: {
        type: String,
        enum: ['super_admin', 'tenant_admin', 'examiner', 'candidate'],
        required: true,
    },

    //Tenant isolation

   tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },

    //what they did
    action: {
        type: String,
        required: true,
        index: true,
    },

    resource: {
        type: String,
        required: true,
        index: true,
    },

    resourceId: {
        type: String,
        required: true,
        index: true,
    },

    oldValues: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },

    newValues: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },

    ipAddress: {
        type: String,
        default: null,
    },

    userAgent: {
        type: String,
        default: null,
    },

    method: {
        type: String,
        required: true,
    },
    endpoint: { 
        type: String,
        default: null, 
    },

    status: {
        type: String,
        enum: ['SUCCESS', 'FAILED'],
        default: 'SUCCESS',
    },

    statusCode: { 
        type: Number,
        default: null, 
    },

    flagged: {
        type: Boolean,
        default: false,
        index: true,
    },

    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'LOW',
    },

    description: {
        type: String,
        required: true,
    },

    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
}, { timestamps: true });


auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ flagged: 1, severity: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);