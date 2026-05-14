const {
  startExamSessionService,
  saveAnswerService,
  submitExamService,
  pauseSessionService,
  resumeSessionService,
  trackTabSwitchService,
  getQuestionsService,
} = require("../services/examSession.service");

const { sendSuccess } = require("../utils/response");

// START
const startExamSession = async (req, res, next) => {
  try {
    const session =
      await startExamSessionService({
        examId: req.body.examId,
        candidateId: req.user._id,
        tenantId: req.tenantId,
      });

    return sendSuccess(
      res,
      "Exam session started",
      session,
      201
    );
  } catch (err) {
    next(err);
  }
};

// SAVE ANSWER
const saveAnswer = async (req, res, next) => {
  try {
    await saveAnswerService(req.body);
    return sendSuccess(res, "Answer saved");
  } catch (err) {
    next(err);
  }
};

// SUBMIT
const submitExam = async (req, res, next) => {
  try {
    await submitExamService(req.body.sessionId);
    return sendSuccess(res, "Exam submitted");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startExamSession,
  saveAnswer,
  submitExam,
};