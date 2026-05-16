const { required } = require('joi');
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // Every notification must belong to a school (Tenant)
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: [true, 'tenantId is required'],
        index: true
    },
    // The user receiving the message
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Recipient ID is required'],
        index: true
    },
    // The main content of the notification
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true
    },
    message: {
        type: String,
        required: [true, 'Message body is required']
    },
    // determines if it appears in-app, via email, or both
    type: {
        type: String,
        enum: ['in-app', 'email', 'both'],
        default: 'in-app'
    },
    // Tracks if the user has opened the message in the app
    isRead: {
        type: Boolean,
        default: false,
    },
    deliveryStatus: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'sent'
    },
    deliveryError: {
        type: String,
        default: null
    },
    // Optional data (like an exam ID) to help the frontend redirect the user
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);