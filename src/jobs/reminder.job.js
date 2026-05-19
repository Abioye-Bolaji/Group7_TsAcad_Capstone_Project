const cron = require('node-cron');
const Exam = require('../models/exam.model');
const Candidate = require('../models/candidate.model');
const sendNotification = require('../utils/notify');

/**
 * Scheduled job that runs at minute 0 of every single hour.
 * Scans for exams starting exactly 24 hours from now and alerts assigned students.
 */

const initExamReminderJob = () => {
    // Schedule syntax: '0 * * * *' means run every hour on the hour
    cron.schedule('0 * * * *', async () => {
        console.log('Running hourly background scan for 24-hour exam reminders...');

        try {
            const now = new Date();

            const targetStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const targetEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

            // Query MongoDB for exams starting within this specific 1-hour bracket tomorrow
            const upcomingExams = await Exam.find({
                scheduledDate: {
                    $gte: targetStart,
                    $lt: targetEnd
                }
            }).select('_id title scheduledDate tenantId assignedCandidates');

            if (upcomingExams.length === 0) {
                console.log('Scan complete: No upcoming exams found matching the 24h window.');
                return;
            }

            console.log(`Found ${upcomingExams.length} exam(s) starting in 24 hours. Processing alerts...`);

            // Process each exam found
            for (const exam of upcomingExams) {
                const candidates = exam.assignedCandidates || [];

                if (candidates.length === 0) continue;

                // Send alerts to all assigned students simultaneously
                candidates.forEach((candidateId) => {
                    sendNotification(exam.tenantId, candidateId, 'both', {
                        subject: `Reminder: ${exam.title} starts tomorrow!`,
                        message: `Hello {{name}}, this is a quick reminder that your exam "{exam.title}" is scheduled to begin exactly 24 hours from now. Please ensure your workstation is ready.`,
                        metadata: {
                            category: 'examReminder', //Activates the custom preferences flag check
                            examId: exam._id
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Critical error inside exam reminder cron job:', error.message);
        }
    });
};

module.exports = initExamReminderJob;