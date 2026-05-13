import Exam from "../models/exam.model.js"; // Added .js extension for ESM [cite: 27]

export const createExamService = async (payload) => {
  return await Exam.create(payload);
};

// New Service to handle Status Logic
export const updateExamStatusService = async (examId, newStatus) => {
  const exam = await Exam.findById(examId);
  if (!exam) throw new Error("Exam not found");

  // Prevent closed -> active
  if (exam.status === "closed" && newStatus === "active") {
    throw new Error("Validation Error: Cannot reactivate a closed exam");
  }

  // Prevent active -> draft
  if (exam.status === "active" && newStatus === "draft") {
    throw new Error("Validation Error: Cannot revert an active exam to draft");
  }

  exam.status = newStatus;
  return await exam.save();
};

export const getAllExamsService = async (tenantId) => {
  return await Exam.find({ tenantId });
};
