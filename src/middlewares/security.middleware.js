const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const securityHeaders = helmet({
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },

    noSniff: true,

    frameguard: {
        action: 'deny',
    },

    xssFilter: true,

    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self"],
        },
    },

    referrerPolicy: {
        policy: "strict-origin-when-cross-orgin",
    },
});

const generalLimiter = rateLimit({
    windowsMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
});

const authLimiter = rateLimit({
    windowsMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts. Please try again after 10 minutes.',
});

const adminLimiter = rateLimit({
    windowsMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Admin rate limit exceeded. Please slow down.',
});

const mongoSanitizer = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`Potential NoSQL injection detectedin ${key}`);
    },
});

const xssSanitizer = xss();
const sanitizeInput = [mongoSanitizer, xssSanitizer];

module.exports = { securityHeaders, generalLimiter, authLimiter, adminLimiter, sanitizeInput };