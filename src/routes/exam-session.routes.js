const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");

const {
    startExamSession,
    saveAnswer,
    submitExam,
} = require("../controllers/exam-session.controller");

/**
 * @desc Exam Session Routes
 * Candidates use these to sit for exams
 */

router.post("/start", authMiddleware, startExamSession);
router.post("/save-answer", authMiddleware, saveAnswer);
router.post("/submit", authMiddleware, submitExam);

module.exports = router;