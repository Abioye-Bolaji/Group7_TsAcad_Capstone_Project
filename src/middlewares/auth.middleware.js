const jwt = require('jsonwebtoken');

const User = require('../models/user.model');

const { sendError } = require('../utils/response');

const BlacklistedToken = require('../models/BlacklistedToken');

const authMiddleware = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return sendError(
                res,
                'Access denied. No token provided.',
                401
            );
        }

        const blacklisted = await BlacklistedToken.findOne({
    token,
});

    if (blacklisted) {
      return sendError(
        res,
        'Token has been blacklisted. Please login again.',
        401
        );
     }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return sendError(
                res,
                'User not found',
                404
            );
        }

        req.user = user;

        next();

    } catch (error) {
        return sendError(
            res,
            'Invalid or expired token',
            401
        );
    }
};

module.exports = authMiddleware;