const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analytics.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

/**
 * @desc Feature F9 Analytics Routes Skeleton
 * Tenant-scoped analytics use auth + tenant middleware.
 * Platform summary is super-admin only and does not use tenant middleware.
 */

router.get(
    '/platform/summary',
    authMiddleware,
    authorizeRoles('super_admin'),
    analyticsController.getPlatformSummary
);

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get(
    '/exams/:examId/stats',
    authorizeRoles('tenant_admin', 'examiner'),
    analyticsController.getExamStats
);

router.get(
    '/exams/:examId/scorers',
    authorizeRoles('tenant_admin', 'examiner'),
    analyticsController.getExamScorers
);

router.get(
    '/exams/:examId/questions',
    authorizeRoles('tenant_admin', 'examiner'),
    analyticsController.getQuestionPerformance
);

router.get(
    '/exams/:examId/subjects',
    authorizeRoles('tenant_admin', 'examiner'),
    analyticsController.getSubjectBreakdown
);

router.get(
    '/candidates/:candidateId',
    authorizeRoles('tenant_admin', 'examiner', 'candidate'),
    analyticsController.getCandidatePerformanceTrend
);

module.exports = router;
