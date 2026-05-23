const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const tenantMiddleware = require("../middlewares/tenant.middleware");
const { featureGatingMiddleware, checkExamsPerMonthLimit } = require('../middlewares/feature-gating.middleware');

const {
    startExamSession,
    saveAnswer,
    submitExam,
} = require("../controllers/exam-session.controller");

/**
 * @desc Exam Session Routes
 * Candidates use these to sit for exams
 */

router.post(
    "/start", 
    authMiddleware, 
    tenantMiddleware, 
    featureGatingMiddleware(null, checkExamsPerMonthLimit),
    startExamSession
);

router.post("/save-answer", authMiddleware, tenantMiddleware, saveAnswer);
router.post("/submit", authMiddleware, tenantMiddleware, submitExam);

module.exports = router;