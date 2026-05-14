const {
    startExamSessionService,
    saveAnswerService,
    submitExamService,
} = require("../services/exam-session.service");

const { sendSuccess } = require("../utils/response");

/**
 * @desc Exam Session Controller
 * Handles exam sitting logic for candidates
 */

const startExamSession = async (req, res, next) => {
    try {
        const session = await startExamSessionService({
            examId: req.body.examId,
            candidateId: req.user._id,
            tenantId: req.tenantId,
        });

        return sendSuccess(res, "Exam session started", session, 201);
    } catch (err) {
        next(err);
    }
};

const saveAnswer = async (req, res, next) => {
    try {
        await saveAnswerService(req.body);
        return sendSuccess(res, "Answer saved");
    } catch (err) {
        next(err);
    }
};

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