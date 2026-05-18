const express = require('express');
const router = require('router');

const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');

const controller = require('../controllers/scoring.controller');

router.use(authMiddleware, tenantMiddleware);

router.post('/sessions/:sessionId/grade', controller.gradeSession);
router.get('/exams/:examId/results', controller.getExamResults);
router.get('/results/:resultId', controller.getResult);
router.get('/manual-queue', controller.getManualQueue);
router.patch('/results/:resultId/manual', controller.submitManualGrade);
router.patch('/results/:resultId/release', controller.releaseResult);
router.get('/sessions/:sessionId/result', controller.getCandidateResult);

module.exports = router;