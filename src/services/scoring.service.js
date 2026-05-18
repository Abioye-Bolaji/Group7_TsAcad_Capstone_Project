const mongoose = require('mongoose');
const ExamSession = require('../models/exam-session.model');
const Exam = require('../models/exam.model');
const QuestionBank = require('../models/question-bank.model');
const Result = require('../models/result.model');

const { gradeSession } = require('../utils/grade-engine');
const sendNotification = require('../utils/notify');

const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
};

const gradeSubmittedSession = async (sessionId, tenantId) => {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const session = await ExamSession.findOne(
            { _id: sessionId, tenantId, status: 'submitted' },
            null,
            { session: dbSession }
        ).lean();

        if (!session) throw new Error('Session not found or not submitted');

        const exam = await Exam.findOne(
            { _id: session.examId, tenantId },
            null,
            { session: dbSession }
        ).lean();
        if (!exam) throw new Error('Exam not found');

        const questions = await QuestionBank.find(
            { _id: { $in: exam.questionIds }, tenantId },
            null,
            { session: dbSession }
        ).lean();

        const gradingResult = gradeSession(questions, session.answers, {
            totalMarks: exam.totalMarks,
            passMarkPercentage: exam.passMarkPercentage,
            negativeMarkingEnabled: exam.negativeMarkingEnabled,
            penaltyPerWrong: exam.penaltyPerWrong,
        });

        const [newResult] = await Result.create(
            [{
                tenantId,
                sessionId: session._id,
                examId: session.examId,
                candidateId: session.candidateId,
                candidateName: session.candidateName || 'Candidate', // Fallback
                email: session.email || 'candidate@cbt.com', // Fallback
                examName: exam.title,
                rawScore: gradingResult.rawScore,
                score: gradingResult.rawScore,
                totalMarks: gradingResult.totalMarks,
                maxScore: gradingResult.totalMarks,
                percentage: gradingResult.percentage,
                passed: gradingResult.passed,
                status: gradingResult.passed ? 'Passed' : 'Failed',
                grade: calculateGrade(gradingResult.percentage),
                answerBreakdown: gradingResult.answerBreakdown,
                manualGradingQueue: gradingResult.manualGradingQueue,
                gradingStatus: gradingResult.gradingStatus,
            }],
            { session: dbSession }
        );

        await dbSession.commitTransaction();

        setImmediate(() => {
            sendNotification(tenantId, String(session.candidateId), 'in-app', {
                subject: 'Exam Grading Complete',
                message: `Your exam "${exam.title}" has been graded. Your score is ${gradingResult.percentage}%.`,
                metadata: {
                    examId: exam._id,
                    resultId: String(newResult._id),
                    category: 'examResult',
                    requiresManualGrading: gradingResult.gradingStatus === 'pending_manual',
                }
            }).catch((err) => 
              console.error('Scoring and Autograding notification dispatch failed (non-fatal):', err.message)
            );
        });

        return newResult;

    } catch (err) {
        await dbSession.abortTransaction();
        throw err;

    } finally {
        dbSession.endSession();
    }
};

const getResultBySession = async (sessionId, tenantId) => {
    return Result.findOne({ sessionId, tenantId, gradingStatus: 'released' }).lean();
};

const getResultById = async (resultId, tenantId) => {
    return Result.findOne({ _id: resultId, tenantId }).lean();
};

const getResultByExam = async (examId, tenantId, filters = {}) => {
    return Result.find({ examId, tenantId, ...filters }).sort({ percentage: -1 }).lean();
};

const getPendingManualGrading = async (tenantId) => {
    return Result.find({ tenantId, gradingStatus: 'pending_manual' }).lean();
};

const submitManualGrade = async (resultId, questionId, marksAwarded, graderId, feedback, tenantId) => {
    const result = await Result.findOne({ _id: resultId, tenantId });
    if (!result) throw new Error('Result not found');
    if (result.gradingStatus === 'released') throw new Error('Cannot edit a released result');

    const entry = result.manualGradingQueue.find(
        (q) => String(q.questionId) === String(questionId)
    );

    if (!entry) throw new Error('Question not found in manual grading queue');
    if (marksAwarded < 0 || marksAwarded > entry.maxMarks)
        throw new Error(`Marks must be between 0 and ${entry.maxMarks}`);

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
    result.score = result.rawScore;
    result.percentage = result.totalMarks > 0
        ? Math.round((result.rawScore / result.totalMarks) * 10000) / 100 : 0;
    result.passed = result.percentage >= 50;
    result.status = result.passed ? 'Passed' : 'Failed';
    result.grade = calculateGrade(result.percentage);

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
    result.released = true;
    result.releasedAt = new Date();
    result.releasedBy = adminId;
    await result.save();

    sendNotification(tenantId, String(result.candidateId), 'in-app', {
        subject: 'Result Released',
        message: `Your exam result has been released. You scored ${result.percentage}%.`,
        metadata: {
            resultId: String(result._id),
            category: 'examResult',
        }
    }).catch((error) => console.error('Scoring and Autograding release notification failed (non-fatal):', error.message));

    return result;
};

module.exports = {
    gradeSubmittedSession,
    getResultBySession,
    getResultById,
    getResultByExam,
    getPendingManualGrading,
    submitManualGrade,
    releaseResult,
};