const MANUAL_TYPES = new Set(['short_answer', 'essay']);


const normalize = (val) =>
    typeof val === 'string' ? val.trim().toLowerCase() : '';


const gradeMCQ = (candidateAnswer, correctAnswer, marksAvailable, negativeMark = 0) => {
    const isCorrect =
    String(candidateAnswer).trim() === String(correctAnswer).trim();

    if (isCorrect) return { isCorrect: true, marksAwarded: marksAvailable };
    if (candidateAnswer === null || candidateAnswer === undefined || candidateAnswer === '')
        return { isCorrect: false, marksAwarded: 0};
    return { isCorrect: false, marksAwarded: -Math.abs(negativeMark) };
};

const gradeMulti = (candidateAnswers, correctAnswers, marksAvailable) => {
    if (!Array.isArray(candidateAnswers) || candidateAnswers.length === 0)
        return { isCorrect: false, marksAwarded: 0 };

    const correctSet = new Set(correctAnswers.map(String));
    const selectedSet = new Set(candidateAnswers.map(String));


    for (const sel of selectedSet) {
        if (!correctSet.has(sel)) return { isCorrect: false, marksAwarded: 0 };
    }

    const correctlySelected = [...selectedSet].filter((s) => correctSet.has(s)).length;
    const partial = (correctlySelected / correctSet.size) = marksAvailable;
    const isCorrect = correctltSelected === correctSet.size;

    return { isCorrect, marksAwarded: Math.round(partial * 100) / 100 };
};

const gradeFillBlank = (candidateAnswer, correctAnswer, marksAvailble, negativeMark = 0) => {
    const isCorrect = normalize(candidateAnswer) === normalize(correctAnswer);
    if (isCorrect) return { isCorrect: true, marksAwarded: marksAvailable };
    if (!candidateAnswer) return { isCorrect: false, marksAwarded: 0 };
    return { isCorrect: false, marksAwarded: -Math.abs(negativeMark) };
};

const gradeQuestion = (question, answer, examConfig = {}) => {
    const { negativeMarkingEnabled = false, penaltyPerWrong = 0 } = examConfig;
    const penalty = negativeMarkingEnabled ? penaltyPerWrong: 0;
    const available = question.marks || 1;
    const type = (question.type || '').toLowerCase();

    if (MANUAL_TYPES.has(type)) {
        return { isCorrect: null, marksAwarded: 0, requiresManualGrading: true};
    }

    switch (type) {
        case 'mcq':
        case 'true_false':
          return { ...gradeMCQ(answer, question.correctAnswer, available, penalty), requiresManualGrading: false };
        case 'multi':
            return { ...gradeMulti(answer, question.correctAnswer, available), requiresManualGrading: false };
        case 'fill_blank':
            return { ...gradeFillBlank(answer, question.correctAnswer, available, penalty), requiresManualGrading: false };
        default:
            return { isCorrect: null, marksAwarded: 0, requiresManualGrading: true };
    }
};

const gradeSession = (questions, answers, examConfig) => {
    const {
        totalMarks,
        passMarkPercentage = 50,
        negativeMarkingEnabled = false,
        penaltyPerWrong = 0,
    } = examConfig;

    const answerMap = new Map(answers.map((a) => [String(a.questionId), a.answer]));

    let rawScore = 0;
    let hasManual = false;
    const answerBreakdown = [];
    const manualGradingQueue = [];

    for (const question of questions) {
        const qId = String(question._id);
        const submitted = answerMap.get(qId) ?? null;

        const { isCorrect, marksAwarded, requiresManualGrading } = gradeSession(
            question,
            submitted,
            { negativeMarkingEnabled, penaltyPerWrong }
        );

        answerBreakdown.push({
            questionId: question._id,
            candidateAnswer: submitted,
            correctAnswer: requiresManualGrading ? undefined : question.correctAnswer,
            isCorrect,
            marksAwarded,
            marksAvailble: question.marks || 1,
            requiresManualGrading,
        });

        if (requiresManualGrading) {
            hasManual = true;
            manualGradingQueue.push({
                questionId: question._id,
                candidateAnswer: submitted,
                maxMarks: question.marks || 1,
                marksAwarded: null,
            });
        } else {
            rawScore += marksAwarded;
        }
    }

    rawScore = Math.max(0, rawScore);
    const percentage = totalMarks > 0 ? Math.round((rawScore / totalMarks) * 10000) / 100 : 0;
    const passed = percentage >= passMarkPercentage;
    const gradingStatus = hasManual ? 'pending_manual' : 'auto_graded';

    return {
        rawScore,
        totalMarks,
        percentage,
        passed,
        answerBreakdown,
        manualGradingQueue,
        gradingStatus,
    };

};

module.exports = { gradeSession, gradeQuestion, gradeMCQ, gradeMulti, gradeFillBlank };