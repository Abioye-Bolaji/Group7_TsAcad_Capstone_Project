const Exam = require("../models/exam.model");
const ExamSession = require("../models/exam-session.model");
// const Question = require("../models/Question");

// START SESSION
const startExamSessionService = async ({
  examId,
  candidateId,
  tenantId,
}) => {
  const exam = await Exam.findOne({
    _id: examId,
    tenantId,
  });

  if (!exam) throw new Error("Exam not found");

  const now = new Date();

  // Access window
  if (exam.startDate && now < exam.startDate) {
    throw new Error("Exam has not started yet");
  }

  if (exam.endDate && now > exam.endDate) {
    throw new Error("Exam has ended");
  }

  // Attempt limit
  const attempts = await ExamSession.countDocuments({
    examId,
    candidateId,
  });

  if (attempts >= exam.attemptsAllowed) {
    throw new Error("Attempt limit reached");
  }

  // Eligibility check
  const isAssigned =
    exam.assignedCandidates.includes(candidateId);

  if (!isAssigned) {
    throw new Error("You are not assigned to this exam");
  }

  const session = await ExamSession.create({
    examId,
    candidateId,
    tenantId,
    startedAt: now,
    timeRemaining: exam.duration * 60,
  });

  return session;
};

// GET QUESTIONS
const getQuestionsService = async (exam) => {
  let questions = await Question.find({
    _id: { $in: exam.questions },
  });

  if (exam.randomizeQuestions) {
    questions = questions.sort(() => Math.random() - 0.5);
  }

  return questions;
};

// SAVE ANSWER (AUTO-SAVE SUPPORT)
const saveAnswerService = async ({
  sessionId,
  questionId,
  selectedOption,
}) => {
  const session =
    await ExamSession.findById(sessionId);

  if (!session) throw new Error("Session not found");

  if (session.status === "submitted") {
    throw new Error("Exam already submitted");
  }

  const existing = session.answers.find(
    (a) =>
      a.questionId.toString() === questionId
  );

  if (existing) {
    existing.selectedOption = selectedOption;
  } else {
    session.answers.push({
      questionId,
      selectedOption,
    });
  }

  await session.save();
};

// TAB SWITCH TRACKING
const trackTabSwitchService = async (sessionId) => {
  const session =
    await ExamSession.findById(sessionId);

  session.tabSwitchCount += 1;

  await session.save();
};

// PAUSE
const pauseSessionService = async (sessionId) => {
  return ExamSession.findByIdAndUpdate(
    sessionId,
    { status: "paused" },
    { new: true }
  );
};

// RESUME
const resumeSessionService = async (sessionId) => {
  return ExamSession.findByIdAndUpdate(
    sessionId,
    { status: "in-progress" },
    { new: true }
  );
};

// SUBMIT EXAM (LOCK)
const submitExamService = async (sessionId) => {
  const session =
    await ExamSession.findById(sessionId);

  if (!session) throw new Error("Session not found");

  if (session.status === "submitted") {
    throw new Error("Already submitted");
  }

  session.status = "submitted";
  session.submittedAt = new Date();

  await session.save();

  return session;
};

module.exports = {
  startExamSessionService,
  getQuestionsService,
  saveAnswerService,
  trackTabSwitchService,
  pauseSessionService,
  resumeSessionService,
  submitExamService,
};