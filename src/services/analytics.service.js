const mongoose = require('mongoose');
const Result = require('../models/result.model');
const Exam = require('../models/exam.model');

/**
 * @desc Feature F9 Analytics Service
 * Contains all aggregation pipelines for Groups 1–6.
 */

// ─── GROUP 1: Exam Statistics ─────────────────────────────────────────────────

const getExamStats = async ({ examId, tenantId }) => {
    const matchStage = {
        examId: new mongoose.Types.ObjectId(examId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
        gradingStatus: { $in: ['auto_graded', 'fully_graded', 'released'] },
    };

    const [statsResult, distributionResult] = await Promise.all([
        Result.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$examId',
                    totalAttempts: { $sum: 1 },
                    averageScore: { $avg: '$percentage' },
                    highestScore: { $max: '$percentage' },
                    lowestScore: { $min: '$percentage' },
                    totalPassed: { $sum: { $cond: ['$passed', 1, 0] } },
                    totalFailed: { $sum: { $cond: ['$passed', 0, 1] } },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalAttempts: 1,
                    averageScore: { $round: ['$averageScore', 1] },
                    highestScore: 1,
                    lowestScore: 1,
                    totalPassed: 1,
                    totalFailed: 1,
                    passRate: {
                        $round: [
                            { $multiply: [{ $divide: ['$totalPassed', '$totalAttempts'] }, 100] },
                            1,
                        ],
                    },
                    failRate: {
                        $round: [
                            { $multiply: [{ $divide: ['$totalFailed', '$totalAttempts'] }, 100] },
                            1,
                        ],
                    },
                },
            },
        ]),
        Result.aggregate([
            { $match: matchStage },
            {
                $bucket: {
                    groupBy: '$percentage',
                    boundaries: [0, 20, 40, 60, 80, 100],
                    default: '100',
                    output: { count: { $sum: 1 } },
                },
            },
        ]),
    ]);

    const rangeLabels = { 0: '0-20', 20: '20-40', 40: '40-60', 60: '60-80', 80: '80-100', '100': '100' };
    const distribution = distributionResult.map((b) => ({
        range: rangeLabels[b._id] || `${b._id}+`,
        count: b.count,
    }));

    const summary = statsResult[0] || {
        totalAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        totalPassed: 0,
        totalFailed: 0,
        passRate: 0,
        failRate: 0,
    };

    return { ...summary, distribution };
};

// ─── GROUP 2: Top and Bottom Scorers ──────────────────────────────────────────

const getExamScorers = async ({ examId, tenantId, type = 'top', limit = 10 }) => {
    const safeLimit = Math.min(Number(limit) || 10, 20);
    const sortDirection = type === 'top' ? -1 : 1;

    const scorers = await Result.find({
        examId: new mongoose.Types.ObjectId(examId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
        released: true,
    })
        .sort({ percentage: sortDirection })
        .limit(safeLimit)
        .select('candidateName email percentage grade passed completionDate')
        .lean();

    return { type, limit: safeLimit, scorers };
};

// ─── GROUP 3: Question Performance Analysis ───────────────────────────────────

const getQuestionPerformance = async ({ examId, tenantId }) => {
    const items = await Result.aggregate([
        {
            $match: {
                examId: new mongoose.Types.ObjectId(examId),
                tenantId: new mongoose.Types.ObjectId(tenantId),
                gradingStatus: { $ne: 'pending_manual' },
            },
        },
        { $unwind: '$answerBreakdown' },
        {
            $group: {
                _id: '$answerBreakdown.questionId',
                totalAttempted: { $sum: 1 },
                totalCorrect: { $sum: { $cond: ['$answerBreakdown.isCorrect', 1, 0] } },
                avgMarksAwarded: { $avg: '$answerBreakdown.marksAwarded' },
                marksAvailable: { $first: '$answerBreakdown.marksAvailable' },
            },
        },
        {
            $project: {
                _id: 0,
                questionId: '$_id',
                totalAttempted: 1,
                totalCorrect: 1,
                avgMarksAwarded: { $round: ['$avgMarksAwarded', 2] },
                marksAvailable: 1,
                correctRate: {
                    $round: [
                        { $multiply: [{ $divide: ['$totalCorrect', '$totalAttempted'] }, 100] },
                        1,
                    ],
                },
                poorQualityFlag: {
                    $lt: [
                        { $multiply: [{ $divide: ['$totalCorrect', '$totalAttempted'] }, 100] },
                        30,
                    ],
                },
            },
        },
        {
            $lookup: {
                from: 'questionbanks',
                localField: 'questionId',
                foreignField: '_id',
                as: 'questionDetails',
                pipeline: [
                    { $project: { questionText: 1, questionType: 1, difficulty: 1 } },
                ],
            },
        },
        { $unwind: { path: '$questionDetails', preserveNullAndEmptyArrays: true } },
        { $sort: { correctRate: 1 } },
    ]);

    return { items };
};

// ─── GROUP 4: Candidate Performance Trends ────────────────────────────────────

const getCandidatePerformanceTrend = async ({ candidateId, tenantId }) => {
    const results = await Result.aggregate([
        {
            $match: {
                candidateId: new mongoose.Types.ObjectId(candidateId),
                tenantId: new mongoose.Types.ObjectId(tenantId),
                released: true,
            },
        },
        { $sort: { completionDate: 1 } },
        {
            $group: {
                _id: '$candidateId',
                exams: {
                    $push: {
                        examId: '$examId',
                        examName: '$examName',
                        percentage: '$percentage',
                        grade: '$grade',
                        passed: '$passed',
                        completionDate: '$completionDate',
                    },
                },
                totalExamsTaken: { $sum: 1 },
                averageScore: { $avg: '$percentage' },
                bestScore: { $max: '$percentage' },
                worstScore: { $min: '$percentage' },
                totalPassed: { $sum: { $cond: ['$passed', 1, 0] } },
            },
        },
        {
            $project: {
                _id: 0,
                totalExamsTaken: 1,
                averageScore: { $round: ['$averageScore', 1] },
                bestScore: 1,
                worstScore: 1,
                totalPassed: 1,
                exams: 1,
            },
        },
    ]);

    const data = results[0] || {
        totalExamsTaken: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        totalPassed: 0,
        exams: [],
    };

    // Trend calculation in JavaScript (spec requirement)
    let trend = 'stable';
    if (data.exams.length >= 4) {
        const midpoint = Math.floor(data.exams.length / 2);
        const firstHalf = data.exams.slice(0, midpoint);
        const secondHalf = data.exams.slice(midpoint);
        const avg = (arr) => arr.reduce((s, e) => s + e.percentage, 0) / arr.length;
        const diff = avg(secondHalf) - avg(firstHalf);
        trend = diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
    }

    return { ...data, trend };
};

// ─── GROUP 5: Subject / Topic Breakdown ───────────────────────────────────────
// NOTE: QuestionBank model currently uses "difficulty" rather than "topic".
// Pipeline groups by difficulty. If a "topic" field is added later, swap the $group _id.

const getSubjectBreakdown = async ({ examId, tenantId }) => {
    const items = await Result.aggregate([
        {
            $match: {
                examId: new mongoose.Types.ObjectId(examId),
                tenantId: new mongoose.Types.ObjectId(tenantId),
                gradingStatus: { $ne: 'pending_manual' },
            },
        },
        { $unwind: '$answerBreakdown' },
        {
            $lookup: {
                from: 'questionbanks',
                localField: 'answerBreakdown.questionId',
                foreignField: '_id',
                as: 'questionMeta',
                pipeline: [
                    { $project: { difficulty: 1, questionType: 1 } },
                ],
            },
        },
        { $unwind: { path: '$questionMeta', preserveNullAndEmptyArrays: false } },
        {
            $group: {
                _id: '$questionMeta.difficulty',
                totalAnswered: { $sum: 1 },
                totalCorrect: { $sum: { $cond: ['$answerBreakdown.isCorrect', 1, 0] } },
                avgMarks: { $avg: '$answerBreakdown.marksAwarded' },
            },
        },
        {
            $project: {
                _id: 0,
                difficulty: '$_id',
                totalAnswered: 1,
                totalCorrect: 1,
                avgMarks: { $round: ['$avgMarks', 2] },
                correctRate: {
                    $round: [
                        { $multiply: [{ $divide: ['$totalCorrect', '$totalAnswered'] }, 100] },
                        1,
                    ],
                },
                weakFlag: {
                    $lt: [
                        { $multiply: [{ $divide: ['$totalCorrect', '$totalAnswered'] }, 100] },
                        50,
                    ],
                },
            },
        },
        { $sort: { correctRate: 1 } },
    ]);

    return { items };
};

// ─── GROUP 6: Platform-Wide Summary (Super Admin) ─────────────────────────────

const getPlatformSummary = async () => {
    const [totals, mostActiveTenants, tenantAverages] = await Promise.all([
        // Pipeline A — platform totals
        Result.aggregate([
            {
                $group: {
                    _id: null,
                    totalResults: { $sum: 1 },
                    avgPlatformScore: { $avg: '$percentage' },
                    totalPassed: { $sum: { $cond: ['$passed', 1, 0] } },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalResults: 1,
                    avgPlatformScore: { $round: ['$avgPlatformScore', 1] },
                    totalPassed: 1,
                },
            },
        ]),
        // Pipeline B — most active tenants (by exam count)
        Exam.aggregate([
            {
                $group: {
                    _id: '$tenantId',
                    examCount: { $sum: 1 },
                },
            },
            { $sort: { examCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'tenants',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'tenant',
                    pipeline: [{ $project: { name: 1 } }],
                },
            },
            { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    tenantId: '$_id',
                    tenantName: '$tenant.name',
                    examCount: 1,
                },
            },
        ]),
        // Pipeline C — per-tenant average score
        Result.aggregate([
            {
                $group: {
                    _id: '$tenantId',
                    resultCount: { $sum: 1 },
                    avgScore: { $avg: '$percentage' },
                },
            },
            {
                $lookup: {
                    from: 'tenants',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'tenant',
                    pipeline: [{ $project: { name: 1 } }],
                },
            },
            { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    tenantId: '$_id',
                    tenantName: '$tenant.name',
                    resultCount: 1,
                    avgScore: { $round: ['$avgScore', 1] },
                },
            },
            { $sort: { resultCount: -1 } },
        ]),
    ]);

    return {
        totals: totals[0] || { totalResults: 0, avgPlatformScore: 0, totalPassed: 0 },
        mostActiveTenants,
        tenantAverages,
    };
};

module.exports = {
    getExamStats,
    getExamScorers,
    getQuestionPerformance,
    getCandidatePerformanceTrend,
    getSubjectBreakdown,
    getPlatformSummary,
};
