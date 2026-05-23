const fs = require('fs');

const collection = {
  info: {
    name: 'CBT Platform API (100% Comprehensive w/ Bodies)',
    description: 'Manually mapped API endpoints from all 15 controller routes, including request bodies and sample schemas for team testing.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: [
    {
      name: 'Authentication',
      item: [
        { 
          name: 'Register', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/auth/register', host: ['http://localhost:5000'], path: ['api','v1','auth','register'] },
            body: { mode: 'raw', raw: JSON.stringify({ name: "Admin User", email: "admin@test.com", password: "Password123", role: "tenant_admin" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Login', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/auth/login', host: ['http://localhost:5000'], path: ['api','v1','auth','login'] },
            body: { mode: 'raw', raw: JSON.stringify({ email: "admin@test.com", password: "Password123" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Get Profile', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/auth/profile', host: ['http://localhost:5000'], path: ['api','v1','auth','profile'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Logout', request: { method: 'POST', url: { raw: 'http://localhost:5000/api/v1/auth/logout', host: ['http://localhost:5000'], path: ['api','v1','auth','logout'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Verify Email', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/auth/verify-email/{{token}}', host: ['http://localhost:5000'], path: ['api','v1','auth','verify-email','{{token}}'] } } },
        { 
          name: 'Forgot Password', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/auth/forgot-password', host: ['http://localhost:5000'], path: ['api','v1','auth','forgot-password'] },
            body: { mode: 'raw', raw: JSON.stringify({ email: "admin@test.com" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Reset Password', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/auth/reset-password/{{token}}', host: ['http://localhost:5000'], path: ['api','v1','auth','reset-password','{{token}}'] },
            body: { mode: 'raw', raw: JSON.stringify({ password: "NewPassword123" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Refresh Token', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/auth/refresh-token', host: ['http://localhost:5000'], path: ['api','v1','auth','refresh-token'] },
            body: { mode: 'raw', raw: JSON.stringify({ refreshToken: "your-refresh-token-here" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        }
      ]
    },
    {
      name: 'Tenants',
      item: [
        { name: 'Get My Tenant', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/tenants/me', host: ['http://localhost:5000'], path: ['api','v1','tenants','me'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Update My Settings', 
          request: { 
            method: 'PATCH', 
            url: { raw: 'http://localhost:5000/api/v1/tenants/me/settings', host: ['http://localhost:5000'], path: ['api','v1','tenants','me','settings'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ settings: { autoGrade: true } }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Create Tenant', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/tenants', host: ['http://localhost:5000'], path: ['api','v1','tenants'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ name: "Global University", email: "contact@global.edu", plan: "premium" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Get All Tenants', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/tenants', host: ['http://localhost:5000'], path: ['api','v1','tenants'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Tenant Stats', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/tenants/stats', host: ['http://localhost:5000'], path: ['api','v1','tenants','stats'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Tenant By Id', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/tenants/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','tenants','{{id}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Update Tenant', 
          request: { 
            method: 'PATCH', 
            url: { raw: 'http://localhost:5000/api/v1/tenants/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','tenants','{{id}}'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ name: "Updated University Name" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Suspend Tenant', request: { method: 'PATCH', url: { raw: 'http://localhost:5000/api/v1/tenants/{{id}}/suspend', host: ['http://localhost:5000'], path: ['api','v1','tenants','{{id}}','suspend'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Reactivate Tenant', request: { method: 'PATCH', url: { raw: 'http://localhost:5000/api/v1/tenants/{{id}}/reactivate', host: ['http://localhost:5000'], path: ['api','v1','tenants','{{id}}','reactivate'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Upgrade Tenant Plan', 
          request: { 
            method: 'PATCH', 
            url: { raw: 'http://localhost:5000/api/v1/tenants/{{id}}/plan', host: ['http://localhost:5000'], path: ['api','v1','tenants','{{id}}','plan'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ plan: "enterprise" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Delete Tenant', request: { method: 'DELETE', url: { raw: 'http://localhost:5000/api/v1/tenants/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','tenants','{{id}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } }
      ]
    },
    {
      name: 'Question Bank',
      item: [
        { 
          name: 'Create Question', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/questions', host: ['http://localhost:5000'], path: ['api','v1','questions'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ type: "mcq", question: "What is 2+2?", options: ["3","4","5"], answer: "4", marks: 5, category: "Math" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Get Questions', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/questions', host: ['http://localhost:5000'], path: ['api','v1','questions'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Question By ID', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/questions/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','questions','{{id}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Update Question', 
          request: { 
            method: 'PUT', 
            url: { raw: 'http://localhost:5000/api/v1/questions/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','questions','{{id}}'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ marks: 10 }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Delete Question', request: { method: 'DELETE', url: { raw: 'http://localhost:5000/api/v1/questions/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','questions','{{id}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Bulk Upload Questions', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/questions/bulk-upload', host: ['http://localhost:5000'], path: ['api','v1','questions','bulk-upload'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'formdata', formdata: [{ key: "questions", type: "file", src: "" }] }
          } 
        }
      ]
    },
    {
      name: 'Exams',
      item: [
        { 
          name: 'Create Exam', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/exams', host: ['http://localhost:5000'], path: ['api','v1','exams'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ title: "Midterm Exam", subject: "Mathematics", duration: 60, passMark: 50, questions: ["64f..."] }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Get All Exams', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/exams', host: ['http://localhost:5000'], path: ['api','v1','exams'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } }
      ]
    },
    {
      name: 'Candidates',
      item: [
        { 
          name: 'Candidate Login', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/candidates/login', host: ['http://localhost:5000'], path: ['api','v1','candidates','login'] },
            body: { mode: 'raw', raw: JSON.stringify({ idNumber: "STD-123", accessPin: "123456" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Get Candidate Profile (Me)', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/candidates/me', host: ['http://localhost:5000'], path: ['api','v1','candidates','me'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Bulk Import Candidates', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/candidates/bulk-import', host: ['http://localhost:5000'], path: ['api','v1','candidates','bulk-import'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'formdata', formdata: [{ key: "file", type: "file", src: "" }] }
          } 
        },
        { 
          name: 'Create Candidate', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/candidates', host: ['http://localhost:5000'], path: ['api','v1','candidates'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ name: "John Doe", email: "john@example.com" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Get All Candidates', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/candidates', host: ['http://localhost:5000'], path: ['api','v1','candidates'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Candidate by ID', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/candidates/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','candidates','{{id}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Update Candidate', 
          request: { 
            method: 'PATCH', 
            url: { raw: 'http://localhost:5000/api/v1/candidates/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','candidates','{{id}}'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ name: "John Updated" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Update Candidate Status', 
          request: { 
            method: 'PATCH', 
            url: { raw: 'http://localhost:5000/api/v1/candidates/{{id}}/status', host: ['http://localhost:5000'], path: ['api','v1','candidates','{{id}}','status'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ status: "inactive" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Delete Candidate', request: { method: 'DELETE', url: { raw: 'http://localhost:5000/api/v1/candidates/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','candidates','{{id}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } }
      ]
    },
    {
      name: 'Candidate Groups',
      item: [
        { 
          name: 'Create Group', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/candidate-groups', host: ['http://localhost:5000'], path: ['api','v1','candidate-groups'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ name: "Science Department Batch 1", description: "First batch" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Get All Groups', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/candidate-groups', host: ['http://localhost:5000'], path: ['api','v1','candidate-groups'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Group by ID', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/candidate-groups/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','candidate-groups','{{id}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Update Group', 
          request: { 
            method: 'PATCH', 
            url: { raw: 'http://localhost:5000/api/v1/candidate-groups/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','candidate-groups','{{id}}'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ name: "Updated Batch Name" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Delete Group', request: { method: 'DELETE', url: { raw: 'http://localhost:5000/api/v1/candidate-groups/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','candidate-groups','{{id}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Add Candidates to Group', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/candidate-groups/{{id}}/candidates', host: ['http://localhost:5000'], path: ['api','v1','candidate-groups','{{id}}','candidates'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ candidateIds: ["mongo_id_1", "mongo_id_2"] }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Remove Candidates from Group', 
          request: { 
            method: 'DELETE', 
            url: { raw: 'http://localhost:5000/api/v1/candidate-groups/{{id}}/candidates', host: ['http://localhost:5000'], path: ['api','v1','candidate-groups','{{id}}','candidates'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ candidateIds: ["mongo_id_1"] }, null, 2), options: { raw: { language: 'json' } } }
          } 
        }
      ]
    },
    {
      name: 'Exam Sessions',
      item: [
        { 
          name: 'Start Session', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/sessions/start', host: ['http://localhost:5000'], path: ['api','v1','sessions','start'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ examId: "exam_mongo_id" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Save Answer', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/sessions/save-answer', host: ['http://localhost:5000'], path: ['api','v1','sessions','save-answer'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ sessionId: "session_id", questionId: "question_id", answer: "Option A" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Submit Exam', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/sessions/submit', host: ['http://localhost:5000'], path: ['api','v1','sessions','submit'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ sessionId: "session_id" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        }
      ]
    },
    {
      name: 'Scoring',
      item: [
        { 
          name: 'Grade Session', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/scoring/sessions/{{sessionId}}/grade', host: ['http://localhost:5000'], path: ['api','v1','scoring','sessions','{{sessionId}}','grade'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] 
          } 
        },
        { name: 'Get Exam Results', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/scoring/exams/{{examId}}/results', host: ['http://localhost:5000'], path: ['api','v1','scoring','exams','{{examId}}','results'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Result by ID', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/scoring/results/{{resultId}}', host: ['http://localhost:5000'], path: ['api','v1','scoring','results','{{resultId}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Candidate Result by Session', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/scoring/sessions/{{sessionId}}/result', host: ['http://localhost:5000'], path: ['api','v1','scoring','sessions','{{sessionId}}','result'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Manual Queue', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/scoring/manual-queue', host: ['http://localhost:5000'], path: ['api','v1','scoring','manual-queue'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Submit Manual Grade', 
          request: { 
            method: 'PATCH', 
            url: { raw: 'http://localhost:5000/api/v1/scoring/results/{{resultId}}/manual', host: ['http://localhost:5000'], path: ['api','v1','scoring','results','{{resultId}}','manual'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ questionId: "q_id", marksAwarded: 5, feedback: "Great effort!" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Release Result', 
          request: { 
            method: 'PATCH', 
            url: { raw: 'http://localhost:5000/api/v1/scoring/results/{{resultId}}/release', host: ['http://localhost:5000'], path: ['api','v1','scoring','results','{{resultId}}','release'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] 
          } 
        }
      ]
    },
    {
      name: 'Results & Certificates',
      item: [
        { name: 'Verify Certificate', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/results/verify/{{code}}', host: ['http://localhost:5000'], path: ['api','v1','results','verify','{{code}}'] } } },
        { name: 'Get My Results', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/results/me', host: ['http://localhost:5000'], path: ['api','v1','results','me'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get All Results', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/results/all', host: ['http://localhost:5000'], path: ['api','v1','results','all'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Download Certificate', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/results/{{id}}/certificate', host: ['http://localhost:5000'], path: ['api','v1','results','{{id}}','certificate'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } }
      ]
    },
    {
      name: 'Analytics',
      item: [
        { name: 'Platform Summary', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/analytics/platform/summary', host: ['http://localhost:5000'], path: ['api','v1','analytics','platform','summary'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Exam Stats', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/analytics/exams/{{examId}}/stats', host: ['http://localhost:5000'], path: ['api','v1','analytics','exams','{{examId}}','stats'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Exam Scorers', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/analytics/exams/{{examId}}/scorers', host: ['http://localhost:5000'], path: ['api','v1','analytics','exams','{{examId}}','scorers'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Question Performance', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/analytics/exams/{{examId}}/questions', host: ['http://localhost:5000'], path: ['api','v1','analytics','exams','{{examId}}','questions'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Subject Breakdown', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/analytics/exams/{{examId}}/subjects', host: ['http://localhost:5000'], path: ['api','v1','analytics','exams','{{examId}}','subjects'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Candidate Performance Trend', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/analytics/candidates/{{candidateId}}', host: ['http://localhost:5000'], path: ['api','v1','analytics','candidates','{{candidateId}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } }
      ]
    },
    {
      name: 'Notifications',
      item: [
        { name: 'Get My Notifications', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/notifications/me', host: ['http://localhost:5000'], path: ['api','v1','notifications','me'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Mark Notification as Read', request: { method: 'PATCH', url: { raw: 'http://localhost:5000/api/v1/notifications/{{id}}/read', host: ['http://localhost:5000'], path: ['api','v1','notifications','{{id}}','read'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Create Manual Notification', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/notifications', host: ['http://localhost:5000'], path: ['api','v1','notifications'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ title: "Reminder", message: "Exam tomorrow", recipientId: "mongo_id" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Create Batch Notification', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/notifications/bulk', host: ['http://localhost:5000'], path: ['api','v1','notifications','bulk'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ title: "System Update", message: "Downtime expected.", recipientRoles: ["candidate"] }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Update My Preferences', 
          request: { 
            method: 'PATCH', 
            url: { raw: 'http://localhost:5000/api/v1/notifications/preferences', host: ['http://localhost:5000'], path: ['api','v1','notifications','preferences'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ emailAlerts: true, smsAlerts: false }, null, 2), options: { raw: { language: 'json' } } }
          } 
        }
      ]
    },
    {
      name: 'Subscriptions',
      item: [
        { name: 'Get All Plans', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/subscriptions/plans', host: ['http://localhost:5000'], path: ['api','v1','subscriptions','plans'] } } },
        { name: 'Get Plan by ID', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/subscriptions/plans/{{planId}}', host: ['http://localhost:5000'], path: ['api','v1','subscriptions','plans','{{planId}}'] } } },
        { name: 'Get Current Subscription', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/subscriptions/current', host: ['http://localhost:5000'], path: ['api','v1','subscriptions','current'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Assign Plan', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/subscriptions/assign', host: ['http://localhost:5000'], path: ['api','v1','subscriptions','assign'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ planId: "mongo_id", paymentProviderId: "paystack" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Upgrade Plan', 
          request: { 
            method: 'PUT', 
            url: { raw: 'http://localhost:5000/api/v1/subscriptions/upgrade', host: ['http://localhost:5000'], path: ['api','v1','subscriptions','upgrade'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ planId: "higher_plan_id" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Downgrade Plan', 
          request: { 
            method: 'PUT', 
            url: { raw: 'http://localhost:5000/api/v1/subscriptions/downgrade', host: ['http://localhost:5000'], path: ['api','v1','subscriptions','downgrade'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ planId: "lower_plan_id" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Cancel Subscription', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/subscriptions/cancel', host: ['http://localhost:5000'], path: ['api','v1','subscriptions','cancel'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ reason: "Not needed anymore" }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Pause Subscription', request: { method: 'POST', url: { raw: 'http://localhost:5000/api/v1/subscriptions/pause', host: ['http://localhost:5000'], path: ['api','v1','subscriptions','pause'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Resume Subscription', request: { method: 'POST', url: { raw: 'http://localhost:5000/api/v1/subscriptions/resume', host: ['http://localhost:5000'], path: ['api','v1','subscriptions','resume'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Renew Subscription', request: { method: 'POST', url: { raw: 'http://localhost:5000/api/v1/subscriptions/renew', host: ['http://localhost:5000'], path: ['api','v1','subscriptions','renew'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } }
      ]
    },
    {
      name: 'Billing',
      item: [
        { name: 'Get Billing History', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/billing/history', host: ['http://localhost:5000'], path: ['api','v1','billing','history'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Invoice', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/billing/invoices/{{invoiceId}}', host: ['http://localhost:5000'], path: ['api','v1','billing','invoices','{{invoiceId}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Usage Tracking', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/billing/usage', host: ['http://localhost:5000'], path: ['api','v1','billing','usage'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Billing Summary', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/billing/summary', host: ['http://localhost:5000'], path: ['api','v1','billing','summary'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Check Usage Limits', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/billing/usage-limits', host: ['http://localhost:5000'], path: ['api','v1','billing','usage-limits'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Admin - Get Payment Dashboard', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/billing/admin/dashboard', host: ['http://localhost:5000'], path: ['api','v1','billing','admin','dashboard'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Admin - Send Payment Reminders', request: { method: 'POST', url: { raw: 'http://localhost:5000/api/v1/billing/admin/send-reminders', host: ['http://localhost:5000'], path: ['api','v1','billing','admin','send-reminders'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Admin - Process Renewals', request: { method: 'POST', url: { raw: 'http://localhost:5000/api/v1/billing/admin/process-renewals', host: ['http://localhost:5000'], path: ['api','v1','billing','admin','process-renewals'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { 
          name: 'Admin - Update Tenant Usage', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/billing/admin/update-usage', host: ['http://localhost:5000'], path: ['api','v1','billing','admin','update-usage'] }, 
            header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }],
            body: { mode: 'raw', raw: JSON.stringify({ tenantId: "mongo_id", activeCandidates: 150, storageGB: 5 }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Admin - Get All Invoices', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/billing/admin/all-invoices', host: ['http://localhost:5000'], path: ['api','v1','billing','admin','all-invoices'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } }
      ]
    },
    {
      name: 'Audit Logs',
      item: [
        { name: 'Get Security Dashboard', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/audit/security', host: ['http://localhost:5000'], path: ['api','v1','audit','security'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Audit Logs', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/audit', host: ['http://localhost:5000'], path: ['api','v1','audit'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Get Audit Log by ID', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/audit/{{id}}', host: ['http://localhost:5000'], path: ['api','v1','audit','{{id}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } }
      ]
    },
    {
      name: 'Webhooks',
      item: [
        { 
          name: 'Paystack Webhook', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/webhooks/paystack', host: ['http://localhost:5000'], path: ['api','v1','webhooks','paystack'] },
            body: { mode: 'raw', raw: JSON.stringify({ event: "charge.success", data: { reference: "ref_123" } }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { 
          name: 'Flutterwave Webhook', 
          request: { 
            method: 'POST', 
            url: { raw: 'http://localhost:5000/api/v1/webhooks/flutterwave', host: ['http://localhost:5000'], path: ['api','v1','webhooks','flutterwave'] },
            body: { mode: 'raw', raw: JSON.stringify({ event: "charge.completed", data: { tx_ref: "ref_123" } }, null, 2), options: { raw: { language: 'json' } } }
          } 
        },
        { name: 'Get Webhook Logs (Admin)', request: { method: 'GET', url: { raw: 'http://localhost:5000/api/v1/webhooks/logs', host: ['http://localhost:5000'], path: ['api','v1','webhooks','logs'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } },
        { name: 'Retry Webhook (Admin)', request: { method: 'POST', url: { raw: 'http://localhost:5000/api/v1/webhooks/retry/{{webhookId}}', host: ['http://localhost:5000'], path: ['api','v1','webhooks','retry','{{webhookId}}'] }, header: [{ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' }] } }
      ]
    }
  ]
};

fs.writeFileSync('cbt_platform_postman_collection.json', JSON.stringify(collection, null, 2));
