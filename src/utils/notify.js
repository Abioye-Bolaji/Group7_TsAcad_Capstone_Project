const notificationService = require('../services/notification.service');

/**
 * Shared cross-team notification utility.
 * * @param {String} tenantId - The active school/tenant database ID
 * @param {String} recipientId - The candidate's database ID
 * @param {String} type - The delivery channel ('in-app', 'email', or 'both')
 * @param {Object} data - Payload object containing { subject, message, metadata }
 */

const sendNotification = async (tenantId, recipientId, type, data) => {
    try {
        return await notificationService.sendNotification({
            tenantId,
            recipientId,
            type,
            subject: data.subject,
            message: data.message,
            metadata: data.metadata || null
        });
    } catch (error) {
        console.error(`Global notification utility failed for recipient ${recipientId}:`, error.message);
        return null;
    }
};

module.exports = sendNotification;