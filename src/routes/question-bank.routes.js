const express = require('express');
const router = express.Router();
const questionBankController = require('../controllers/question-bank.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const upload = require('../middlewares/question-upload.middleware');

/**
 * @desc Question Bank Routes (Feature F3)
 * Scoped to tenant via tenantMiddleware.
 * Author: Tobiloba Obiyomi (Stabilized by Antigravity)
 */

// All routes require authentication and tenant scoping
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @route POST /api/v1/questions
 * @access tenant_admin, examiner
 */
router.post(
    '/', 
    authorizeRoles('tenant_admin', 'examiner'),
    questionBankController.createQuestion
);

/**
 * @route GET /api/v1/questions
 * @access tenant_admin, examiner
 */
router.get(
    '/', 
    authorizeRoles('tenant_admin', 'examiner'),
    questionBankController.getQuestions
);

/**
 * @route GET /api/v1/questions/:id
 * @access tenant_admin, examiner
 */
router.get(
    '/:id', 
    authorizeRoles('tenant_admin', 'examiner'),
    questionBankController.getQuestionById
);

/**
 * @route PUT /api/v1/questions/:id
 * @access tenant_admin, examiner
 */
router.put(
    '/:id', 
    authorizeRoles('tenant_admin', 'examiner'),
    questionBankController.updateQuestion
);

/**
 * @route DELETE /api/v1/questions/:id
 * @access tenant_admin
 */
router.delete(
    '/:id', 
    authorizeRoles('tenant_admin'),
    questionBankController.deleteQuestion
);

/**
 * @route POST /api/v1/questions/bulk-upload
 * @access tenant_admin
 */
router.post(
    '/bulk-upload', 
    authorizeRoles('tenant_admin'),
    upload.single('questions'),
    questionBankController.bulkImportQuestions
);

module.exports = router;