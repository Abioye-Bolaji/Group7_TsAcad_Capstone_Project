const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @desc Candidate Model for Multitenancy CBT API
 * Represents individual candidates(test takers) within a tenant (school/company).
 * Each candidate is linked to a tenant via tenantId, ensuring strict data isolation.
 * 
 * tenantId contract: https://github.com/Abioye-Bolaji/Group7_TsAcad_Capstone_Project
 * Feature: F5 - Candidate Management
 * Author: ainaseyim@gmail.com
 */

const candidateSchema = new mongoose.Schema({
    // Each candidate is associated with a tenant (school/company) via tenantId.
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: [true, 'Tenant ID is required'],
        index: true,
    },

    // Candidate's Identity
    name: {
        type: String,
        required: [true, 'Candidate name is required'],
        trim: true,
        minlength: [2, 'Candidate name must be at least 2 characters'],
        maxlength: [100, 'Candidate name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Candidate email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phone: {
        type: String,
        default: null
    },

    // Unique identifier for the candidate within the tenant's system (e.g. student ID, employee number).
    idNumber: {
        type: String,
        required: [true, 'Candidate ID/Matriculation number is required'],
        trim: true,
    },
    profilePhotoUrl: {
        type: String,
        default: null
    },

    // Authentication fields (if candidates will log in to a portal)
    password: {
        type: String,
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    accessPin: {
        type: String,
        select: false
    },

    // Organize candidates into groups/cohorts (e.g. JSS3 2024, Batch A etc.)
    groupIds: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CandidateGroup'
        }
    ],
    role: {
        type: String,
        default: 'candidate'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

candidateSchema.index({ email: 1, tenantId: 1}, { unique: true });
candidateSchema.index({ idNumber: 1, tenantId: 1 }, { unique: true, sparse: true });

candidateSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) return;
    const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
    this.password = await bcrypt.hash(this.password, rounds);
    next();
});

candidateSchema.methods.comparePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
};

candidateSchema.methods.comparePin = async function (plainPin) {
    return bcrypt.compare(plainPin, this.accessPin);
};

const Candidate = mongoose.model('Candidate', candidateSchema);
module.exports = Candidate;