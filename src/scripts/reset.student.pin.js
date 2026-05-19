require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Candidate = require('../models/candidate.model');

const resetPin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        const idNumber = 'FLEX-STUDENT-001';
        const newPin = '123456';
        const hashedPin = await bcrypt.hash(newPin, 12);

        const result = await Candidate.findOneAndUpdate(
            { idNumber },
            { $set: { accessPin: hashedPin } },
            { new: true }
        );

        if (result) {
            console.log(`✅ Success! PIN for ${idNumber} has been reset to: ${newPin}`);
        } else {
            console.log(`❌ Error: Student with ID ${idNumber} not found.`);
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error('Reset failed:', err.message);
        process.exit(1);
    }
};

resetPin();
