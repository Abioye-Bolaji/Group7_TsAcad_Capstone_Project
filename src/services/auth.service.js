const crypto = require('crypto');
const BlacklistedToken = require('../models/blacklisted.token');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/user.model');

const {
    generateAccessToken,
    generateRefreshToken,
} = require('../utils/generate.token');

const sendEmail = require('../utils/send.email');

// REGISTER USER
const registerUser = async (userData) => {
    const existingUser = await User.findOne({
        email: userData.email,
    });

    if (existingUser) {
        throw new Error('Email already registered');
    }

    // Security: Only allow 'tenant_admin' or 'candidate' via public registration
    // Super Admins must be created via DB seeding or by another Super Admin
    if (userData.role === 'super_admin') {
        throw new Error('Unauthorized: You cannot register as a super_admin');
    }

    // Default to candidate if no role is provided
    userData.role = userData.role || 'candidate';

    // tenantId required for tenant_admin users
    if (
        userData.role === 'tenant_admin' &&
        !userData.tenantId
    ) {
        throw new Error(
            'tenantId is required for tenant_admin users'
        );
    }

    const hashedPassword = await bcrypt.hash(
        userData.password,
        Number(process.env.BCRYPT_ROUNDS)
    );

    const verificationToken = uuidv4();

    const user = await User.create({
        ...userData,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
    });

    // Send Verification Email
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/v1/auth/verify-email/${verificationToken}`;
    
    await sendEmail(
        user.email,
        'Verify Your Email',
        `<h1>Welcome to TS Academy!</h1><p>Please click below to verify your email:</p><a href="${verificationUrl}">Verify Email</a>`
    ).catch(err => console.error('Verification email failed to send:', err.message));

    return user;
};



// LOGIN USER
const loginUser = async ({ email, password }) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordCorrect) {
        throw new Error('Invalid email or password');
    }

    const accessToken = generateAccessToken(user);

    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;

    await user.save();

    return {
        user,
        accessToken,
        refreshToken,
    };
};

//Logout User
const logoutUser = async (token) => {

    const decoded = jwt.decode(token);

    await BlacklistedToken.create({
        token,
        expiresAt: new Date(decoded.exp * 1000),
    });

    return true;
};

//EMAIL VERIFICATION FUNCTION
const verifyEmail = async (token) => {

    const user = await User.findOne({
        emailVerificationToken: token,
    });

    if (!user) {
        throw new Error('Invalid verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;

    await user.save();

    return user;
};

//FORGOT PASSWORD FUNCTION
const forgotPassword = async (email) => {

    const user = await User.findOne({ email });

    if (!user) {
        throw new Error('User not found');
    }

    const resetToken =
        crypto.randomBytes(32).toString('hex');

    user.passwordResetToken = resetToken;

    user.passwordResetExpires =
        Date.now() + 1000 * 60 * 30;

    await user.save();

    const resetUrl =
`http://localhost:5000/api/v1/auth/reset-password/${resetToken}`;

    await sendEmail(
        user.email,
        'Reset Password',
        `
        <h2>Password Reset</h2>
        <p>Click below to reset your password:</p>
        <a href="${resetUrl}">
            Reset Password
        </a>
        `
    );

    return true;
};

//RESET PASSWORD FUNCTION
const resetPassword = async (
    token,
    password
) => {

    const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: {
            $gt: Date.now(),
        },
    });

    if (!user) {
        throw new Error(
            'Invalid or expired reset token'
        );
    }

    const hashedPassword = await bcrypt.hash(
    password,
    Number(process.env.BCRYPT_ROUNDS)
 );

 user.password = hashedPassword;

    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await user.save();

    return true;
};

//REFRESH TOKEN FUNCTION
const refreshAccessToken = async (
    refreshToken
) => {

    if (!refreshToken) {
        throw new Error(
            'Refresh token required'
        );
    }

    const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user) {
        throw new Error('User not found');
    }

    if (user.refreshToken !== refreshToken) {
        throw new Error(
            'Invalid refresh token'
        );
    }

    const newAccessToken =
        generateAccessToken(user);

    return {
        accessToken: newAccessToken,
    };
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    verifyEmail,
    forgotPassword,
    resetPassword,
    refreshAccessToken,
};


