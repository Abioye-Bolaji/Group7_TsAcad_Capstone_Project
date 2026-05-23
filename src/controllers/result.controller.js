const resultService = require('../services/result.service');
const Candidate = require('../models/candidate.model');
const { generateCertificatePDFBuffer } = require('../utils/certificate.utils');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @desc Result Controller
 * Handles result viewing, certificate downloads, and verification.
 */

const getMyResults = async (req, res, next) => {
    try {
        // req.user.id is candidateId if role is candidate
        const candidateId = req.user.role === 'candidate' ? req.user.id : req.query.candidateId;
        
        if (!candidateId) {
            return sendError(res, 'Candidate ID is required', 400);
        }

        const results = await resultService.getResultByCandidateId(candidateId, req.tenantId);
        return sendSuccess(res, 'Results fetched successfully', results);
    } catch (error) {
        next(error);
    }
};

const getAllResults = async (req, res, next) => {
    try {
        const filters = {
            examId: req.query.examId,
            passed: req.query.passed === 'true' ? true : req.query.passed === 'false' ? false : undefined,
            search: req.query.search,
        };

        const results = await resultService.getAllResults(req.tenantId, filters);
        return sendSuccess(res, 'All results fetched successfully', results);
    } catch (error) {
        next(error);
    }
};

const downloadCertificate = async (req, res, next) => {
    try {
        const result = await resultService.getResultById(req.params.id, req.tenantId);

        if (!result || !result.certificateCode) {
            return sendError(res, 'Certificate not found or not yet generated', 404);
        }

        // Defensive fix: If the stored candidate name is generic or missing, try to fetch it from the Candidate model
        let recipientName = result.candidateName;
        if (!recipientName || recipientName.toLowerCase() === 'candidate') {
            const candidate = await Candidate.findById(result.candidateId).lean();
            if (candidate && candidate.name) {
                recipientName = candidate.name;
            }
        }

        const pdfBuffer = await generateCertificatePDFBuffer({
            recipientName: recipientName,
            certCode: result.certificateCode,
            courseName: result.examName,
            issueDate: result.issueDate,
            issuerName: 'TS Academy CBT Platform', 
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Certificate_${result.certificateCode}.pdf`);
        return res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

const verifyCertificate = async (req, res, next) => {
    try {
        const result = await resultService.verifyCertificate(req.params.code);

        if (!result) {
            return sendError(res, 'Invalid certificate code', 404);
        }

        return sendSuccess(res, 'Certificate verified successfully', {
            verified: true,
            details: result,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMyResults,
    getAllResults,
    downloadCertificate,
    verifyCertificate,
};
