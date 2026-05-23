const { required } = require('joi');
const mongoose = require('mongoose');

/**
 * @desc Question Bank Model
 * Each tenant has their own question bank collection.
 * The tenantId field references the owning tenant.
 *
 * Strategy: Shared Database with tenantId field (agreed by team).
 */ 

const optionSchema = new mongoose.Schema({
    optionText: {
        type: String,
        required: [true, 'Option text is required'],
        trim: true,
    },

    isCorrect: {
        type: Boolean,
        default: false,
    },
});

const questionBankSchema = new mongoose.Schema(
    {
        // tenantId: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: 'Tenant',
        //     required: true,
        //     index: true,
        // },

        questionType:{
            type: String,
            enum: ['multiple_choice', 'true_false', 'short_answer'],
            required: true,
        },

        questionText: {
            type: String,
            required: [true, 'Question text is required'],
            trim: true,
        },

        imageUrl: {
            type: String,
            required: true,
        },

        options: {
            type: [optionSchema],
            validate: {
                validator: function (options) {
                // only enforce for multiple_choice and true_false
                if (['multiple_choice', 'true_false'].includes(this.questionType)) {
                    return options.some(opt => opt.isCorrect);
                }
                return true;  // short_answer skips this check
            },
            message: 'At least one option must be correct',
    },
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
        },

        correctAnswer: {
            type: String,
            trim: true,
            // only required when questionType is short_answer
            required: function () {
                return this.questionType === 'short_answer';
            },
        },

        /**
         * Track creator
         */
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        /**
         * Soft delete
         */
        isDeleted: {
            type: Boolean,
            default: false,
        },

        searchandfilter: {
            type: String,
        },

        version: {
            type: Number,
            default: 1,
        },

        isLocked: {
            type: Boolean,
            default: false,
        },

        parentQuestionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'QuestionBank',
        },
    },

    {
        timestamps: true,
    }
);

module.exports = mongoose.model('QuestionBank', questionBankSchema);