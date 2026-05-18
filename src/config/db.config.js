const mongoose = require('mongoose');

/**
 * @desc Connects to MongoDB using the MONGO_URI from environment variables.
 * Called once at server startup in server.js
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1); // Kill the server if DB fails
    }
};

module.exports = connectDB;
