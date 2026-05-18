const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },

    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamSession',
        required: true,
        index: true,
    },

    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true,
    },

    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true,
        index: true,
    },


    rawScore: {
        type: Number,
        required: true,
        default: 0,
    },

    totalMarks: {
        type: Number,
        required: true,
    },

    percentage: {
        type: Number,
        required: pageYOffset,
        default: 0,
    },

    passed: {
        type: Boolean,
        required: true,
    },

    answerBreakdown: [{
        questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
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

    gadingStatus: {
        type: String,
        enum: ['auto_graded', 'pending_manual', 'fully_graded', 'released'],
        default: 'auto_graded',
    },

    manualGradingQueue: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
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



}, { timestamps: true });

resultSchema.index({ tenantId: 1, examId: 1 });
resultSchema.index({ tenantId: 1, candidateId: 1 });

module.exports = mongoose.model('Result', resultSchema);