import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const resultsFilePath = path.join(dataDir, "results.json");

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(resultsFilePath)) {
    fs.writeFileSync(resultsFilePath, "[]", "utf8");
  }
}

function calculateGrade(percentage) {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
}

export function loadResults() {
  ensureStore();
  const raw = fs.readFileSync(resultsFilePath, "utf8");
  return raw.trim() ? JSON.parse(raw) : [];
}

export function saveResults(results) {
  ensureStore();
  fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2), "utf8");
  return results;
}

export function findResultByCandidateId(candidateId) {
  const results = loadResults();
  return results.find(
    (result) => result.candidateId === candidateId || result.id === candidateId
  );
}

export function findResultByCertificateCode(certCode) {
  const results = loadResults();
  return results.find(
    (result) => result.certificateCode === certCode
  );
}

export function upsertResult(payload) {
  const results = loadResults();
  const now = new Date().toISOString();
  const existingIndex = results.findIndex(
    (item) => item.candidateId === payload.candidateId || item.id === payload.id
  );
  const existing = existingIndex >= 0 ? results[existingIndex] : null;

  const score = Number(payload.score ?? existing?.score ?? 0);
  const maxScore = Number(payload.maxScore ?? existing?.maxScore ?? 0);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
  const passed =
    typeof payload.passed === "boolean"
      ? payload.passed
      : existing?.passed ?? percentage >= 60;
  const status = payload.status || existing?.status || (passed ? "Passed" : "Failed");

  const updatedResult = {
    id: existing?.id || `result_${crypto.randomUUID()}`,
    candidateId: payload.candidateId,
    candidateName: payload.candidateName || existing?.candidateName || "",
    email: payload.email || existing?.email || "",
    examName: payload.examName || existing?.examName || "",
    score,
    maxScore,
    percentage,
    grade: payload.grade || existing?.grade || calculateGrade(percentage),
    status,
    passed,
    released: payload.released ?? existing?.released ?? false,
    completionDate: payload.completionDate || existing?.completionDate || now,
    issuerName: payload.issuerName || existing?.issuerName || "Certificate Authority",
    issueDate: payload.issueDate || existing?.issueDate || now,
    expiryDate: payload.expiryDate ?? existing?.expiryDate ?? null,
    certificateCode: payload.certificateCode || existing?.certificateCode || null,
    certificateFile: existing?.certificateFile || null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    results[existingIndex] = updatedResult;
  } else {
    results.push(updatedResult);
  }

  saveResults(results);
  return updatedResult;
}

export function updateResultByCandidateId(candidateId, updates) {
  const results = loadResults();
  const index = results.findIndex(
    (item) => item.candidateId === candidateId || item.id === candidateId
  );
  if (index === -1) return null;

  results[index] = {
    ...results[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveResults(results);
  return results[index];
}

export function filterResults(filters = {}) {
  const results = loadResults();
  return results.filter((result) => {
    if (filters.candidateName) {
      const candidateName = result.candidateName.toLowerCase();
      if (!candidateName.includes(filters.candidateName.toLowerCase())) {
        return false;
      }
    }
    if (filters.email) {
      const email = result.email.toLowerCase();
      if (!email.includes(filters.email.toLowerCase())) {
        return false;
      }
    }
    if (filters.examName) {
      const examName = result.examName.toLowerCase();
      if (!examName.includes(filters.examName.toLowerCase())) {
        return false;
      }
    }
    if (filters.status) {
      if (result.status.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }
    }
    if (typeof filters.released === "boolean" && result.released !== filters.released) {
      return false;
    }
    if (typeof filters.passed === "boolean" && result.passed !== filters.passed) {
      return false;
    }
    return true;
  });
}

export function computeDashboardSummary(results) {
  const totalCandidates = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = totalCandidates - passedCount;
  const averageScore =
    totalCandidates > 0
      ? Math.round(
          results.reduce((sum, item) => sum + Number(item.percentage || 0), 0) /
            totalCandidates,
          2
        )
      : 0;

  const exams = results.reduce((groups, result) => {
    const exam = result.examName || "Unknown Exam";
    groups[exam] = (groups[exam] || 0) + 1;
    return groups;
  }, {});

  const latestResults = [...results]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 10);

  return {
    totalCandidates,
    passedCount,
    failedCount,
    passRate: totalCandidates > 0 ? Math.round((passedCount / totalCandidates) * 10000) / 100 : 0,
    averageScore,
    exams,
    latestResults,
  };
}
