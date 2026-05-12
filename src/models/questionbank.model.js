const mongoose = require('mongoose');

/**
 * @desc Question Bank Model
 * Each tenant has their own question bank collection.
 * The tenantId field references the owning tenant.
 *
 * Strategy: Shared Database with tenantId field (agreed by team).
 */ 
const questionBankSchema = new mongoose.Schema(
    {
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true, // For faster queries by tenantId
        },

        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
            index: true, // For faster queries by studentId
        },

        questionText: {
            type: String,
            required: [true, 'Question text is required'],
            trim: true,
        },

        options: [
            {
                optionText: {
                    type: String,
                    required: [true, 'Option text is required'],
                    trim: true,
                },
                isCorrect: {
                    type: Boolean,
                    default: false,
                },

            },
        ],
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
        },
        
    }
);

module.exports = mongoose.model('QuestionBank', questionBankSchema);