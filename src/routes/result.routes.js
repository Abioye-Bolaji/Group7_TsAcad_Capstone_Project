const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const resultController = require('../controllers/result.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

// Rate limiter to prevent abuse on resource-heavy PDF certificate generation (5 requests per 15 mins)
const certificateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many certificate downloads requested from this IP, please try again in 15 minutes.'
    }
});

/**
 * @desc Result & Certificate Routes (Feature F8)
 * Scoped to tenant via tenantMiddleware.
 */

// Public verification route
router.get('/verify/:code', resultController.verifyCertificate);

// Protected routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Candidates view their own results
router.get('/me', authorizeRoles('candidate'), resultController.getMyResults);

// Admins/Examiners view all results for their tenant
router.get('/all', authorizeRoles('tenant_admin', 'examiner'), resultController.getAllResults);

// Download certificate (accessible by candidate or admin)
router.get('/:id/certificate', certificateLimiter, resultController.downloadCertificate);

module.exports = router;
