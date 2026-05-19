const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

const controller = require('../controllers/scoring.controller');

router.use(authMiddleware, tenantMiddleware);

// Autograding triggering endpoint
router.post('/sessions/:sessionId/grade', authorizeRoles('tenant_admin', 'examiner', 'candidate'), controller.gradeSession);

// Results queries
router.get('/exams/:examId/results', authorizeRoles('tenant_admin', 'examiner'), controller.getExamResults);
router.get('/results/:resultId', authorizeRoles('tenant_admin', 'examiner', 'candidate'), controller.getResult);
router.get('/sessions/:sessionId/result', authorizeRoles('tenant_admin', 'examiner', 'candidate'), controller.getCandidateResult);

// Manual grading queue & submissions
router.get('/manual-queue', authorizeRoles('tenant_admin', 'examiner'), controller.getManualQueue);
router.patch('/results/:resultId/manual', authorizeRoles('tenant_admin', 'examiner'), controller.submitManualGrade);
router.patch('/results/:resultId/release', authorizeRoles('tenant_admin', 'examiner'), controller.releaseResult);

module.exports = router;