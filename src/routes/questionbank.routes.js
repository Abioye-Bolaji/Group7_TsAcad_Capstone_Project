const express = require('express');
const router = express.Router();
const questionBankController = require('../controllers/questionbank.controller');
const upload = require('../middlewares/questionUpload.middleware');
const {
    bulkImportQuestions,
} = require('../controllers/questionbank.controller');

/**
 * @desc Question Bank Routes
 * Branch: feat/question-bank
 * Author: Tobiloba Obiyomi (obiyomitobiloba@gmail.com)
 * NOTE ON AUTH GUARDS:
 * The auth middleware (F1 - Auth feature) is required for all protected routes.
 * Unauthenticated requests will be rejected with a 401 Unauthorized response.
 * The auth middleware will also decode the JWT and attach req.user with the user's info.
 * This allows us to access req.user.tenantId for tenant scoping in the controllers.
 * PLACEHOLDER — replace with real auth when F1 publishes auth middleware:
 *   const { requireAuth } = require('../middlewares/auth');
 */

// ─── Placeholder Auth Guard (remove when F1 publishes auth middleware) ───────────
const requireAuth = (req, res, next) => {
    // TEMP: Simulates an authenticated tenant_admin user for development/testing
    // Replace entirely with: const { requireAuth } = require('../middlewares/auth');
    if (!req.user) {
        req.user = {
            _id: 'temp-tenant-admin-id',
            role: 'tenant_admin',
            tenantId: 'temp-tenant-id', // Replace with a real tenant _id from DB for testing
        };
    }
    next();
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. Required role(s): ${roles.join(', ')}`,
        });
    }
    next();
};
// ──────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
//  QUESTION BANK ROUTES (scoped to tenant via middleware)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /questions
 * Creates a new question in the tenant's question bank.
 * Request body should include questionText, options (array of { optionText, isCorrect }), and difficulty.
 */
router.post('/questions', 
            requireAuth, 
            requireRole('tenant_admin'),
            questionBankController.createQuestion
        );

router.get('/questions', 
            requireAuth, 
            requireRole('tenant_admin'),
            questionBankController.getQuestions
        );
router.get('/questions/:id', 
            requireAuth, 
            requireRole('tenant_admin'),
            questionBankController.getQuestionById
        );
router.put('/questions/:id', 
            requireAuth, 
            requireRole('tenant_admin'),
            questionBankController.updateQuestion
        );
router.delete('/questions/:id', 
            requireAuth, 
            requireRole('tenant_admin'),
            questionBankController.deleteQuestion
        );

router.post('/questions/bulk-upload', 
            requireAuth,
            requireRole('tenant_admin'),
            upload.single('questions'),
            bulkImportQuestions
        );

module.exports = router;