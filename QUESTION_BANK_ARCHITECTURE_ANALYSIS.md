# Question Bank Feature - Architecture Analysis & Issues Report

**Date:** 2026-05-11
**Status:** 🔴 Critical Issues Identified
**Version:** 1.0

---

## Executive Summary

The Question Bank feature has **critical visibility and permission issues** that prevent proper question sharing and admin access. Each teacher can only see their own questions, admins cannot see any teacher questions, and the current architecture doesn't support proper question sharing across roles. The root cause is a **flawed Prisma query filter** and **missing permission layers**.

---

## 📊 Current Architecture Overview

### Database Model (Prisma Schema)

```
QuestionBankEntry
├── id: String (Primary Key)
├── teacherId: String? (Foreign Key to TeacherProfile)
├── isPublic: Boolean (default: false)
├── text: String
├── subject: Subject (CHEMISTRY, PHYSICS, MATHEMATICS, BIOLOGY)
├── chapter: String?
├── concept: String?
├── difficulty: Difficulty (EASY, MEDIUM, HARD)
├── explanation: String?
├── imageUrl: String?
├── createdAt: DateTime
├── updatedAt: DateTime
└── options: BankOption[] (1-to-many relationship)

BankOption
├── id: String
├── questionBankId: String (FK)
├── text: String
├── imageUrl: String?
└── isCorrect: Boolean
```

### API Endpoints

| Method | Endpoint | Role Required | Current Status |
|--------|----------|---------------|-----------------|
| GET | `/question-bank` | authenticated | ❌ Buggy filter |
| POST | `/question-bank` | superadmin, institute_admin, teacher_admin | ✅ Works |
| PUT | `/question-bank/:id` | superadmin, institute_admin, teacher_admin | ⚠️ No ownership check |
| DELETE | `/question-bank/:id` | superadmin, institute_admin, teacher_admin | ⚠️ No ownership check |
| POST | `/question-bank/bulk` | superadmin, institute_admin, teacher_admin | ✅ Works |

### User Roles & Permissions

```
User.role (Prisma):          TokenRole (JWT):
├── SUPERADMIN           →   superadmin      (Admin Dashboard)
├── INSTITUTE_ADMIN      →   institute_admin (Admin Dashboard)
├── TEACHER_ADMIN        →   teacher_admin   (Teacher Dashboard)
└── STUDENT              →   student         (Student Dashboard)
```

---

## 🐛 Critical Issues Identified

### Issue #1: **Broken Question Visibility Filter** ❌❌❌ CRITICAL

**Location:** `server/src/controllers/questionBankController.ts:42-57`

```typescript
const questions = await prisma.questionBankEntry.findMany({
  where: {
    subject: query.subject,
    chapter: query.chapter,
    difficulty: query.difficulty,
    text: query.search ? { contains: query.search, mode: 'insensitive' } : undefined,
    OR: [
      { isPublic: true },
      req.user?.teacherId ? { teacherId: req.user.teacherId } : {},
      // ☝️ PROBLEM: Empty object {} is invalid in Prisma OR clause!
    ],
  },
  include: {
    options: true,
  },
  orderBy: { createdAt: 'desc' },
})
```

**Problems:**

1. **Empty object in OR clause:** When a user doesn't have `teacherId` (admin, students without teacher role), an empty `{}` is passed to the OR array. This creates an invalid filter that can match nothing or incorrectly filter results.

2. **What Actually Happens:**
   - **Chemistry Teacher (with teacherId):** Sees only their own questions + public questions ✅
   - **Physics Teacher (with teacherId):** Sees only their own questions + public questions ✅
   - **Math Teacher (with teacherId):** Sees only their own questions + public questions ✅
   - **Admin (superadmin/institute_admin):** Has NO teacherId in token → gets empty `{}` in OR → **SEES NO QUESTIONS** ❌
   - **Students:** Have NO teacherId → **SEES NO QUESTIONS** ❌

3. **Why Questions Appear Private:**
   - Questions created with `isPublic: false` (default) are stored as private
   - Only the creating teacher can see them (because their `teacherId` matches)
   - Other teachers cannot see them because:
     - Their teacherId doesn't match
     - The question is not marked as public

---

### Issue #2: **No Access Control on Update/Delete** ⚠️

**Location:** `server/src/controllers/questionBankController.ts:107-172`

```typescript
export const updateBankQuestion = async (req: Request, res: Response) => {
  const { id } = z.object({ id: z.string() }).parse(req.params)

  const existing = await prisma.questionBankEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError('Question not found', 404)
  }

  // ☝️ PROBLEM: No check if req.user.teacherId === existing.teacherId!
  // Any teacher_admin can edit ANY question

  const updated = await tx.questionBankEntry.update({
    where: { id },
    // ... updates ...
  })
}
```

**Problem:** Any teacher can edit or delete ANY question, even those created by other teachers. There's no ownership verification.

---

### Issue #3: **Missing Admin Override Capability** 🚫

**Current Behavior:**
- Admins cannot view any teacher-created questions
- No endpoint for admins to bulk approve/reject questions
- No audit trail of who can see what

**Expected Behavior:**
- Admins should see ALL questions (both public and private)
- Admins should have override capability for security/compliance

---

### Issue #4: **Unclear `isPublic` Intent** 🤔

**Current Implementation:**
- `isPublic` is stored in the database
- Frontend checkbox allows superadmin/teacher_admin to mark questions as global
- But the actual behavior is unclear:
  - Does it mean "visible to all teachers"? ✓
  - Does it mean "visible to all students"? ✗
  - Does it mean "visible to all admins"? ✓

**Location:** `client/src/pages/QuestionBankPage.tsx:471-484`

```typescript
{(user?.role === 'superadmin' || user?.role === 'teacher_admin') && (
  <div className="md:col-span-3 flex items-center gap-3 p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10">
    <input
      type="checkbox"
      id="isPublic"
      checked={currentQuestion?.isPublic || false}
      onChange={(e) => setCurrentQuestion(prev => ({ ...prev, isPublic: e.target.checked }))}
    />
    <label htmlFor="isPublic" className="text-sm font-bold cursor-pointer">
      Make this question <span className="text-primary-500">Global</span> (Visible to all teachers)
    </label>
  </div>
)}
```

---

## 📋 Question Visibility Matrix (Current vs Intended)

### CURRENT BEHAVIOR ❌

|  | Private Q (Teacher A) | Public Q (Teacher A) | Private Q (Teacher B) | Public Q (Teacher B) |
|---|---|---|---|---|
| **Teacher A** | ✅ See | ✅ See | ❌ Cannot | ✅ See |
| **Teacher B** | ❌ Cannot | ✅ See | ✅ See | ✅ See |
| **Admin** | ❌ Cannot | ❌ Cannot | ❌ Cannot | ❌ Cannot |
| **Students** | ❌ Cannot | ❌ Cannot | ❌ Cannot | ❌ Cannot |

### INTENDED BEHAVIOR ✅

|  | Private Q (Teacher A) | Public Q (Teacher A) | Private Q (Teacher B) | Public Q (Teacher B) |
|---|---|---|---|---|
| **Teacher A** | ✅ See | ✅ See | ❌ Cannot | ✅ See |
| **Teacher B** | ❌ Cannot | ✅ See | ✅ See | ✅ See |
| **Admin** | ✅ See | ✅ See | ✅ See | ✅ See |
| **Students** | ❌ Cannot | ? (Scope TBD) | ❌ Cannot | ? (Scope TBD) |

---

## 🔍 Data Verification

### Are Questions Actually Being Saved?

**YES ✅** - Questions are being saved to the database with correct structure:

```sql
-- Example data saved (what you're experiencing)
SELECT id, "teacherId", "isPublic", subject, text FROM "QuestionBankEntry" LIMIT 5;

id          teacherId      isPublic    subject     text
uuid-001    teacher-123    false       CHEMISTRY   What is...?
uuid-002    teacher-456    false       PHYSICS     How is...?
uuid-003    teacher-789    false       MATHEMATICS What does...?
```

**The problem is not with saving, but with RETRIEVAL.**

---

## 🎯 Root Cause Analysis

### Why Each Teacher Only Sees Their Own Questions

1. **Buggy Filter Logic:**
   - Query uses `OR` with empty `{}` which is invalid Prisma syntax
   - When `isPublic: false` and teacherId doesn't match → NO RESULTS
   - Each teacher sees only: (isPublic: true OR teacherId: myId)

2. **Default Privacy:**
   - New questions default to `isPublic: false`
   - This makes them immediately private to only the creating teacher

3. **No Question Sharing Mechanism:**
   - No way to share questions between specific teachers
   - No "subject teachers" concept
   - All sharing is binary: private or global

---

## 🛠️ Recommended Solutions

### Solution 1: Fix the Query Filter (IMMEDIATE - 15 mins)

**File:** `server/src/controllers/questionBankController.ts`

```typescript
export const getQuestionBank = async (req: Request, res: Response): Promise<void> => {
  const query = z.object({
    subject: z.nativeEnum(Subject).optional(),
    chapter: z.string().optional(),
    difficulty: z.nativeEnum(Difficulty).optional(),
    search: z.string().optional(),
  }).parse(req.query)

  const whereConditions: Prisma.QuestionBankEntryWhereInput[] = [
    { isPublic: true }, // Everyone sees public questions
  ]

  // Teachers see their own questions
  if (req.user?.teacherId) {
    whereConditions.push({ teacherId: req.user.teacherId })
  }

  // Admins see all questions
  if (['superadmin', 'institute_admin'].includes(req.user?.role!)) {
    // Admins don't need OR condition - we'll use separate logic
    const questions = await prisma.questionBankEntry.findMany({
      where: {
        subject: query.subject,
        chapter: query.chapter,
        difficulty: query.difficulty,
        text: query.search ? { contains: query.search, mode: 'insensitive' } : undefined,
        // Admins see everything
      },
      include: { options: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: questions })
    return
  }

  // Non-admin users see public + their own
  const questions = await prisma.questionBankEntry.findMany({
    where: {
      subject: query.subject,
      chapter: query.chapter,
      difficulty: query.difficulty,
      text: query.search ? { contains: query.search, mode: 'insensitive' } : undefined,
      OR: whereConditions.length > 0 ? whereConditions : undefined,
    },
    include: { options: true },
    orderBy: { createdAt: 'desc' },
  })

  res.json({ success: true, data: questions })
}
```

---

### Solution 2: Add Access Control on Update/Delete (HIGH - 20 mins)

**File:** `server/src/controllers/questionBankController.ts`

```typescript
export const updateBankQuestion = async (req: Request, res: Response): Promise<void> => {
  const { id } = z.object({ id: z.string() }).parse(req.params)

  const existing = await prisma.questionBankEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError('Question not found', 404)
  }

  // Check ownership: only allow updates if user is the creator or admin
  const isAdmin = ['superadmin', 'institute_admin'].includes(req.user?.role!)
  const isOwner = existing.teacherId === req.user?.teacherId

  if (!isAdmin && !isOwner) {
    throw new ApiError('You do not have permission to edit this question', 403)
  }

  // ... rest of update logic ...
}

export const deleteBankQuestion = async (req: Request, res: Response): Promise<void> => {
  const { id } = z.object({ id: z.string() }).parse(req.params)

  const existing = await prisma.questionBankEntry.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError('Question not found', 404)
  }

  // Check ownership
  const isAdmin = ['superadmin', 'institute_admin'].includes(req.user?.role!)
  const isOwner = existing.teacherId === req.user?.teacherId

  if (!isAdmin && !isOwner) {
    throw new ApiError('You do not have permission to delete this question', 403)
  }

  await prisma.questionBankEntry.delete({ where: { id } })
  res.json({ success: true, message: 'Question deleted from bank' })
}
```

---

### Solution 3: Clarify `isPublic` Semantics (MEDIUM - 30 mins)

**Option A: Two-level Visibility**
- `isPublic: false` → Private (only teacher can see)
- `isPublic: true` → Shared (all teachers with same subject can see)

**Option B: Three-level Visibility** (Recommended)
Add a new enum field instead of boolean:
```typescript
enum QuestionVisibility {
  PRIVATE        // Only creator
  SHARED_SUBJECT // All teachers of this subject
  PUBLIC         // All teachers
  SCHOOL_WIDE    // All teachers + students of institute
}
```

Then update Prisma schema:
```prisma
model QuestionBankEntry {
  // ... existing fields ...
  visibility QuestionVisibility @default(PRIVATE)
}
```

Update controller:
```typescript
OR: [
  { visibility: 'PUBLIC' },
  ...(req.user?.teacherId ? [{ teacherId: req.user.teacherId }] : []),
  ...(req.user?.role === 'teacher_admin' && req.user.subject ? [
    { AND: [{ visibility: 'SHARED_SUBJECT' }, { subject: req.user.subject }] }
  ] : []),
]
```

---

### Solution 4: Add Admin Dashboard View (MEDIUM - 45 mins)

Create a new endpoint for admins only:

```typescript
// GET /question-bank/admin/all - View all questions
export const getQuestionBankAdmin = async (req: Request, res: Response): Promise<void> => {
  if (!['superadmin', 'institute_admin'].includes(req.user?.role!)) {
    throw new ApiError('Forbidden', 403)
  }

  const questions = await prisma.questionBankEntry.findMany({
    include: {
      options: true,
      teacher: { select: { id: true, subject: true, user: { select: { username: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json({ success: true, data: questions })
}
```

Create an admin view in frontend showing:
- Who created each question
- Visibility status
- Statistics (questions per teacher, per subject)
- Bulk actions (approve, reject, delete)

---

### Solution 5: Add Question Audit Trail (LOW - 1 hour)

Track who accessed/edited questions for compliance:

```prisma
model QuestionAuditLog {
  id        String    @id @default(cuid())
  questionId String
  userId    String
  action    String    // 'created', 'viewed', 'edited', 'deleted'
  timestamp DateTime  @default(now())

  question QuestionBankEntry @relation(fields: [questionId])

  @@index([questionId, userId])
}
```

---

## 📝 Implementation Priority

### Phase 1: Critical Fixes (1-2 hours)
1. ✅ Fix the query filter (Solution 1)
2. ✅ Add access control on update/delete (Solution 2)

### Phase 2: Clarity (1-2 hours)
3. ✅ Clarify `isPublic` semantics (Solution 3)
4. ✅ Add validation that prevents students from seeing teacher questions

### Phase 3: Enhancement (2-3 hours)
5. ✅ Add admin dashboard (Solution 4)
6. ✅ Add audit logging (Solution 5)

---

## 🧪 Testing Checklist

### After Implementing Fixes

- [ ] Chemistry teacher logs in → sees only their questions + public questions
- [ ] Physics teacher logs in → sees only their questions + public questions
- [ ] Admin logs in → sees ALL questions from all teachers
- [ ] Try to edit/delete another teacher's question → get 403 Forbidden
- [ ] Mark a question as public → all teachers can see it
- [ ] Students logging in → cannot see any questions (or see only assigned questions)
- [ ] Search filters work correctly for each role
- [ ] Bulk upload assigns correct teacherId to bulk-uploaded questions

---

## 🔐 Security Considerations

1. **Enforce Ownership:** Never allow cross-teacher editing
2. **Admin Transparency:** Log when admins view/modify questions
3. **Student Access:** Ensure students never see question bank directly
4. **Rate Limiting:** Add limits to bulk upload to prevent abuse
5. **Validation:** Validate that teacher's subject matches question subject (optional)

---

## 📊 Database Query Examples

### Verify Current Data State

```sql
-- See all questions and their owners
SELECT qbe.id, u.username as creator, qbe."isPublic", qbe.subject, COUNT(bo.id) as option_count
FROM "QuestionBankEntry" qbe
LEFT JOIN "TeacherProfile" tp ON qbe."teacherId" = tp.id
LEFT JOIN "User" u ON tp."userId" = u.id
LEFT JOIN "BankOption" bo ON qbe.id = bo."questionBankId"
GROUP BY qbe.id, u.username;

-- See questions per teacher
SELECT u.username, COUNT(*) as question_count, SUM(CASE WHEN qbe."isPublic" THEN 1 ELSE 0 END) as public_count
FROM "QuestionBankEntry" qbe
LEFT JOIN "TeacherProfile" tp ON qbe."teacherId" = tp.id
LEFT JOIN "User" u ON tp."userId" = u.id
GROUP BY u.username;
```

---

## 📚 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    QUESTION BANK FLOW                       │
└─────────────────────────────────────────────────────────────┘

                    Frontend (QuestionBankPage)
                              │
                              ↓
                    GET /api/question-bank
                              │
                    ┌─────────┴─────────┐
                    ↓                   ↓
            Authenticate            Extract Role
            & Extract               (superadmin,
            teacherId               institute_admin,
                                    teacher_admin,
                    │               student)
                    ↓                   │
         ┌──────────────────────────────┘
         ↓
  ┌─────────────────────────────────────────────┐
  │   questionBankController.getQuestionBank    │
  ├─────────────────────────────────────────────┤
  │ Current (BROKEN):                           │
  │ - If admin: sees NOTHING (empty {} bug)     │
  │ - If teacher: sees own + public            │
  │                                             │
  │ Fixed (PROPOSED):                           │
  │ - If admin: sees ALL                        │
  │ - If teacher: sees own + public             │
  │ - If student: sees none                     │
  └─────────────────────────────────────────────┘
         │
         ↓
  ┌─────────────────────────────────────────────┐
  │    Prisma Query: findMany()                 │
  ├─────────────────────────────────────────────┤
  │ WHERE:                                      │
  │  - subject (optional filter)                │
  │  - chapter (optional filter)                │
  │  - difficulty (optional filter)             │
  │  - text (optional search)                   │
  │  - OR: [                                    │
  │      { isPublic: true }                     │
  │      { teacherId: myId } (if teacher)       │
  │    ]                                        │
  └─────────────────────────────────────────────┘
         │
         ↓
  ┌─────────────────────────────────────────────┐
  │    QuestionBankEntry + BankOption[]         │
  │    (from Database with relations)           │
  └─────────────────────────────────────────────┘
         │
         ↓
  ┌─────────────────────────────────────────────┐
  │  Return JSON Response                       │
  │  { success: true, data: [...] }             │
  └─────────────────────────────────────────────┘
         │
         ↓
  Frontend displays questions with Edit/Delete
  buttons (only for owned questions)
```

---

## 🎯 Summary: What's Working vs What's Broken

### ✅ Working
- Questions are saved to database correctly
- Teachers can create questions
- Question schema with options is correct
- Bulk upload and AI generation save correctly
- Frontend UI is polished

### ❌ Broken
- **Admin cannot see ANY questions** (critical)
- **Query filter with empty `{}` is invalid**
- **No access control on edit/delete**
- **Teachers can edit other teachers' questions**
- **Students might have access to question bank**

### ⚠️ Unclear
- Actual intended visibility rules
- Whether students should see questions
- What "global/public" truly means
- Audit trail requirements

---

## 📞 Next Steps

1. **Confirm Requirements:** Clarify the exact visibility rules you want
2. **Apply Fixes:** Implement Solutions 1-3 (2-3 hours)
3. **Test Thoroughly:** Use testing checklist above
4. **Deploy:** Verify on staging first
5. **Monitor:** Watch for any visibility issues in production

---

**Document prepared by:** Code Analysis
**Severity:** 🔴 CRITICAL
**Estimated Fix Time:** 2-3 hours (quick fix) → 5-6 hours (complete redesign)
