/**
 * @desc Standard API Response Utility
 * This follows the "Standard Response Envelope" defined in the project plan.
 */

const sendSuccess = (res, message, data = null, statusCode = 200, pagination = null) => {
    const response = {
        success: true,
        message,
    };

    if (data !== null) response.data = data;
    if (pagination !== null) response.pagination = pagination;

    return res.status(statusCode).json(response);
};

const sendError = (res, message, statusCode = 500, errors = null) => {
    const response = {
        success: false,
        message,
    };

    if (errors !== null) response.errors = errors;

    return res.status(statusCode).json(response);
};

module.exports = {
    sendSuccess,
    sendError
};
