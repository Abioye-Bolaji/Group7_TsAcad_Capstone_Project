const express = require('express');
const router = express.Router();

const { createExam, getAllExams } = require('../controllers/exam.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');

/**
 * @desc Exam Routes
 */

/**
 * POST /api/v1/exams
 * Create a new exam — scoped to logged-in user's tenant
 */
router.post('/', authMiddleware, tenantMiddleware, createExam);

/**
 * GET /api/v1/exams
 * Get all exams for the logged-in user's tenant
 */
router.get('/', authMiddleware, tenantMiddleware, getAllExams);

module.exports = router;
