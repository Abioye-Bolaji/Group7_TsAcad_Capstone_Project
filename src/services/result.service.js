const Result = require('../models/result.model');
const Candidate = require('../models/candidate.model');
const Exam = require('../models/exam.model');
const { generateCertCode } = require('../utils/certificate.utils');

/**
 * @desc Result Service
 * Handles candidate results, grading, and certificate associations.
 * Scoped to tenant via tenantId.
 */

const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
};

/**
 * Create or Update a result after an exam attempt.
 */
const upsertResult = async (tenantId, payload) => {
    const { candidateId, examId, score, maxScore } = payload;

    const candidate = await Candidate.findOne({ _id: candidateId, tenantId });
    const exam = await Exam.findOne({ _id: examId, tenantId });

    if (!candidate || !exam) {
        throw new Error('Candidate or Exam not found within this organisation');
    }

    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const passed = percentage >= exam.passMark;
    const grade = calculateGrade(percentage);

    const resultData = {
        tenantId,
        candidateId,
        candidateName: candidate.name,
        email: candidate.email,
        examId,
        examName: exam.title,
        score,
        maxScore,
        percentage,
        grade,
        passed,
        status: passed ? 'Passed' : 'Failed',
        completionDate: new Date(),
    };

    // If passed and no certificate code exists, generate one
    const existingResult = await Result.findOne({ candidateId, examId, tenantId });
    if (passed && (!existingResult || !existingResult.certificateCode)) {
        resultData.certificateCode = generateCertCode();
        resultData.issueDate = new Date();
    }

    return await Result.findOneAndUpdate(
        { candidateId, examId, tenantId },
        { $set: resultData },
        { upsert: true, new: true }
    );
};

/**
 * Get all results for a tenant with filters.
 */
const getAllResults = async (tenantId, filters = {}) => {
    const query = { tenantId };
    if (filters.examId) query.examId = filters.examId;
    if (filters.passed !== undefined) query.passed = filters.passed;
    if (filters.search) {
        query.$or = [
            { candidateName: { $regex: filters.search, $options: 'i' } },
            { email: { $regex: filters.search, $options: 'i' } },
        ];
    }

    return await Result.find(query).sort({ createdAt: -1 }).lean();
};

const getResultById = async (id, tenantId) => {
    return await Result.findOne({ _id: id, tenantId }).lean();
};

const getResultByCandidateId = async (candidateId, tenantId) => {
    return await Result.find({ candidateId, tenantId }).sort({ createdAt: -1 }).lean();
};

const verifyCertificate = async (certificateCode) => {
    return await Result.findOne({ certificateCode })
        .select('candidateName examName percentage grade issueDate tenantId')
        .populate('tenantId', 'name logoUrl')
        .lean();
};

module.exports = {
    upsertResult,
    getAllResults,
    getResultById,
    getResultByCandidateId,
    verifyCertificate,
};
