import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateCertCode, isValidCertCode } from "./certCodeGenerator.js";
import {
  generateCertificatePDF,
  generateCertificatePDFBuffer,
} from "./certificateTemplate.js";
import {
  upsertResult,
  findResultByCandidateId,
  findResultByCertificateCode,
  filterResults,
  computeDashboardSummary,
  updateResultByCandidateId,
  loadResults,
} from "./resultStore.js";
import { sendReleaseNotification } from "./notificationUtil.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const certificatesDir = path.join(__dirname, "certificates");

app.use(express.json());

if (!fs.existsSync(certificatesDir)) {
  fs.mkdirSync(certificatesDir, { recursive: true });
}

app.get("/", (req, res) => {
  res.send("Multitenancy CBT Platform API Server");
});

app.post("/api/results", (req, res) => {
  try {
    const { candidateId, candidateName, examName, score, maxScore } = req.body;

    if (!candidateId || !candidateName || !examName) {
      return res.status(400).json({
        success: false,
        error: "candidateId, candidateName, and examName are required",
      });
    }

    const result = upsertResult(req.body);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/results/:candidateId", (req, res) => {
  try {
    const result = findResultByCandidateId(req.params.candidateId);
    if (!result) {
      return res.status(404).json({ success: false, error: "Result not found" });
    }

    const response = {
      ...result,
      certificateUrl: result.certificateFile
        ? `/certificates/${result.certificateFile}`
        : null,
      downloadCertificateUrl: `/api/admin/results/${result.candidateId}/certificate/download`,
    };

    res.json({ success: true, result: response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/v1/certificates/verify/:certCode", (req, res) => {
  try {
    const certCode = req.params.certCode;

    if (!certCode) {
      return res.status(400).json({ success: false, error: "Certificate code is required" });
    }

    if (!isValidCertCode(certCode)) {
      return res.status(400).json({ success: false, error: "Invalid certificate code format" });
    }

    const result = findResultByCertificateCode(certCode);
    if (!result) {
      return res.status(404).json({ success: false, error: "Certificate not found" });
    }

    res.json({
      success: true,
      verified: true,
      certificate: {
        certificateCode: result.certificateCode,
        candidateId: result.candidateId,
        candidateName: result.candidateName,
        examName: result.examName,
        status: result.status,
        passed: result.passed,
        percentage: result.percentage,
        grade: result.grade,
        issueDate: result.issueDate,
        expiryDate: result.expiryDate,
        certificateUrl: result.certificateFile ? `/certificates/${result.certificateFile}` : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/candidate-results/:candidateId/view", (req, res) => {
  try {
    const result = findResultByCandidateId(req.params.candidateId);
    if (!result) {
      return res.status(404).send("<h1>Result not found</h1>");
    }

    const certificateLink = result.certificateFile
      ? `<a href="/certificates/${result.certificateFile}" target="_blank">Download Certificate</a>`
      : "<span style=\"color:#d9534f\">Certificate not generated yet</span>";

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Candidate Result</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f2f5f8; color: #2c3e50; padding: 24px; }
    .card { background: #fff; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); padding: 24px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; }
    .status { font-weight: 700; color: ${result.passed ? "#218838" : "#c82333"}; }
    .field { margin-bottom: 12px; }
    .field label { display: block; font-size: 0.9rem; margin-bottom: 4px; color: #636e72; }
    .field span { font-size: 1.1rem; }
    .actions { margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <h1>Candidate Result</h1>
        <p>Candidate ID: ${result.candidateId}</p>
      </div>
      <div class="status">${result.status}</div>
    </div>

    <div class="field"><label>Name</label><span>${result.candidateName}</span></div>
    <div class="field"><label>Email</label><span>${result.email || "N/A"}</span></div>
    <div class="field"><label>Exam</label><span>${result.examName}</span></div>
    <div class="field"><label>Score</label><span>${result.score} / ${result.maxScore} (${result.percentage}%)</span></div>
    <div class="field"><label>Grade</label><span>${result.grade}</span></div>
    <div class="field"><label>Completion Date</label><span>${new Date(result.completionDate).toLocaleString()}</span></div>
    <div class="field"><label>Certificate</label><span>${certificateLink}</span></div>
    <div class="field"><label>Certificate Code</label><span>${result.certificateCode || "Not issued"}</span></div>
  </div>
</body>
</html>`);
  } catch (error) {
    res.status(500).send("<h1>Server error generating candidate page</h1>");
  }
});

app.get("/api/admin/results", (req, res) => {
  try {
    const filters = {
      candidateName: req.query.candidateName,
      email: req.query.email,
      examName: req.query.examName,
      status: req.query.status,
      released:
        req.query.released === undefined
          ? undefined
          : req.query.released === "true",
      passed:
        req.query.passed === undefined
          ? undefined
          : req.query.passed === "true",
    };

    const results = filterResults(filters);
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 50);
    const start = (page - 1) * limit;
    const pagedResults = results.slice(start, start + limit);

    res.json({
      success: true,
      total: results.length,
      page,
      limit,
      results: pagedResults,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/results/:candidateId/release", async (req, res) => {
  try {
    const result = findResultByCandidateId(req.params.candidateId);
    if (!result) {
      return res.status(404).json({ success: false, error: "Result not found" });
    }

    const updatedResult = updateResultByCandidateId(result.candidateId, {
      released: true,
    });

    const notification = await sendReleaseNotification(updatedResult);

    res.json({
      success: true,
      message: "Result released successfully",
      result: updatedResult,
      notification,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/admin/results/dashboard", (req, res) => {
  try {
    const results = loadResults();
    const summary = computeDashboardSummary(results);
    res.json({ success: true, dashboard: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/admin/results/export/csv", (req, res) => {
  try {
    const filters = {
      candidateName: req.query.candidateName,
      email: req.query.email,
      examName: req.query.examName,
      status: req.query.status,
      released:
        req.query.released === undefined
          ? undefined
          : req.query.released === "true",
      passed:
        req.query.passed === undefined
          ? undefined
          : req.query.passed === "true",
    };

    const results = filterResults(filters);
    const columns = [
      "candidateId",
      "candidateName",
      "email",
      "examName",
      "score",
      "maxScore",
      "percentage",
      "grade",
      "status",
      "passed",
      "released",
      "completionDate",
      "certificateCode",
      "certificateFile",
      "issuerName",
      "issueDate",
      "expiryDate",
      "createdAt",
      "updatedAt",
    ];

    const csvRows = [columns.join(",")];
    for (const result of results) {
      csvRows.push(
        columns
          .map((column) => {
            const value = result[column] ?? "";
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      );
    }

    const csvText = csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=results-export.csv"
    );
    res.send(csvText);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/results/:candidateId/certificate", async (req, res) => {
  try {
    const result = findResultByCandidateId(req.params.candidateId);
    if (!result) {
      return res.status(404).json({ success: false, error: "Result not found" });
    }

    if (!result.passed) {
      return res.status(400).json({
        success: false,
        error: "Certificate generation is allowed only for passed candidates",
      });
    }

    const certCode = result.certificateCode || generateCertCode();
    const filename = `${result.candidateId.replace(/[^a-zA-Z0-9]/g, "_")}_${certCode}.pdf`;
    const outputPath = path.join(certificatesDir, filename);

    await generateCertificatePDF({
      recipientName: result.candidateName,
      certCode,
      courseName: result.examName,
      issueDate: result.issueDate,
      expiryDate: result.expiryDate,
      issuerName: result.issuerName,
      outputPath,
    });

    const updated = updateResultByCandidateId(result.candidateId, {
      certificateCode: certCode,
      certificateFile: filename,
    });

    res.json({
      success: true,
      message: "Certificate generated successfully",
      result: updated,
      certificateUrl: `/certificates/${filename}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/admin/results/:candidateId/certificate/download", async (req, res) => {
  try {
    const result = findResultByCandidateId(req.params.candidateId);
    if (!result) {
      return res.status(404).json({ success: false, error: "Result not found" });
    }

    const certCode = result.certificateCode || generateCertCode();
    const filename = result.certificateFile
      ? result.certificateFile
      : `${result.candidateId.replace(/[^a-zA-Z0-9]/g, "_")}_${certCode}.pdf`;

    const pdfBuffer = await generateCertificatePDFBuffer({
      recipientName: result.candidateName,
      certCode,
      courseName: result.examName,
      issueDate: result.issueDate,
      expiryDate: result.expiryDate,
      issuerName: result.issuerName,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
  console.log("Candidate and admin result endpoints available");
});

