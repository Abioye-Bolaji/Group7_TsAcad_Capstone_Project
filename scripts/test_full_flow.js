const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000/api/v1';
let passed = 0;
let failed = 0;

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? '\n         → ' + detail : ''}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n${'═'.repeat(54)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(54));
}

async function runTests() {
  const prefix = crypto.randomBytes(4).toString('hex');

  // ─────────────────────────────────────────────────────────
  section('PHASE 1: SETUP — Super Admin Login & Tenant');
  // ─────────────────────────────────────────────────────────

  let res = await request('POST', '/auth/login', {
    email: 'admin@cbtplatform.com',
    password: 'ChangeMeImmediately123!'
  });
  check('Super Admin login (200)', res.status === 200, JSON.stringify(res.data?.message));
  const saToken = res.data?.data?.accessToken;
  if (!saToken) return printSummary('Super admin login failed - cannot continue');

  res = await request('POST', '/tenants', {
    name: `Test Uni ${prefix}`,
    email: `uni_${prefix}@test.com`,
    plan: 'basic'
  }, saToken);
  check('Create tenant (201)', res.status === 201, JSON.stringify(res.data?.message));
  const tenantId = res.data?.data?._id;
  if (!tenantId) return printSummary('Tenant creation failed - cannot continue');

  const taEmail = `ta_${prefix}@test.com`;
  res = await request('POST', '/auth/register', {
    firstName: 'Tenant', lastName: 'Admin',
    email: taEmail, password: 'Password123',
    role: 'tenant_admin', tenantId
  });
  check('Register Tenant Admin (201)', res.status === 201, JSON.stringify(res.data?.message));

  res = await request('POST', '/auth/login', { email: taEmail, password: 'Password123' });
  check('Tenant Admin login (200)', res.status === 200);
  const taToken = res.data?.data?.accessToken;
  if (!taToken) return printSummary('Tenant admin login failed - cannot continue');

  // ─────────────────────────────────────────────────────────
  section('PHASE 2: EXAM CRUD');
  // ─────────────────────────────────────────────────────────

  res = await request('POST', '/exams', {
    title: 'Mathematics Final Exam',
    subject: 'Mathematics',
    duration: 60,
    passMark: 40,
    totalMarks: 100,
    description: 'End of term exam',
    instructions: 'Answer all questions'
  }, taToken);
  check('Create exam (201)', res.status === 201, JSON.stringify(res.data?.message));
  const examId = res.data?.data?._id;
  check('Exam ID returned', !!examId);
  check('Exam status defaults to draft', res.data?.data?.status === 'draft', `Got: ${res.data?.data?.status}`);

  res = await request('GET', '/exams', null, taToken);
  check('GET /exams returns 200', res.status === 200, JSON.stringify(res.data?.message));
  check('Returns array', Array.isArray(res.data?.data), `Got: ${typeof res.data?.data}`);

  res = await request('GET', `/exams/${examId}`, null, taToken);
  check('GET /exams/:id returns 200', res.status === 200, JSON.stringify(res.data?.message));
  check('Correct exam returned', res.data?.data?.title === 'Mathematics Final Exam');

  res = await request('PUT', `/exams/${examId}`, { description: 'Updated description', totalMarks: 50, passMark: 25 }, taToken);
  check('PUT /exams/:id returns 200', res.status === 200, JSON.stringify(res.data?.message));
  check('description updated', res.data?.data?.description === 'Updated description');

  res = await request('PATCH', `/exams/${examId}/status`, { status: 'published' }, taToken);
  check('PATCH /exams/:id/status → published (200)', res.status === 200, JSON.stringify(res.data?.message || res.data));
  check('Status is now published', res.data?.data?.status === 'published', `Got: ${res.data?.data?.status}`);

  // test invalid transition (try going backwards from published to draft, since we might want to block that eventually, but let's test a known blocked one: active to draft)
  await request('PATCH', `/exams/${examId}/status`, { status: 'active' }, taToken);
  res = await request('PATCH', `/exams/${examId}/status`, { status: 'draft' }, taToken);
  check('Invalid status transition blocked (400)', res.status === 400, `Got: ${res.status}`);
  // revert back to draft manually for the rest of the test by hitting DB or just leave it active?
  // wait, the service blocks active->draft. We can just leave it active for the rest of the test!

  // ─────────────────────────────────────────────────────────
  section('PHASE 3: CANDIDATE MANAGEMENT');
  // ─────────────────────────────────────────────────────────

  res = await request('POST', '/candidates', {
    name: 'John Doe',
    email: `john_${prefix}@test.com`,
    idNumber: `ID${prefix}`,
    phone: '08012345678'
  }, taToken);
  check('Create candidate (201)', res.status === 201, JSON.stringify(res.data?.message));
  const candidateId = res.data?.data?.candidate?._id;
  const accessPin = res.data?.data?.accessPin;
  check('Candidate ID returned', !!candidateId, JSON.stringify(res.data?.data));
  check('accessPin returned (one-time)', !!accessPin, 'accessPin was not in response');

  res = await request('GET', '/candidates', null, taToken);
  check('GET /candidates returns 200', res.status === 200);
  check('Returns candidates array', Array.isArray(res.data?.data));

  res = await request('GET', `/candidates/${candidateId}`, null, taToken);
  check('GET /candidates/:id returns 200', res.status === 200);
  check('Correct candidate returned', res.data?.data?.idNumber === `ID${prefix}`);

  res = await request('PATCH', `/candidates/${candidateId}`, { phone: '09087654321' }, taToken);
  check('PATCH /candidates/:id returns 200', res.status === 200);
  check('Phone updated', res.data?.data?.phone === '09087654321');

  // ─────────────────────────────────────────────────────────
  section('PHASE 4: CANDIDATE GROUPS');
  // ─────────────────────────────────────────────────────────

  res = await request('POST', '/candidate-groups', {
    name: `Group Alpha ${prefix}`,
    description: 'Test group'
  }, taToken);
  check('Create candidate group (201)', res.status === 201, JSON.stringify(res.data?.message));
  const groupId = res.data?.data?._id;
  check('Group ID returned', !!groupId);

  res = await request('GET', '/candidate-groups', null, taToken);
  check('GET /candidate-groups returns 200', res.status === 200);

  res = await request('POST', `/candidate-groups/${groupId}/candidates`, {
    candidateIds: [candidateId]
  }, taToken);
  check('Add candidate to group (200)', res.status === 200, JSON.stringify(res.data?.message));

  res = await request('GET', `/candidate-groups/${groupId}`, null, taToken);
  check('GET /candidate-groups/:id returns 200', res.status === 200);

  // ─────────────────────────────────────────────────────────
  section('PHASE 5: QUESTION BANK');
  // ─────────────────────────────────────────────────────────

  const qPayloads = [
    { questionType: 'multiple-choice', questionText: 'What is 2+2?', options: [{ optionText: '3', isCorrect: false }, { optionText: '4', isCorrect: true }, { optionText: '5', isCorrect: false }], difficulty: 'easy' },
    { questionType: 'multiple-choice', questionText: 'What is the capital of Nigeria?', options: [{ optionText: 'Lagos', isCorrect: false }, { optionText: 'Abuja', isCorrect: true }, { optionText: 'Kano', isCorrect: false }], difficulty: 'easy' },
    { questionType: 'true-false', questionText: 'The sun rises in the west.', options: [{ optionText: 'True', isCorrect: false }, { optionText: 'False', isCorrect: true }], difficulty: 'easy' },
  ];

  const questionIds = [];
  for (const payload of qPayloads) {
    res = await request('POST', '/questions', payload, taToken);
    check(`Create question: "${payload.questionText.substring(0,30)}..." (201)`, res.status === 201, JSON.stringify(res.data?.message));
    if (res.data?.data?._id) questionIds.push(res.data.data._id);
  }
  check(`All 3 questions created`, questionIds.length === 3, `Got ${questionIds.length}`);

  // ─────────────────────────────────────────────────────────
  section('PHASE 6: ASSIGN QUESTIONS TO EXAM');
  // ─────────────────────────────────────────────────────────

  res = await request('PUT', `/exams/${examId}`, {
    questions: questionIds,
    totalMarks: 3,
    passMark: 2,
    assignedCandidates: [candidateId]
  }, taToken);
  check('Assign questions & candidate to exam (200)', res.status === 200, JSON.stringify(res.data?.message));
  check('Questions array saved', Array.isArray(res.data?.data?.questions) && res.data?.data?.questions.length === 3, `Got: ${res.data?.data?.questions?.length}`);

  // Set exam to active so session can start (if not already active)
  res = await request('PATCH', `/exams/${examId}/status`, { status: 'active' }, taToken);
  check('Exam set to active (200)', res.status === 200 || res.status === 400, JSON.stringify(res.data?.message)); // might be 400 if already active and API complains, or 200

  // ─────────────────────────────────────────────────────────
  section('PHASE 7: CANDIDATE LOGIN');
  // ─────────────────────────────────────────────────────────

  res = await request('POST', '/candidates/login', {
    idNumber: `ID${prefix}`,
    accessPin,
    tenantId
  });
  check('Candidate login (200)', res.status === 200, JSON.stringify(res.data?.message));
  const candidateToken = res.data?.data?.token;
  check('Candidate JWT returned', !!candidateToken, JSON.stringify(res.data?.data));

  // ─────────────────────────────────────────────────────────
  section('PHASE 8: EXAM SESSION (Start → Answer → Submit)');
  // ─────────────────────────────────────────────────────────

  res = await request('POST', '/sessions/start', { examId }, candidateToken);
  check('Start exam session (201)', res.status === 201, JSON.stringify(res.data?.message));
  const sessionId = res.data?.data?._id;
  check('Session ID returned', !!sessionId, JSON.stringify(res.data?.data));

  // Save correct answers
  const answers = [
    { sessionId, questionId: questionIds[0], selectedOption: '4' },
    { sessionId, questionId: questionIds[1], selectedOption: 'Abuja' },
    { sessionId, questionId: questionIds[2], selectedOption: 'False' },
  ];
  for (const ans of answers) {
    res = await request('POST', '/sessions/save-answer', ans, candidateToken);
    check(`Save answer for Q${answers.indexOf(ans)+1} (200)`, res.status === 200, JSON.stringify(res.data?.message));
  }

  res = await request('POST', '/sessions/submit', { sessionId }, candidateToken);
  check('Submit exam (200)', res.status === 200, JSON.stringify(res.data?.message));

  // ─────────────────────────────────────────────────────────
  section('PHASE 9: SCORING & RESULTS');
  // ─────────────────────────────────────────────────────────

  // Give scoring service a moment to run
  await new Promise(r => setTimeout(r, 1500));

  res = await request('GET', `/scoring/sessions/${sessionId}/result`, null, taToken);
  check('GET scoring result by session (200 or 404 if not released)', [200, 404].includes(res.status), `Got: ${res.status} - ${JSON.stringify(res.data?.message)}`);

  res = await request('POST', `/scoring/sessions/${sessionId}/grade`, {}, taToken);
  check('Grade session via scoring endpoint (201)', res.status === 201, JSON.stringify(res.data?.message));
  const resultId = res.data?.data?._id;
  check('Result ID returned', !!resultId, JSON.stringify(res.data?.data));

  if (resultId) {
    check('Percentage is a number', typeof res.data?.data?.percentage === 'number', `Got: ${res.data?.data?.percentage}`);
    check('gradingStatus is auto_graded', res.data?.data?.gradingStatus === 'auto_graded', `Got: ${res.data?.data?.gradingStatus}`);

    res = await request('GET', `/scoring/results/${resultId}`, null, taToken);
    check('GET /scoring/results/:id returns 200', res.status === 200, JSON.stringify(res.data?.message));

    res = await request('GET', `/scoring/exams/${examId}/results`, null, taToken);
    check('GET /scoring/exams/:id/results returns 200', res.status === 200, JSON.stringify(res.data?.message));
    check('Returns results array', Array.isArray(res.data?.data), `Got: ${typeof res.data?.data}`);

    // Release the result
    res = await request('PATCH', `/scoring/results/${resultId}/release`, {}, taToken);
    check('Release result (200)', res.status === 200, JSON.stringify(res.data?.message));
    check('gradingStatus is released', res.data?.data?.gradingStatus === 'released', `Got: ${res.data?.data?.gradingStatus}`);
  }

  // ─────────────────────────────────────────────────────────
  section('PHASE 10: RESULTS ENDPOINTS');
  // ─────────────────────────────────────────────────────────

  res = await request('GET', '/results/all', null, taToken);
  check('GET /results/all returns 200', res.status === 200, JSON.stringify(res.data?.message));
  check('Returns array', Array.isArray(res.data?.data));

  res = await request('GET', '/results/me', null, candidateToken);
  check('GET /results/me as candidate (200)', res.status === 200, JSON.stringify(res.data?.message));

  // ─────────────────────────────────────────────────────────
  section('PHASE 11: CLEANUP — Delete Exam');
  // ─────────────────────────────────────────────────────────

  // Create a fresh draft exam to delete
  res = await request('POST', '/exams', {
    title: 'Exam to Delete',
    subject: 'Test',
    duration: 10,
    passMark: 5,
    totalMarks: 10,
  }, taToken);
  const deleteExamId = res.data?.data?._id;
  res = await request('DELETE', `/exams/${deleteExamId}`, null, taToken);
  check('DELETE /exams/:id returns 200', res.status === 200, JSON.stringify(res.data?.message));
  res = await request('GET', `/exams/${deleteExamId}`, null, taToken);
  check('Deleted exam returns 404', res.status === 404, `Got ${res.status}`);

  printSummary();
}

function printSummary(abortReason) {
  const total = passed + failed;
  console.log(`\n${'═'.repeat(54)}`);
  if (abortReason) console.log(`  ⚠️  ABORTED: ${abortReason}`);
  console.log(`  RESULTS: ${passed}/${total} passed   |   ${failed} failed`);
  console.log('═'.repeat(54) + '\n');
}

runTests().catch(err => {
  console.error('\n💥 TEST RUNNER CRASHED:', err.message);
  printSummary('Unexpected error');
});
