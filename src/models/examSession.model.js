const mongoose = require("mongoose");

const examSessionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },

    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        selectedOption: String,
      },
    ],

    status: {
      type: String,
      enum: ["in-progress", "paused", "submitted"],
      default: "in-progress",
    },

    tabSwitchCount: {
      type: Number,
      default: 0,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    submittedAt: Date,

    timeRemaining: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExamSession", examSessionSchema);