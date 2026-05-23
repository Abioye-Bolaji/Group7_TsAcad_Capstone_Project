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
    console.log(`  ❌ FAIL: ${label}${detail ? ' → ' + detail : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n══════════════════════════════════════════════');
  console.log('     QUESTION BANK FULL CRUD TEST SUITE');
  console.log('══════════════════════════════════════════════\n');

  const emailPrefix = crypto.randomBytes(4).toString('hex');

  // ── STEP 1: Login Super Admin ────────────────────────────────────────────
  console.log('[ STEP 1 ] Super Admin Login');
  let res = await request('POST', '/auth/login', {
    email: 'admin@cbtplatform.com',
    password: 'ChangeMeImmediately123!'
  });
  check('Super Admin login returns 200', res.status === 200, `Got ${res.status}`);
  const saToken = res.data?.data?.accessToken;
  check('Super Admin token received', !!saToken);
  if (!saToken) return printSummary();

  // ── STEP 2: Create Tenant ────────────────────────────────────────────────
  console.log('\n[ STEP 2 ] Create Tenant');
  res = await request('POST', '/tenants', {
    name: `Test Uni ${emailPrefix}`,
    email: `uni_${emailPrefix}@test.com`,
    plan: 'basic'
  }, saToken);
  check('Tenant created (201)', res.status === 201, `Got ${res.status}`);
  const tenantId = res.data?.data?._id;
  check('Tenant ID returned', !!tenantId, JSON.stringify(res.data));

  // ── STEP 3: Register & Login Tenant Admin ────────────────────────────────
  console.log('\n[ STEP 3 ] Tenant Admin Registration & Login');
  const taEmail = `ta_${emailPrefix}@test.com`;
  res = await request('POST', '/auth/register', {
    firstName: 'Tenant', lastName: 'Admin',
    email: taEmail, password: 'Password123',
    role: 'tenant_admin', tenantId
  });
  check('Tenant Admin registered (201)', res.status === 201, `Got ${res.status}`);

  res = await request('POST', '/auth/login', { email: taEmail, password: 'Password123' });
  check('Tenant Admin login returns 200', res.status === 200, `Got ${res.status}`);
  const taToken = res.data?.data?.accessToken;
  check('Tenant Admin token received', !!taToken);
  if (!taToken) return printSummary();

  // ── STEP 4: CREATE Question (Postman simple format) ──────────────────────
  console.log('\n[ STEP 4 ] Create Question — Simple Postman Format');
  res = await request('POST', '/questions', {
    type: 'mcq',
    question: 'What does CPU stand for?',
    options: ['Central Process Unit', 'Computer Personal Unit', 'Central Processing Unit', 'Central Processor Unit'],
    answer: 'Central Processing Unit',
    marks: 5,
    category: 'Computer Science'
  }, taToken);
  check('Question created (201)', res.status === 201, `Got ${res.status}`);
  check('questionType mapped to multiple-choice', res.data?.data?.questionType === 'multiple-choice', `Got: ${res.data?.data?.questionType}`);
  check('Correct answer flagged isCorrect=true', res.data?.data?.options?.find(o => o.isCorrect)?.optionText === 'Central Processing Unit');
  check('subjectId (category) saved', res.data?.data?.subjectId === 'Computer Science', `Got: ${res.data?.data?.subjectId}`);
  const questionId1 = res.data?.data?._id;
  check('Question ID returned', !!questionId1);

  // ── STEP 5: CREATE Question (strict schema format) ───────────────────────
  console.log('\n[ STEP 5 ] Create Question — Schema Object Format');
  res = await request('POST', '/questions', {
    questionType: 'multiple-choice',
    questionText: 'What is the capital of France?',
    options: [
      { optionText: 'Berlin', isCorrect: false },
      { optionText: 'Paris', isCorrect: true },
      { optionText: 'Madrid', isCorrect: false }
    ],
    difficulty: 'easy',
    topic: 'Geography',
    tags: ['capitals', 'europe']
  }, taToken);
  check('Question created (201)', res.status === 201, `Got ${res.status}`);
  check('topic saved', res.data?.data?.topic === 'Geography', `Got: ${res.data?.data?.topic}`);
  check('tags saved', Array.isArray(res.data?.data?.tags) && res.data?.data?.tags.includes('capitals'), `Got: ${JSON.stringify(res.data?.data?.tags)}`);
  const questionId2 = res.data?.data?._id;
  check('Question ID returned', !!questionId2);

  // ── STEP 6: CREATE true-false question ───────────────────────────────────
  console.log('\n[ STEP 6 ] Create Question — True/False');
  res = await request('POST', '/questions', {
    questionType: 'true-false',
    questionText: 'The earth is flat.',
    options: [
      { optionText: 'True', isCorrect: false },
      { optionText: 'False', isCorrect: true }
    ],
    difficulty: 'easy'
  }, taToken);
  check('True/False question created (201)', res.status === 201, `Got ${res.status}`);
  const questionId3 = res.data?.data?._id;

  // ── STEP 7: GET all questions ─────────────────────────────────────────────
  console.log('\n[ STEP 7 ] Get All Questions');
  res = await request('GET', '/questions', null, taToken);
  check('GET /questions returns 200', res.status === 200, `Got ${res.status}`);
  check('Returns array of questions', Array.isArray(res.data?.data?.questions), `Got: ${typeof res.data?.data?.questions}`);
  check('Returns total count', typeof res.data?.data?.total === 'number', `Got: ${res.data?.data?.total}`);
  check('Has at least 3 questions', res.data?.data?.total >= 3, `Got: ${res.data?.data?.total}`);

  // ── STEP 8: GET questions with filter ────────────────────────────────────
  console.log('\n[ STEP 8 ] Get Questions With Filter (difficulty=easy)');
  res = await request('GET', '/questions?difficulty=easy', null, taToken);
  check('Filter by difficulty returns 200', res.status === 200, `Got ${res.status}`);
  check('All results have difficulty=easy', res.data?.data?.questions?.every(q => q.difficulty === 'easy'), `Got: ${JSON.stringify(res.data?.data?.questions?.map(q=>q.difficulty))}`);

  // ── STEP 9: GET question by ID ───────────────────────────────────────────
  console.log('\n[ STEP 9 ] Get Question By ID');
  res = await request('GET', `/questions/${questionId2}`, null, taToken);
  check('GET /questions/:id returns 200', res.status === 200, `Got ${res.status}`);
  check('Correct question returned', res.data?.data?.questionText === 'What is the capital of France?');

  // ── STEP 10: UPDATE question ─────────────────────────────────────────────
  console.log('\n[ STEP 10 ] Update Question');
  res = await request('PUT', `/questions/${questionId2}`, {
    difficulty: 'hard',
    topic: 'World Geography'
  }, taToken);
  check('PUT /questions/:id returns 200', res.status === 200, `Got ${res.status}`);
  check('difficulty updated to hard', res.data?.data?.difficulty === 'hard', `Got: ${res.data?.data?.difficulty}`);
  check('topic updated', res.data?.data?.topic === 'World Geography', `Got: ${res.data?.data?.topic}`);

  // ── STEP 11: DELETE question ─────────────────────────────────────────────
  console.log('\n[ STEP 11 ] Delete Question');
  res = await request('DELETE', `/questions/${questionId3}`, null, taToken);
  check('DELETE /questions/:id returns 200', res.status === 200, `Got ${res.status}`);

  res = await request('GET', `/questions/${questionId3}`, null, taToken);
  check('Deleted question returns 404', res.status === 404, `Got ${res.status}`);

  // ── STEP 12: Tenant isolation check ─────────────────────────────────────
  console.log('\n[ STEP 12 ] Tenant Isolation Check');
  // Create second tenant
  const taEmail2 = `ta2_${emailPrefix}@test.com`;
  res = await request('POST', '/tenants', {
    name: `Second Uni ${emailPrefix}`,
    email: `uni2_${emailPrefix}@test.com`,
    plan: 'basic'
  }, saToken);
  const tenant2Id = res.data?.data?._id;
  res = await request('POST', '/auth/register', {
    firstName: 'Admin2', lastName: 'Test',
    email: taEmail2, password: 'Password123',
    role: 'tenant_admin', tenantId: tenant2Id
  });
  res = await request('POST', '/auth/login', { email: taEmail2, password: 'Password123' });
  const taToken2 = res.data?.data?.accessToken;

  // Tenant2 should NOT see Tenant1's questions
  res = await request('GET', `/questions/${questionId1}`, null, taToken2);
  check('Tenant isolation: cannot access other tenant question (404)', res.status === 404, `Got ${res.status}`);

  printSummary();
}

function printSummary() {
  const total = passed + failed;
  console.log('\n══════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed}/${total} passed   |   ${failed} failed`);
  console.log('══════════════════════════════════════════════\n');
}

runTests().catch(console.error);
