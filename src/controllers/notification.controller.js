const notificationService = require('../services/notification.service');
const { sendSuccess, sendError } = require('../utils/response');
const { createNotificationSchema, batchNotificationSchema, validateBody } = require('../validations/notification.validation');
const Candidate = require('../models/candidate.model');

/**
 * Handles sending a manual notification via API
 * This is used when an admin wants to send a specific message to a user.
 */
const createManualNotification = async (req, res, next) => {
    try {
        // Validate the request body using our Joi schema
        const errors = validateBody(createNotificationSchema, req.body);
        if (errors) {
            return sendError(res, 'Validation failed', 400, errors);
        }

        // Call the service to handle the logic.
        // We include req.tenantId to ensure the notification is saved to the correct school.
        const notification = await notificationService.sendNotification({
            ...req.body,
            tenantId: req.tenantId
        });

        return sendSuccess(res, 'Notification sent successfully', notification, 201);
    } catch (error) {
        next(error);
    }
};

/**
 * Handles sending a notification to an entire group or exam batch.
 */
const createBatchNotification = async (req, res, next) => {
    try {
        const errors = validateBody(batchNotificationSchema, req.body);
        if (errors) {
            return sendError(res, 'Validation failed', 400, errors);
        }

        const result = await notificationService.sendBatchNotification({
            ...req.body,
            tenantId: req.tenantId
        });

        return sendSuccess(res, 'Batch notifications processed', result, 201);
    } catch (error) {
        next(error);
    }
};

/**
 * Fetches all notifications for the currently logged-in user.
 * This allows candidates or staff to see their message feed.
 */
const getMyNotifications = async (req, res, next) => {
    try {
        // We use req.user._id (the logged-in person) and req.tenantId (their school)
        // This ensures they never see messages from another school.
        const notifications = await notificationService.getMyNotifications(
        req.tenantId,
        req.user._id
        );

        return sendSuccess(res, 'Notifications fetched successfuly', notifications);
    } catch (error) {
        next(error);
    }
};

/**
 * Marks a specific notification as 'read' so it no longer shows as new in the UI.
 */
const markRead = async (req, res, next) => {
    try {
        const { id } = req.params;

        const notification = await notificationService.markAsRead(
            id,
            req.tenantId,
            req.user._id
        );

        if (!notification) {
            return sendError(res, 'Notification not found or access denied', 404);
        }

        return sendSuccess(res, 'Notification marked as read', notification);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update candidate notification preferences
 * @route   PATCH /api/v1/notifications/preferences
 * @access  Private (Candidate)
 */

const updateMyPreferences = async (req, res, next) => {
    try {
        const candidateId = req.user.id;
        const tenantId = req.user.tenantId;

        const { examScheduled, examReminder, resultsReleased } = req.body;

        const updatedCandidate = await Candidate.findByIdAndUpdate(
            { _id: candidateId, tenantId },
            {
                $set: {
                    'notificationPreferences.examScheduled': examScheduled,
                    'notificationPreferences.examReminder': examReminder,
                    'notificationPreferences.resultReleased': resultsReleased
                }
            },
            { new: true, runValidators: true }
        ).select('notificationPreferences');

        if (!updatedCandidate) {
            return res.status(404).json({
                success: false,
                message: 'Candidate profile not found or tenant mismatch'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Notification preferences updated successfully',
            data: updatedCandidate.notificationPreferences
        });
    } catch (error) {
        next(error);
    }
}


module.exports = {
    createManualNotification,
    getMyNotifications,
    createBatchNotification,
    markRead,
    updateMyPreferences
};