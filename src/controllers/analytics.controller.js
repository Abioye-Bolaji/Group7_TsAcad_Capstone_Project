const analyticsService = require('../services/analytics.service');
const { sendSuccess, sendError } = require('../utils/response');
const { auditLog } = require('../utils/audit-log.utils');
const { exportCSV, exportPDF } = require('../utils/report.utils');

/**
 * @desc Feature F9 Analytics Controller
 * Thin HTTP layer with export support via ?format=csv|pdf
 */

// ─── Export helper ────────────────────────────────────────────────────────────

const handleExport = async (res, format, filename, columns, data) => {
    if (format === 'csv') {
        const buffer = exportCSV(data, columns);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}-${Date.now()}.csv`);
        return res.send(buffer);
    }
    if (format === 'pdf') {
        const headers = columns.map((c) => c.header);
        const rows = data.map((row) => columns.map((c) => row[c.key] ?? ''));
        const buffer = await exportPDF(filename, headers, rows);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}-${Date.now()}.pdf`);
        return res.send(buffer);
    }
    return null; // no export requested
};

// ─── GROUP 1: Exam Stats ──────────────────────────────────────────────────────

const getExamStats = async (req, res) => {
    try {
        const data = await analyticsService.getExamStats({
            examId: req.params.examId,
            tenantId: req.tenantId,
        });

        await auditLog(req, 'VIEW_ANALYTICS', 'analytics', {
            resourceId: req.params.examId,
            description: `Exam stats viewed for exam ${req.params.examId}`,
            severity: 'LOW',
        });

        const { format } = req.query;
        if (format === 'csv' || format === 'pdf') {
            const columns = [
                { header: 'Metric', key: 'metric' },
                { header: 'Value', key: 'value' },
            ];
            const exportData = [
                { metric: 'Total Attempts', value: data.totalAttempts },
                { metric: 'Average Score (%)', value: data.averageScore },
                { metric: 'Pass Rate (%)', value: data.passRate },
                { metric: 'Fail Rate (%)', value: data.failRate },
                { metric: 'Highest Score (%)', value: data.highestScore },
                { metric: 'Lowest Score (%)', value: data.lowestScore },
            ];
            // Append distribution rows
            (data.distribution || []).forEach((d) => {
                exportData.push({ metric: `Distribution ${d.range}`, value: d.count });
            });
            const exported = await handleExport(res, format, `exam-stats-${req.params.examId}`, columns, exportData);
            if (exported) return;
        }

        return sendSuccess(res, 'Exam statistics fetched', data);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

// ─── GROUP 2: Scorers ─────────────────────────────────────────────────────────

const getExamScorers = async (req, res) => {
    try {
        const data = await analyticsService.getExamScorers({
            examId: req.params.examId,
            tenantId: req.tenantId,
            type: req.query.type || 'top',
            limit: req.query.limit || 10,
        });

        await auditLog(req, 'VIEW_ANALYTICS', 'analytics', {
            resourceId: req.params.examId,
            description: `Exam scorers viewed for exam ${req.params.examId}`,
            severity: 'LOW',
        });

        const { format } = req.query;
        if (format === 'csv' || format === 'pdf') {
            const columns = [
                { header: 'Name', key: 'candidateName' },
                { header: 'Email', key: 'email' },
                { header: 'Score (%)', key: 'percentage' },
                { header: 'Grade', key: 'grade' },
                { header: 'Passed', key: 'passed' },
            ];
            const exported = await handleExport(res, format, `exam-scorers-${req.params.examId}`, columns, data.scorers);
            if (exported) return;
        }

        return sendSuccess(res, 'Exam scorers fetched', data);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

// ─── GROUP 3: Question Performance ────────────────────────────────────────────

const getQuestionPerformance = async (req, res) => {
    try {
        const data = await analyticsService.getQuestionPerformance({
            examId: req.params.examId,
            tenantId: req.tenantId,
        });

        await auditLog(req, 'VIEW_ANALYTICS', 'analytics', {
            resourceId: req.params.examId,
            description: `Question performance viewed for exam ${req.params.examId}`,
            severity: 'LOW',
        });

        const { format } = req.query;
        if (format === 'csv' || format === 'pdf') {
            const columns = [
                { header: 'Question', key: 'questionText' },
                { header: 'Type', key: 'questionType' },
                { header: 'Attempted', key: 'totalAttempted' },
                { header: 'Correct', key: 'totalCorrect' },
                { header: 'Correct Rate (%)', key: 'correctRate' },
                { header: 'Poor Quality', key: 'poorQualityFlag' },
            ];
            const exportData = (data.items || []).map((item) => ({
                questionText: item.questionDetails?.questionText || 'N/A',
                questionType: item.questionDetails?.questionType || 'N/A',
                totalAttempted: item.totalAttempted,
                totalCorrect: item.totalCorrect,
                correctRate: item.correctRate,
                poorQualityFlag: item.poorQualityFlag ? 'Yes' : 'No',
            }));
            const exported = await handleExport(res, format, `question-performance-${req.params.examId}`, columns, exportData);
            if (exported) return;
        }

        return sendSuccess(res, 'Question performance analytics fetched', data);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

// ─── GROUP 5: Subject Breakdown ───────────────────────────────────────────────

const getSubjectBreakdown = async (req, res) => {
    try {
        const data = await analyticsService.getSubjectBreakdown({
            examId: req.params.examId,
            tenantId: req.tenantId,
        });

        await auditLog(req, 'VIEW_ANALYTICS', 'analytics', {
            resourceId: req.params.examId,
            description: `Subject breakdown viewed for exam ${req.params.examId}`,
            severity: 'LOW',
        });

        const { format } = req.query;
        if (format === 'csv' || format === 'pdf') {
            const columns = [
                { header: 'Difficulty', key: 'difficulty' },
                { header: 'Answered', key: 'totalAnswered' },
                { header: 'Correct', key: 'totalCorrect' },
                { header: 'Correct Rate (%)', key: 'correctRate' },
                { header: 'Weak', key: 'weakFlag' },
            ];
            const exportData = (data.items || []).map((item) => ({
                ...item,
                weakFlag: item.weakFlag ? 'Yes' : 'No',
            }));
            const exported = await handleExport(res, format, `subject-breakdown-${req.params.examId}`, columns, exportData);
            if (exported) return;
        }

        return sendSuccess(res, 'Subject breakdown fetched', data);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

// ─── GROUP 4: Candidate Performance Trend ─────────────────────────────────────

const getCandidatePerformanceTrend = async (req, res) => {
    try {
        const candidateId = req.params.candidateId;
        const requestUserId = String(req.user?._id || req.user?.id || '');

        if (req.user?.role === 'candidate' && requestUserId !== String(candidateId)) {
            return sendError(res, 'Forbidden: insufficient permissions', 403);
        }

        const data = await analyticsService.getCandidatePerformanceTrend({
            candidateId,
            tenantId: req.tenantId,
        });

        await auditLog(req, 'VIEW_ANALYTICS', 'analytics', {
            resourceId: candidateId,
            description: `Candidate trend viewed for candidate ${candidateId}`,
            severity: 'LOW',
        });

        const { format } = req.query;
        if (format === 'csv' || format === 'pdf') {
            const columns = [
                { header: 'Exam', key: 'examName' },
                { header: 'Score (%)', key: 'percentage' },
                { header: 'Grade', key: 'grade' },
                { header: 'Passed', key: 'passed' },
                { header: 'Date', key: 'completionDate' },
            ];
            const exportData = (data.exams || []).map((e) => ({
                ...e,
                passed: e.passed ? 'Yes' : 'No',
                completionDate: e.completionDate ? new Date(e.completionDate).toLocaleDateString() : '',
            }));
            const exported = await handleExport(res, format, `candidate-trend-${candidateId}`, columns, exportData);
            if (exported) return;
        }

        return sendSuccess(res, 'Candidate performance trend fetched', data);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

// ─── GROUP 6: Platform Summary ────────────────────────────────────────────────

const getPlatformSummary = async (req, res) => {
    try {
        if (req.user?.role !== 'super_admin') {
            return sendError(res, 'Forbidden: insufficient permissions', 403);
        }

        const data = await analyticsService.getPlatformSummary();

        await auditLog(req, 'VIEW_ANALYTICS', 'analytics', {
            resourceId: 'platform-summary',
            description: 'Platform summary viewed by super admin',
            severity: 'LOW',
        });

        const { format } = req.query;
        if (format === 'csv' || format === 'pdf') {
            const columns = [
                { header: 'Tenant', key: 'tenantName' },
                { header: 'Exam Count', key: 'examCount' },
                { header: 'Result Count', key: 'resultCount' },
                { header: 'Avg Score (%)', key: 'avgScore' },
            ];
            // Merge tenant data for export
            const tenantMap = {};
            (data.mostActiveTenants || []).forEach((t) => {
                tenantMap[String(t.tenantId)] = { tenantName: t.tenantName, examCount: t.examCount, resultCount: 0, avgScore: 0 };
            });
            (data.tenantAverages || []).forEach((t) => {
                if (!tenantMap[String(t.tenantId)]) {
                    tenantMap[String(t.tenantId)] = { tenantName: t.tenantName, examCount: 0, resultCount: 0, avgScore: 0 };
                }
                tenantMap[String(t.tenantId)].resultCount = t.resultCount;
                tenantMap[String(t.tenantId)].avgScore = t.avgScore;
            });
            const exportData = Object.values(tenantMap);
            const exported = await handleExport(res, format, 'platform-summary', columns, exportData);
            if (exported) return;
        }

        return sendSuccess(res, 'Platform summary fetched', data);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
};

module.exports = {
    getExamStats,
    getExamScorers,
    getQuestionPerformance,
    getSubjectBreakdown,
    getCandidatePerformanceTrend,
    getPlatformSummary,
};
