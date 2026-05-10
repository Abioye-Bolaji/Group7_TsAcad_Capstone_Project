const {
    validateBody,
    registerSchema,
    loginSchema,
} = require('../validations/authValidation');

const {
    sendSuccess,
    sendError,
} = require('../utils/response');

const {
    registerUser,
    loginUser,
    logoutUser,
    verifyEmail,
    forgotPassword,
    resetPassword,
    refreshAccessToken,
} = require('../services/authService');

// REGISTER
const register = async (req, res, next) => {
    try {
        const errors = validateBody(registerSchema, req.body);

        if (errors) {
            return sendError(
                res,
                'Validation failed',
                400,
                errors
            );
        }

        const user = await registerUser(req.body);

        return sendSuccess(
            res,
            'User registered successfully',
            {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
            },
            201
        );
    } catch (error) {
        next(error);
    }
};


// LOGIN
const login = async (req, res, next) => {
    try {
        const errors = validateBody(loginSchema, req.body);

        if (errors) {
            return sendError(
                res,
                'Validation failed',
                400,
                errors
            );
        }

        const result = await loginUser(req.body);

        return sendSuccess(
            res,
            'Login successful',
            {
                user: {
                    id: result.user._id,
                    firstName: result.user.firstName,
                    lastName: result.user.lastName,
                    email: result.user.email,
                    role: result.user.role,
                    tenantId: result.user.tenantId,
                },

                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            },
            200
        );
    } catch (error) {
        next(error);
    }
};


// LOGOUT
const logout = async (req, res, next) => {
    try {

        const token =
            req.headers.authorization.split(' ')[1];

        await logoutUser(token);

        return sendSuccess(
            res,
            'Logout successful'
        );

    } catch (error) {
        next(error);
    }
};

//VERIFY EMAIL CONTROLLER
const verifyUserEmail = async (
    req,
    res,
    next
) => {
    try {

        await verifyEmail(req.params.token);

        return sendSuccess(
            res,
            'Email verified successfully'
        );

    } catch (error) {
        next(error);
    }
};

//FORGOT PASSWORD CONTROLLER
const forgotUserPassword = async (
    req,
    res,
    next
) => {
    try {

        await forgotPassword(req.body.email);

        return sendSuccess(
            res,
            'Password reset email sent'
        );

    } catch (error) {
        next(error);
    }
};

//RESET PASSWORD CONTROLLER
const resetUserPassword = async (
    req,
    res,
    next
) => {
    try {

        await resetPassword(
            req.params.token,
            req.body.password
        );

        return sendSuccess(
            res,
            'Password reset successful'
        );

    } catch (error) {
        next(error);
    }
};

//REFRESH TOKEN CONTROLLER
const refreshToken = async (
    req,
    res,
    next
) => {
    try {

        const result =
            await refreshAccessToken(
                req.body.refreshToken
            );

        return sendSuccess(
            res,
            'Access token refreshed',
            result
        );

    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    verifyUserEmail,
    forgotUserPassword,
    resetUserPassword,
    refreshToken,
};