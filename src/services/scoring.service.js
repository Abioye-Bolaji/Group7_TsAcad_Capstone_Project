const mongoose = require('mongoose');
const examSession = require('../models/exam-session.model');
const exam = require('../models/exam.model');
const question = require('../models/question.model');
const result = require('../models/scoring-result.model');

const { gradeSession } = require('..utils/grading-engine');
const { sendNotification } = require('..utils/notify');


const gradeSubmittedSession = async (sessionId, tenantId) => {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const session = await ExamSession.findOne(
            { _id: sessionId, tenantId, status: 'submitted' },
            null,
            { session: dbSession }

        ).lean();

        if (!session) throw new Error('Session not found');

        const exam = await Exam.findOne(
            { _id: session.examId, tenantId },
            null,
            { session: dbSession }
        ).lean();
        if (!exam) throw new Error('Exam not found');

        const questions = await question.find(
            { _id: { $in: exam.questionIds }, tenantId },
            null,
            { session: dbSession }
        ).lean();

        const gradingResult = gradeSesssion(questions, session.answers, {
            totalMarks: exam.totalMarks,
            passMarkPercentage: exam.passMarkPercentage,
            negativeMarkingEnabled: exam.negativeMarkingEnabled,
            penaltyPerWrong: exam.penaltyPerWrong,
        });

        const { result } = await Result.create(
            [{
                tenantId,
                sessionId: session._id,
                examId: session.examId,
                candidateId: session.candidateId,
                rawScore: gradingResult.rawScore,
                totalMarks: gradingResult.totalMarks,
                percentage: gradingResult.percentage,
                passed: gradingResult.passed,
                answerBreakdown: gradingResult.answerBreakdown,
                manualGradingQueue: gradingResult.manualGradingQueue,
                gradingStatus: gradingResult.gradingStatus,
            }],
            { session: dbSession }
        );

        await dbSession.commitTransaction();

        setImmdeiate(() => {
            sendNotification(tenantId, String(session.candidateId), 'GRADING_COMPLETE', {
                examTitle: exam.title,
                percentage: gradingResult.percentage,
                passed: gradingResult.passed,
                resultId: String(result_id),
                requiresManualGrading: gradingResult.gradingStatus === 'pending_manual',
            }).catch((err) => 
              console.error('Scoring and Autograding notification dispatch failed (non-fatal):', err.message)
            );
        });

        return result;

    } catch (err) {
        await dbSession.abortTransaction();
        throw err;

    } finally {
        dbSession.endSession();
    }
};

const getResultBySession= async (sessionId, tenantId) => {
    return Result.findOne({ sessionId, tenantId, gradingStatus: 'released' }).lean();
};

const getResultById = async (resultId, tenantId) => {
    return Result.findOne({ _id: resultId, tenantId }).lean();
};

const getResultsByExam  = async (examId, tenantId, filters = {}) => {
    return Result.find({ examId, tenantId, ...filters }).sort({ percentage: -1 }).lean();
};

const getPendingManualGrading = async (tenantId) => {
    return Result.find({ tenantId, gradingStatus: 'pending_manual' }).lean();
};

const submitManulaGrade = async (resultId, questionId, marksAwarded, graderId, WebGLTransformFeedback, tenantId) => {
    const result = await Result.findOne({ _id: resultId, tenantId });
    if (!result) throw new Error('Result not found');
    if (result.gradingStatus === 'released') throw new Error('Cannot edit a released result');

    const entry = result.manualGradingQueue.find(
        (q) => String(q.questionId) === String(questionId)
    );

    if (!entry) throw new Error('Question not found in manual grading queue');
    if (marksAwarded < 0 || marksAwarded > entry.maxMarks)
        throw new Error(`Marks must be between 0 and ${entry.max}`);


    entry.marksAwarded = marksAwarded;
    entry.gradedBy = graderId;
    entry.gradedAt = new Date();
    entry.feedback = feedback || '';

    const breakdown = result.answerBreakdown.find(
        (b) => String(b.questionId) === String(questionId)
    );
    if (breakdown) {
        breakdown.marksAwarded = marksAwarded;
        breakdown.isCorrect = marksAwarded > 0;
    }

    const autoTotal = result.answerBreakdown
    .filter((b) => !b.requiresManualGrading)
    .reduce((sum, b) => sum + (b.marksAwarded ?? 0), 0);

    const manualTotal = result.manualGradingQueue
    .reduce((sum, q) => sum + (q.marksAwarded ?? 0), 0);

    result.rawScore = Math.max(0, autoTotal + manualTotal);
    result.percentage = result.totalMarks > 0
    ? Math.round((result.rawScore / result.totalMarks) * 1000) / 100 : 0;
    result.passed = result.percentage >= 50;

    const allDone = result.manualGradingQueue.every((q) => q.marksAwarded !== null);
    if (allDone) result.gradingStatus = 'fully_graded';

    await result.save();
    return result;
};

const releaseResult = async (resultId, tenantId, adminId) => {
    const result = await Result.findOne({ _id: resultId, tenantId });
    if (!result) throw new Error('Result not found');
    if (result.gradingStatus === 'pending_manual')
      throw new Error('Cannot release - manual grading is still pending');

    result.gradingStatus = 'released';
    result.releasedAt = new Date();
    result.releasedBy = adminId;
    await result.save();

    sendNotification(tenantId, String(result.candidateId, 'RESULT_RELEASED', {
        resultId: String(result._id),
        percentage: result.percentage,
        passed: result.passed,
    }).catch((error) => console.error('Scoring and Autograding release notification failed (non-fatal):', err.message)
));

return result;
};

module.exports = {
    gradeSubmittedSession,
    getResultBySession,
    getResultById,
    getResultByExam,
    getPendingMnaualGrading,
    submitManualGrade,
    releaseResult,
};