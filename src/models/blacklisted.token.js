const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

/**
 * TTL Index: MongoDB will automatically delete documents from this
 * collection once their 'expiresAt' date has passed.
 * This keeps the collection lean and auth checks fast.
 * expireAfterSeconds: 0 means "delete exactly at the expiresAt time".
 */
blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model(
    'BlacklistedToken',
    blacklistedTokenSchema
);