const { sendError } = require('../utils/response');

const authorizeRoles = (...roles) => {
    return (req, res, next) => {

        if (!req.user) {
            return sendError(
                res,
                'Unauthorized',
                401
            );
        }

        if (!roles.includes(req.user.role)) {
            return sendError(
                res,
                'Forbidden: insufficient permissions',
                403
            );
        }

        next();
    };
};

module.exports = authorizeRoles;