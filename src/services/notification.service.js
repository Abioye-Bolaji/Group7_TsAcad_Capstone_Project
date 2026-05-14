const Notification = require('../models/notification.model');
const sendEmail = require('../utils/send.email');

/**
 * Core utility for the entire platform.
 * Teammates from F7, F8, etc., will call this function.
 */
const sendNotification = async (data) => {
    const { tenantId, recipientId, subject, message, type, recipientEmail, metadata } = data;

    // Save to database for in-app notification feed
    const notification = await Notification.create({
        tenantId,
        recipientId,
        subject,
        message,
        type: type || 'in-app',
        metadata
    });

    // If email is required, send it in the background
    if (type === 'email' || type === 'both') {
        // We do not 'await' this so the API stays fast
        sendEmail(recipientEmail, subject, message).catch((err) => {
            console.error('Backround email failed: ', err.message);
        });
    }

    return notification;
};

const getMyNotifications = async (tenantId, userId) => {
    // We filter by BOTH tenantId and userId to ensure isolation
    return await Notification.find({ tenantId, recipientId: userId })
        .sort({ createdAt: -1 })
        .lean();
};

const markAsRead = async (notificationId, tenantId, userId) => {
    return await Notification.findOneAndUpdate(
        { _id: notificationId, tenantId, recipientId: userId },
        { isRead: true },
        { new: true }
    ).lean();
};

module.exports = {
    sendNotification,
    getMyNotifications,
    markAsRead
};