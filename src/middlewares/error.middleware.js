const { sendError } = require('../utils/response');

const errorMiddleware = (err, req, res, next) => {
    console.error('Error:', err);

    return sendError(
        res,
        err.message || 'Internal Server Error',
        err.statusCode || 500
    );
};

module.exports = errorMiddleware;