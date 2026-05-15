const mongoose = require('mongoose');

/**
 * @desc Candidate Group / Cohort Model for Multitenancy CBT API
 * Represents groups of candidates (e.g. a class, batch, or department) within a tenant.
 * Each candidate group is linked to a tenant via tenantId, ensuring strict data isolation.
 * 
 * A candidate group can have multiple candidates, and this model allows us to manage them as a unit (e.g. assign the same exam to a whole class).
 * 
 * Feature: F5 - Candidate Management
 * Author: ainaseyim@gmail.com
 */

const candidateGroupSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: [true, 'tenantId is required'],
        index: true
    },
    name: {
        type: String,
        required: [true, 'Group name is required'],
        trim: true,
        minlength: [2, 'Group name must be at least 2 characters'],
        maxlength: [100, 'Group name cannot exceed 100 characters']
    
    },
    description: {
        type: String,
        trim: true,
        default: null
    },

    // Members of the group (array of candidate ObjectIds).
    candidateIds: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate',
        },
    ],

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

candidateGroupSchema.index({ name: 1, tenantId: 1 }, { unique: true });

// Virtual: memberCount - number of candidates in the group
candidateGroupSchema.virtual('memberCount').get(function() {
    return this.candidateIds ? this.candidateIds.length : 0;
});

const CandidateGroup = mongoose.model('CandidateGroup', candidateGroupSchema);
module.exports = CandidateGroup;