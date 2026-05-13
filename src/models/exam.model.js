import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    instructions: {
      type: String,
    },

    subject: {
      type: String,
      required: true,
    },

    duration: {
      type: Number,
      required: true,
    },

    totalMarks: {
      type: Number,
      default: 0,
    },

    passMark: {
      type: Number,
      required: true,
    },

    attemptsAllowed: {
      type: Number,
      default: 1,
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["draft", "published", "active", "closed"],
      default: "draft",
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
        ref: "Question",
      },
    ],
    randomQuestionCount: {
      type: Number,
      default: 0, //
    },
    assignedCandidates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Candidate",
      },
    ],

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Exam", examSchema);
