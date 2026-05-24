const express = require('express');
const router = express.Router();

const { createExam, getAllExams, getExamById, updateExam, deleteExam, updateExamStatus } = require('../controllers/exam.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');

/**
 * @desc Exam Routes
 */

router.post('/', authMiddleware, tenantMiddleware, createExam);
router.get('/', authMiddleware, tenantMiddleware, getAllExams);
router.get('/:id', authMiddleware, tenantMiddleware, getExamById);
router.put('/:id', authMiddleware, tenantMiddleware, updateExam);
router.delete('/:id', authMiddleware, tenantMiddleware, deleteExam);
router.patch('/:id/status', authMiddleware, tenantMiddleware, updateExamStatus);

module.exports = router;
