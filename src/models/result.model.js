const mongoose = require('mongoose');

/**
 * @desc Result Model
 * Stores the final grade, detailed answer breakdown, manual grading queue, and status of a candidate's exam attempt.
 * Links to Candidate, Exam, and ExamSession.
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
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExamSession',
            index: true,
        },
        candidateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate',
            required: true,
            index: true,
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
            index: true,
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
        rawScore: {
            type: Number,
            required: true,
            default: 0,
        },
        maxScore: {
            type: Number,
            required: true,
            default: 0,
        },
        totalMarks: {
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
            required: true,
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
        answerBreakdown: [{
            questionId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'QuestionBank',
            },
            candidateAnswer: mongoose.Schema.Types.Mixed,
            correctAnswer: mongoose.Schema.Types.Mixed,
            isCorrect: { type: Boolean },
            marksAwarded: {
                type: Number,
                default: 0,
            },
            marksAvailable: { type: Number },
            requiresManualGrading: {
                type: Boolean,
                default: false,
            },
        }],
        gradingStatus: {
            type: String,
            enum: ['auto_graded', 'pending_manual', 'fully_graded', 'released'],
            default: 'auto_graded',
        },
        manualGradingQueue: [{
            questionId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'QuestionBank',
            },
            candidateAnswer: String,
            maxMarks: Number,
            marksAwarded: {
                type: Number,
                default: null,
            },
            gradedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            gradedAt: Date,
            feedback: String,
        }],
    },
    {
        timestamps: true,
    }
);

// Indexes for fast lookups
resultSchema.index({ tenantId: 1, candidateId: 1 });
resultSchema.index({ tenantId: 1, examId: 1 });

module.exports = mongoose.model('Result', resultSchema);
