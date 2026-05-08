# 🏢 tenantId Contract — Group 7 Multitenancy CBT Platform

> **Published by:** kaluvictor130@gmail.com (Team Lead)
> **Effective from:** Week 2
> **Status:** 🟢 ACTIVE — Read before writing a single DB query

---

## ⚠️ MANDATORY READING

This document defines the **tenantId contract** for our platform.
Every one of the 14 features depends on this foundation.

> If you write a database query without following this contract,
> your PR **will be rejected**. No exceptions.

---

## 📖 What is a Tenant?

A **tenant** is an organisation using our platform — a school, university, or corporate body.
Each tenant has their own exams, candidates, and results that must **never be visible to other tenants**.

We are using a **Shared Database with tenantId** strategy:
- One MongoDB database for the entire platform
- Every collection has a `tenantId` field on every record
- Queries are filtered by `tenantId` to enforce isolation

---

## 🔑 The Two Properties You Will Always Use

After the tenant middleware runs, **every protected request** has these two properties
automatically attached to the `req` object:

| Property | Type | What it contains |
|---|---|---|
| `req.tenantId` | `String` | The tenant's MongoDB `_id` as a string |
| `req.tenant` | `Object` | The full Tenant document (name, plan, settings, status, etc.) |

You do not need to find these yourself. They are always there. Use them.

---

## ✅ The Rules — Follow These Exactly

### Rule 1 — Always filter queries by `tenantId`

Every `find()`, `findOne()`, `findById()` that touches tenant data
**must include** `tenantId: req.tenantId` in the filter.

```js
// ✅ CORRECT
const exams = await Exam.find({ tenantId: req.tenantId });

// ✅ CORRECT — finding one specific exam, still scoped
const exam = await Exam.findOne({ _id: req.params.id, tenantId: req.tenantId });

// ❌ WRONG — fetches ALL exams from ALL tenants (data leak!)
const exams = await Exam.find({});

// ❌ WRONG — finds by ID but doesn't verify it belongs to this tenant
const exam = await Exam.findById(req.params.id);
```

---

### Rule 2 — Always save `tenantId` when creating new records

Every new document you insert into the database **must include** `tenantId: req.tenantId`.
This is how the record gets associated to the right tenant.

```js
// ✅ CORRECT — exam is saved under the right tenant
const exam = await Exam.create({
    title: req.body.title,
    duration: req.body.duration,
    tenantId: req.tenantId,   // ← always include this
});

// ❌ WRONG — exam has no tenant, it's an orphan record
const exam = await Exam.create({
    title: req.body.title,
    duration: req.body.duration,
    // tenantId is missing!
});
```

---

### Rule 3 — Never pass `tenantId` through `req.body`

Do not ask the client/frontend to send a `tenantId` in the request body.
That would be a security hole — anyone could fake a tenantId and read another school's data.

```js
// ❌ WRONG — user-supplied tenantId is dangerous
const exam = await Exam.create({
    ...req.body,              // req.body might contain a fake tenantId!
    tenantId: req.body.tenantId,
});

// ✅ CORRECT — tenantId always comes from the server-side middleware
const exam = await Exam.create({
    ...req.body,
    tenantId: req.tenantId,   // ← from middleware, not from client
});
```

---

### Rule 4 — Use `req.tenant` for tenant metadata (don't re-query it)

The full tenant object is already on `req.tenant` — use it directly.
Do not make a second database call to fetch the tenant again.

```js
// ✅ CORRECT — already loaded, no extra DB call
const tenantName = req.tenant.name;
const tenantPlan = req.tenant.plan;
const maxExams   = req.tenant.settings.maxExams;

// ❌ WASTEFUL — unnecessary extra DB call
const tenant = await Tenant.findById(req.tenantId); // already done by middleware!
```

---

### Rule 5 — Super Admins work differently

If `req.user.role === 'super_admin'`, the tenant middleware **skips** scoping.
This means Super Admins can query across all tenants — that's intentional.
`req.tenantId` and `req.tenant` will be `undefined` for Super Admin requests.

Always handle this in routes that a Super Admin might access:

```js
// ✅ CORRECT — handles both Super Admin and regular tenant
const query = req.user.role === 'super_admin'
    ? {}                             // Super Admin: no filter, see everything
    : { tenantId: req.tenantId };    // Tenant user: scoped to their tenant only

const exams = await Exam.find(query);
```

---

## 🗂️ Adding `tenantId` to Your Mongoose Model

Every model that stores tenant-specific data **must** include this field:

```js
// In your model file (e.g. src/models/Exam.js)
const examSchema = new mongoose.Schema({

    // ── Your fields ──────────────────────────────────
    title:    { type: String, required: true },
    duration: { type: Number, required: true },
    // ... your other fields ...

    // ── tenantId — REQUIRED on every tenant-scoped model ──
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: [true, 'tenantId is required'],
        index: true,          // ← always index this for query performance
    },

}, { timestamps: true });
```

> The `index: true` on `tenantId` is important — it makes filtered queries fast.
> Don't forget it.

---

## 🔄 Execution Order in Every Request

Understanding this order will help you debug issues:

```
Incoming Request
      │
      ▼
  cors / morgan / express.json        ← Global middleware (app.js)
      │
      ▼
  Auth Middleware  (F1 - aniwinner00)  ← Decodes JWT → sets req.user
      │                                  req.user = { _id, role, tenantId }
      ▼
  Tenant Middleware  (Team Lead)       ← Validates tenant → sets req.tenantId
      │                                  req.tenantId = "64abc..."
      │                                  req.tenant   = { name, plan, status... }
      ▼
  YOUR Route Controller               ← req.tenantId is ready. Use it.
      │
      ▼
  YOUR Service Layer                  ← All DB queries go here with tenantId
      │
      ▼
  MongoDB                             ← Returns only THIS tenant's data ✅
```

---

## 📋 Feature-by-Feature Checklist

Use this checklist when building your feature. Every item must be true before you open a PR.

- [ ] My Mongoose model has a `tenantId` field with `index: true`
- [ ] Every `find()` query includes `tenantId: req.tenantId`
- [ ] Every `findOne()` query includes `tenantId: req.tenantId`
- [ ] Every `create()` or `new Model()` includes `tenantId: req.tenantId`
- [ ] I never use `tenantId` from `req.body` (always from middleware)
- [ ] I never re-query the Tenant model — I use `req.tenant` directly
- [ ] My routes that Super Admins access handle the `undefined tenantId` case
- [ ] I tested my endpoints and confirmed they only return MY tenant's data

---

## 🚨 What Happens If You Break the Contract

| Violation | Consequence |
|---|---|
| Querying without `tenantId` | Data from ALL tenants returned — critical security bug |
| Saving without `tenantId` | Record becomes an orphan — no tenant can claim it |
| Using `req.body.tenantId` | Any user can fake a tenantId and steal another tenant's data |
| Re-querying the Tenant model | Unnecessary DB load — performance regression |
| PR opened without following contract | **PR rejected**, send back for fixes |

---

## 💬 Quick Reference Code Snippet

Copy this pattern into every service function you write:

```js
// ─── TEMPLATE: How to write a service function ───────────────────────────────

// LIST records (e.g. get all exams for a tenant)
const getAllExams = async (tenantId, filters = {}) => {
    return await Exam.find({ ...filters, tenantId }).lean();
};

// GET single record (scoped — cannot access other tenant's record)
const getExamById = async (examId, tenantId) => {
    return await Exam.findOne({ _id: examId, tenantId }).lean();
};

// CREATE record (always attach tenantId)
const createExam = async (data, tenantId) => {
    return await Exam.create({ ...data, tenantId });
};

// UPDATE record (scoped — cannot update other tenant's record)
const updateExam = async (examId, tenantId, updates) => {
    return await Exam.findOneAndUpdate(
        { _id: examId, tenantId },   // ← filter by both id AND tenantId
        { $set: updates },
        { new: true, runValidators: true }
    ).lean();
};

// DELETE record (scoped)
const deleteExam = async (examId, tenantId) => {
    return await Exam.findOneAndDelete({ _id: examId, tenantId });
};
```

Then in your controller, call it like this:

```js
const getExamById = async (req, res) => {
    const exam = await examService.getExamById(req.params.id, req.tenantId);
    if (!exam) return sendError(res, 'Exam not found', 404);
    return sendSuccess(res, 'Exam fetched', exam);
};
```

---

## 📞 Questions?

If anything in this contract is unclear, ping me directly:

> **Team Lead:** kaluvictor130@gmail.com
> **Watch the team channel** for updates — I will announce any changes to this contract there.

Do not guess. Do not improvise. Ask me.

---

*Last updated: Week 1 — kaluvictor130@gmail.com*
