const Candidate = require('../models/candidate.model')
const Exam = require('../models/exam.model');
const Notification = require('../models/notification.model');
const sendEmail = require('../utils/send.email');
const Tenant = require('../models/tenant.model');
const { generateEmailTemplate } = require('../utils/email.template');

/**
 * Core utility for the entire platform.
 */
const sendNotification = async (data) => {
    let { tenantId, recipientId, subject, message, type, recipientEmail, metadata } = data;

    if (!recipientEmail && (type === 'email' || type === 'both')) {
        const candidate = await Candidate.findOne({ _id: recipientId, tenantId }).select('email');
        if (candidate) {
            recipientEmail = candidate.email;
        }
    }

    // Determine initial delivery status
    const initialStatus = (type === 'email' || type === 'both') ? 'pending' : 'sent';

    // Save to database for in-app notification feed
    const notification = await Notification.create({
        tenantId,
        recipientId,
        subject,
        message,
        type: type || 'in-app',
        deliveryStatus: initialStatus,
        metadata
    });

    // If email is required, send it in the background
    if ((type === 'email' || type === 'both') && recipientEmail) {
        // If no email address exists, fail immediately and stop the process
        if (!recipientEmail) {
            await Notification.findByIdAndUpdate(notification._id, {
                deliveryStatus: 'failed',
                deliveryError: 'Recipient email address is missing or undefined on candidate profile'
            });
            return notification;
        }

        // Look up the candidate's custom preferences flags
        const recipientProfile = await Candidate.findById(recipientId).select('notificationPreferences');

        // Stop right here if they explicitly turned off this specific alert channel
        if (recipientProfile && recipientProfile.notificationPreferences && metadata && metadata.category) {
            const isAllowed = recipientProfile.notificationPreferences[metadata.category];
            if (isAllowed === false) {
                await Notification.findByIdAndUpdate(notification._id, {
                    deliveryStatus: 'failed',
                    deliveryError: `User opted out of '${metadata.category}' email alerts via preferences dashboard`
                });
                return notification;
            }
        }

        // Fetch school branding dynamically and send
        const school = await Tenant.findById(tenantId).select('name');
        const brandName = school ? school.name : 'CBT Portal';

        const htmlContent = generateEmailTemplate(subject, message, brandName);

        sendEmail(recipientEmail, subject, htmlContent)
        .then(async () => {
            // If the STMP server accepts the mail, update status to 'sent'
            await Notification.findByIdAndUpdate(notification._id, {
                deliveryStatus: 'sent'
            });
        })
        .catch(async (err) => {
            console.error('Backround email delivery failed: ', err.message);
            // If the email bounces or fails, mark as 'failed' and log the result
            await Notification.findByIdAndUpdate(notification._id, {
                deliveryStatus: 'failed',
                deliveryError: err.message
            });
        });
    }

    return notification;
};

/**
 * Sends a notification to multiple users based on a group or exam.
 */
const sendBatchNotification = async (batchData) => {
    const { tenantId, groupId, examId, subject, message, type, metadata } = batchData;

    // This array will hold the compiled list of candidate ObjectIds
    let targetCandidateIds = [];

    // Targeting specific candidate group
    if (groupId) {
        const candidateInGroup = await Candidate.find({ tenantId, 
            groupIds: groupId
        }).select('_id');
        targetCandidateIds = candidateInGroup.map(c => c._id);
    }
    // Targeting an exams assigned candidate list
    else if (examId) {
        const exam = await Exam.findOne({ _id: examId, tenantId }).select('assignedCandidates');
        if (!exam) {
            throw new Error('Exam not found or access denied');
        }
        // Extract the directly assigned candidates from the exam document
        targetCandidateIds = exam.assignedCandidates || [];
    }
    
    // Fallback if no candidates are linked to the targets
    if (targetCandidateIds.length === 0) {
        throw new Error('No target candidates found for the specified group or exam selection');
    }

    // Fetch the full records for the target IDs found
    const candidates = await Candidate.find({
        _id: { $in: targetCandidateIds },
        tenantId
    }).select('_id email name');

    const notificationPromises = candidates.map((candidate) => {
        const firstName = candidate.name ? candidate.name.split(' ')[0] : 'Candidate';

        const personalizedMessage = message.replace(`{{name}}`, firstName);

        return sendNotification({
            tenantId,
            recipientId: candidate._id,
            recipientEmail: candidate.email,
            subject,
            message: personalizedMessage,
            type,
            metadata
        });
    });

    const results = await Promise.allSettled(notificationPromises);

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`Batch student index [${index}] failed because:`, result.reason);
        }
    });

    // Notification logs
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
        totalProcessed: candidates.length,
        successful,
        failed
    };
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
    sendBatchNotification,
    getMyNotifications,
    markAsRead
};