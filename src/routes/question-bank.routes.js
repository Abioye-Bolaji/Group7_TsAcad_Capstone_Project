const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const questionBankController = require('../controllers/question-bank.controller');
const uploadImage = require('../middlewares/image-upload.middleware');
const uploadQuestion  = require('../middlewares/question-upload.middleware');
const bulkImportQuestions = require('../controllers/question-bank.controller').bulkImportQuestions;
const authorizeRoles = require('../middlewares/role.middleware');

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


// ═════════════════════════════════════════════════════════════════════════════
//  QUESTION BANK ROUTES (scoped to tenant via middleware)
// ═════════════════════════════════════════════════════════════════════════════


router.post('/', 
            authMiddleware, 
            tenantMiddleware,
            questionBankController.createQuestion
        );

router.get('/', 
            authMiddleware, 
            tenantMiddleware,
            questionBankController.getQuestions
        );

router.get('/:id', 
            authMiddleware, 
            tenantMiddleware,
            questionBankController.getQuestionById
        );

router.put('/:id', 
            authMiddleware, 
            tenantMiddleware,
            questionBankController.updateQuestion
        );

router.delete('/:id', 
            authMiddleware, 
            tenantMiddleware,
            questionBankController.deleteQuestion     
        );

router.post('/bulk-upload', 
            authMiddleware,
            tenantMiddleware,
            uploadQuestion.single('questions'),
            bulkImportQuestions 
        );

router.post('/:id/image', 
            authMiddleware,
            tenantMiddleware,
            uploadImage.single('image'),
            questionBankController.updateQuestionImage
        );
        
module.exports = router;
