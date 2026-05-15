const mongoose = require('mongoose');

/**
 * @desc Result Model
 * Stores the final grade and status of a candidate's exam attempt.
 * Links to Candidate and Exam.
 * Follows the tenantId contract for data isolation.
 */

const resultSchema = new mongoose.Schema(
    {
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        },
        candidateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate',
            required: true,
        },
        candidateName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam',
            required: true,
        },
        examName: {
            type: String,
            required: true,
        },
        score: {
            type: Number,
            required: true,
            default: 0,
        },
        maxScore: {
            type: Number,
            required: true,
            default: 0,
        },
        percentage: {
            type: Number,
            required: true,
            default: 0,
        },
        grade: {
            type: String,
            enum: ['A', 'B', 'C', 'D', 'F'],
            default: 'F',
        },
        status: {
            type: String,
            enum: ['Passed', 'Failed'],
            default: 'Failed',
        },
        passed: {
            type: Boolean,
            default: false,
        },
        released: {
            type: Boolean,
            default: false,
        },
        completionDate: {
            type: Date,
            default: Date.now,
        },
        certificateCode: {
            type: String,
            unique: true,
            sparse: true,
        },
        certificateFile: {
            type: String,
            default: null,
        },
        issuerName: {
            type: String,
            default: 'CBT Platform',
        },
        issueDate: {
            type: Date,
            default: null,
        },
        expiryDate: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for fast lookups
resultSchema.index({ tenantId: 1, candidateId: 1 });
resultSchema.index({ tenantId: 1, examId: 1 });
// resultSchema.index({ certificateCode: 1 });

module.exports = mongoose.model('Result', resultSchema);
