const mongoose = require('mongoose');

/**
 * @desc Exam Model
 * Defines the structure of an exam in the platform.
 * Follows the tenantId contract for data isolation.
 * FIXED: Converted from ES Module (import/export) to CommonJS (require/module.exports)
 */

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
    },

    description: {
      type: String,
      default: null,
    },

    instructions: {
      type: String,
      default: null,
    },

    subject: {
      type: String,
      required: [true, 'Subject is required'],
    },

    duration: {
      type: Number,
      required: [true, 'Duration is required'], // In minutes
    },

    totalMarks: {
      type: Number,
      default: 0,
    },

    passMark: {
      type: Number,
      required: [true, 'Pass mark is required'],
    },

    attemptsAllowed: {
      type: Number,
      default: 1,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ['draft', 'published', 'active', 'closed'],
      default: 'draft',
    },

    randomizeQuestions: {
      type: Boolean,
      default: false,
    },

    randomizeOptions: {
      type: Boolean,
      default: false,
    },

    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],

    randomQuestionCount: {
      type: Number,
      default: 0,
    },

    assignedCandidates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
      },
    ],

    // ── Tenant Contract ────────────────────────────────────────────
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenantId is required'],
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast tenant-scoped queries
examSchema.index({ tenantId: 1, status: 1 });
examSchema.index({ tenantId: 1, subject: 1 });

module.exports = mongoose.model('Exam', examSchema);
