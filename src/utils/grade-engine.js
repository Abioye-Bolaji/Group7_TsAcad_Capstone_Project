const MANUAL_TYPES = new Set(['short-answer', 'essay', 'short_answer']);

const normalize = (val) =>
    typeof val === 'string' ? val.trim().toLowerCase() : '';

/**
 * Maps a percentage score to a letter grade.
 */
const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
};

const gradeMCQ = (candidateAnswer, options, marksAvailable, negativeMark = 0) => {
    const correctOption = Array.isArray(options) ? options.find(opt => opt.isCorrect) : null;
    const correctAnswerText = correctOption ? correctOption.optionText : null;

    const isCorrect =
        normalize(candidateAnswer) === normalize(correctAnswerText);

    if (isCorrect) return { isCorrect: true, marksAwarded: marksAvailable };
    if (!candidateAnswer)
        return { isCorrect: false, marksAwarded: 0 };
    return { isCorrect: false, marksAwarded: -Math.abs(negativeMark) };
};

const gradeMulti = (candidateAnswers, options, marksAvailable) => {
    if (!Array.isArray(candidateAnswers) || candidateAnswers.length === 0)
        return { isCorrect: false, marksAwarded: 0 };

    const correctOptions = Array.isArray(options) 
        ? options.filter(opt => opt.isCorrect).map(opt => normalize(opt.optionText))
        : [];
        
    const correctSet = new Set(correctOptions);
    const selectedSet = new Set(candidateAnswers.map(normalize));

    for (const sel of selectedSet) {
        if (!correctSet.has(sel)) return { isCorrect: false, marksAwarded: 0 };
    }

    const correctlySelected = [...selectedSet].filter((s) => correctSet.has(s)).length;
    const partial = (correctlySelected / correctSet.size) * marksAvailable;
    const isCorrect = correctlySelected === correctSet.size;

    return { isCorrect, marksAwarded: Math.round(partial * 100) / 100 };
};

const gradeFillBlank = (candidateAnswer, correctAnswer, marksAvailable, negativeMark = 0) => {
    const isCorrect = normalize(candidateAnswer) === normalize(normalize(correctAnswer));
    if (isCorrect) return { isCorrect: true, marksAwarded: marksAvailable };
    if (!candidateAnswer) return { isCorrect: false, marksAwarded: 0 };
    return { isCorrect: false, marksAwarded: -Math.abs(negativeMark) };
};

const gradeQuestion = (question, answer, examConfig = {}) => {
    const { negativeMarkingEnabled = false, penaltyPerWrong = 0 } = examConfig;
    const penalty = negativeMarkingEnabled ? penaltyPerWrong : 0;
    const available = question.marks || 1;
    const type = (question.questionType || question.type || '').toLowerCase();

    if (MANUAL_TYPES.has(type)) {
        return { isCorrect: null, marksAwarded: 0, requiresManualGrading: true };
    }

    switch (type) {
        case 'multiple-choice':
        case 'mcq':
        case 'true-false':
        case 'true_false':
            return { ...gradeMCQ(answer, question.options || [], available, penalty), requiresManualGrading: false };
        case 'multi':
            return { ...gradeMulti(answer, question.options || [], available), requiresManualGrading: false };
        case 'fill_blank':
        case 'fill-blank':
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

    const answerMap = new Map(answers.map((a) => [String(a.questionId), a.answer || a.selectedOption || a.candidateAnswer]));

    let rawScore = 0;
    let hasManual = false;
    const answerBreakdown = [];
    const manualGradingQueue = [];

    for (const question of questions) {
        const qId = String(question._id);
        const submitted = answerMap.get(qId) ?? null;

        const { isCorrect, marksAwarded, requiresManualGrading } = gradeQuestion(
            question,
            submitted,
            { negativeMarkingEnabled, penaltyPerWrong }
        );

        answerBreakdown.push({
            questionId: question._id,
            candidateAnswer: submitted,
            correctAnswer: requiresManualGrading ? undefined : (Array.isArray(question.options) ? question.options.find(o => o.isCorrect)?.optionText : question.correctAnswer),
            isCorrect,
            marksAwarded,
            marksAvailable: question.marks || 1,
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

module.exports = { calculateGrade, gradeSession, gradeQuestion, gradeMCQ, gradeMulti, gradeFillBlank };