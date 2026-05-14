const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Candidate = require('../models/candidate.model');
const { sendError } = require('../utils/response');
const BlacklistedToken = require('../models/blacklisted.token');

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

        const blacklisted = await BlacklistedToken.findOne({ token });

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

        let user;

        // NEW: Check if this is a candidate or a platform user
        if (decoded.role === 'candidate') {
            user = await Candidate.findById(decoded.id).select('-accessPin');
        } else {
            user = await User.findById(decoded.id).select('-password');
        }

        if (!user) {
            return sendError(
                res,
                'User/Candidate not found',
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