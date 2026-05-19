require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db.config');
const initExamReminderJob = require('./jobs/reminder.job'); //F10


const PORT = process.env.PORT || 5000;

/**
 * @desc Server Entry Point
 * Connects to MongoDB first, then starts the Express server.
 * If DB connection fails, process.exit(1) is called in connectDB().
 */
const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
        console.log(`📡 Listening on: http://localhost:${PORT}`);
        console.log(`🏥 Health check: http://localhost:${PORT}/health`);
        console.log(`🏢 Tenant API:   http://localhost:${PORT}/api/v1/tenants\n`);

        // START THE CLOCK: Boot up the backgroup task manager (Notification: Exam reminder F10)
        initExamReminderJob();
    });
};

startServer();
