const express = require('express');
const router = express.Router();

const { createExam, getAllExams } = require('../controllers/exam.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @desc Exam Routes
 * FIXED: Converted from ES Module to CommonJS.
 * FIXED: Removed reference to non-existent validate middleware.
 * FIXED: Validation is now handled inside the controller (project standard).
 * NOTE: tenantMiddleware is applied globally in app.js for all routes
 *       registered after app.use(tenantMiddleware) — no need to add it here.
 */

/**
 * POST /api/v1/exams
 * Create a new exam — scoped to logged-in user's tenant
 */
router.post('/', authMiddleware, createExam);

/**
 * GET /api/v1/exams
 * Get all exams for the logged-in user's tenant
 */
router.get('/', authMiddleware, getAllExams);

module.exports = router;
