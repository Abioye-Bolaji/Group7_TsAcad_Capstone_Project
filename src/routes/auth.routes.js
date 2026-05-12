const express = require('express');

const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');

const {
    register,
    login,
    logout,
    verifyUserEmail,
    forgotUserPassword,
    resetUserPassword,
    refreshToken,
} = require('../controllers/auth.controller');

router.post('/register', register);

router.post('/login', login);

router.get( '/profile',
    authMiddleware,
    (req, res) => {  res.json({
            success: true,
            user: req.user, });
    }
);

router.post( '/logout', authMiddleware, logout);

router.get(
    '/verify-email/:token',
    verifyUserEmail
);

router.post(
    '/forgot-password',
    forgotUserPassword
);

router.post(
    '/reset-password/:token',
    resetUserPassword
);

router.post(
    '/refresh-token',
    refreshToken
);

module.exports = router;