require('dotenv').config();
const mongoose = require('mongoose');

const Tenant = require('../models/tenant.model');
const Candidate = require('../models/candidate.model');
const Exam = require('../models/exam.model');
const QuestionBank = require('../models/question-bank.model');
const Result = require('../models/result.model');

/**
 * @desc F9 Analytics Seed Script
 * Creates exam, questions, and result documents needed to test all analytics pipelines.
 * Run: node src/scripts/seed.analytics.js
 *
 * Prerequisites: Run `npm run seed:demo` first so tenants and candidates exist.
 */

const GRADES = (pct) => {
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    return 'F';
};

const seed = async () => {
    try {
        console.log('🧪 F9 Analytics Seed Script Starting...');

        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        // Find a tenant that has candidates
        const candidate = await Candidate.findOne({});
        if (!candidate) {
            console.error('❌ No candidates found in the database. Run npm run seed:demo first.');
            process.exit(1);
        }

        const tenant = await Tenant.findById(candidate.tenantId);
        if (!tenant) {
            console.error('❌ Tenant for the candidate not found.');
            process.exit(1);
        }

        const candidates = await Candidate.find({ tenantId: tenant._id }).limit(5);
        if (candidates.length === 0) {
            console.error('❌ No candidates found for tenant. Run npm run seed:demo first.');
            process.exit(1);
        }

        console.log(`   Using tenant: ${tenant.name} (${tenant._id})`);
        console.log(`   Found ${candidates.length} candidate(s)`);

        // ─── Create Questions (10 per exam) ───────────────────────────────
        const difficulties = ['easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard'];
        const questionIds = [];

        for (let i = 0; i < 10; i++) {
            const q = await QuestionBank.create({
                tenantId: tenant._id,
                questionType: 'multiple-choice',
                questionText: `Analytics Test Question ${i + 1}`,
                imageUrl: 'https://placeholder.co/1',
                difficulty: difficulties[i],
                options: [
                    { optionText: 'Option A', isCorrect: i % 2 === 0 },
                    { optionText: 'Option B', isCorrect: i % 2 !== 0 },
                    { optionText: 'Option C', isCorrect: false },
                    { optionText: 'Option D', isCorrect: false },
                ],
            });
            questionIds.push(q._id);
        }
        console.log(`   ✅ ${questionIds.length} questions created`);

        // ─── Create Exam ──────────────────────────────────────────────────
        const exam = await Exam.create({
            title: 'F9 Analytics Demo Exam',
            subject: 'General Knowledge',
            duration: 60,
            totalMarks: 100,
            passMark: 60,
            status: 'published',
            tenantId: tenant._id,
            questions: questionIds,
        });
        console.log(`   ✅ Exam created: ${exam.title} (${exam._id})`);

        // ─── Create a second exam for candidate trend testing ─────────────
        const exam2 = await Exam.create({
            title: 'F9 Analytics Demo Exam 2',
            subject: 'Mathematics',
            duration: 45,
            totalMarks: 100,
            passMark: 50,
            status: 'published',
            tenantId: tenant._id,
            questions: questionIds,
        });
        console.log(`   ✅ Exam 2 created: ${exam2.title} (${exam2._id})`);

        // ─── Percentage spreads for 15+ results ──────────────────────────
        // Distributed so all bucket ranges (0-20, 20-40, 40-60, 60-80, 80-100) are populated
        const percentages = [
            5, 12, 18,       // 0-20 bucket
            25, 33, 38,     // 20-40 bucket
            42, 50, 55,     // 40-60 bucket
            62, 70, 75,     // 60-80 bucket
            82, 90, 97,     // 80-100 bucket
        ];

        // ─── Create Results for Exam 1 ───────────────────────────────────
        let resultCount = 0;
        for (let i = 0; i < percentages.length; i++) {
            const candidate = candidates[i % candidates.length];
            const pct = percentages[i];
            const score = Math.round((pct / 100) * exam.totalMarks);
            const passed = pct >= exam.passMark;

            // Build answerBreakdown
            const answerBreakdown = questionIds.map((qId, qIdx) => {
                const isCorrect = Math.random() * 100 < pct; // probabilistic based on score
                return {
                    questionId: qId,
                    candidateAnswer: isCorrect ? 'Option A' : 'Option C',
                    correctAnswer: 'Option A',
                    isCorrect,
                    marksAwarded: isCorrect ? 10 : 0,
                    marksAvailable: 10,
                };
            });

            await Result.create({
                tenantId: tenant._id,
                candidateId: candidate._id,
                candidateName: candidate.name || `Candidate ${i + 1}`,
                email: candidate.email || `candidate${i + 1}@test.com`,
                examId: exam._id,
                examName: exam.title,
                score,
                rawScore: score,
                maxScore: exam.totalMarks,
                totalMarks: exam.totalMarks,
                percentage: pct,
                grade: GRADES(pct),
                status: passed ? 'Passed' : 'Failed',
                passed,
                released: i < 13, // 13 released, 2 unreleased (for release guard testing)
                gradingStatus: i < 14 ? 'auto_graded' : 'pending_manual',
                completionDate: new Date(Date.now() - (percentages.length - i) * 86400000),
                answerBreakdown,
            });
            resultCount++;
        }
        console.log(`   ✅ ${resultCount} results created for Exam 1`);

        // ─── Create Results for Exam 2 (for candidate trend testing) ─────
        const trendPercentages = [40, 50, 60, 70, 80]; // improving trend for first candidate
        let trendCount = 0;
        for (let i = 0; i < trendPercentages.length; i++) {
            const candidate = candidates[0]; // same candidate across multiple exams
            const pct = trendPercentages[i];
            const score = Math.round((pct / 100) * exam2.totalMarks);
            const passed = pct >= exam2.passMark;

            const answerBreakdown = questionIds.map((qId) => {
                const isCorrect = Math.random() * 100 < pct;
                return {
                    questionId: qId,
                    candidateAnswer: isCorrect ? 'Option B' : 'Option D',
                    correctAnswer: 'Option B',
                    isCorrect,
                    marksAwarded: isCorrect ? 10 : 0,
                    marksAvailable: 10,
                };
            });

            await Result.create({
                tenantId: tenant._id,
                candidateId: candidate._id,
                candidateName: candidate.name || 'Candidate 1',
                email: candidate.email || 'candidate1@test.com',
                examId: exam2._id,
                examName: exam2.title,
                score,
                rawScore: score,
                maxScore: exam2.totalMarks,
                totalMarks: exam2.totalMarks,
                percentage: pct,
                grade: GRADES(pct),
                status: passed ? 'Passed' : 'Failed',
                passed,
                released: true,
                gradingStatus: 'auto_graded',
                completionDate: new Date(Date.now() - (trendPercentages.length - i) * 172800000),
                answerBreakdown,
            });
            trendCount++;
        }
        console.log(`   ✅ ${trendCount} results created for Exam 2 (trend testing)`);

        // ─── Summary ──────────────────────────────────────────────────────
        console.log('\n✨ F9 Analytics seeding completed!');
        console.log('──────────────────────────────────────────');
        console.log(`   Tenant ID:      ${tenant._id}`);
        console.log(`   Exam 1 ID:      ${exam._id}`);
        console.log(`   Exam 2 ID:      ${exam2._id}`);
        console.log(`   Candidate ID:   ${candidates[0]._id} (for trend test)`);
        console.log(`   Total Results:   ${resultCount + trendCount}`);
        console.log('──────────────────────────────────────────');
        console.log('\nTest with:');
        console.log(`   GET /api/v1/analytics/exams/${exam._id}/stats`);
        console.log(`   GET /api/v1/analytics/exams/${exam._id}/scorers?type=top`);
        console.log(`   GET /api/v1/analytics/exams/${exam._id}/questions`);
        console.log(`   GET /api/v1/analytics/exams/${exam._id}/subjects`);
        console.log(`   GET /api/v1/analytics/candidates/${candidates[0]._id}`);
        console.log(`   GET /api/v1/analytics/platform/summary`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seed();
