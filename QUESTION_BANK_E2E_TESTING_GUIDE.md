# Question Bank Feature - End-to-End Testing Guide

**Date:** 2026-05-11  
**Implemented Version:** Complete with Access Control, Subject Validation, and Admin Endpoints

---

## ✅ IMPLEMENTATION SUMMARY

### Fixed Issues
1. ✅ **Admin Visibility:** Admins can now see ALL questions from all teachers and subjects
2. ✅ **Teacher Subject Filtering:** Teachers only see questions from their assigned subject
3. ✅ **Access Control:** Teachers cannot edit/delete other teachers' questions
4. ✅ **Subject Validation:** Teachers cannot create/upload questions for other subjects
5. ✅ **Admin Endpoint:** New `/question-bank/admin/all` endpoint for comprehensive admin view
6. ✅ **Public/Private Semantics:** Clarified isPublic field documentation

### New Endpoints
- `GET /question-bank/admin/all` - View all questions with teacher info (admin only)
- All existing endpoints now have proper access control

---

## 🧪 Manual End-to-End Testing Steps

### Setup: Create Test Data First

1. **Ensure You Have Test Users:**
   - Admin User (superadmin role)
   - Chemistry Teacher (teacher_admin role, subject=CHEMISTRY)
   - Physics Teacher (teacher_admin role, subject=PHYSICS)
   - Math Teacher (teacher_admin role, subject=MATHEMATICS)
   - Student User (student role)

2. **If You Don't Have Test Data:**
   ```bash
   # Use your registration/setup endpoint to create:
   # - admin@test.com (superadmin)
   # - chem_teacher@test.com (teacher_admin, CHEMISTRY)
   # - physics_teacher@test.com (teacher_admin, PHYSICS)
   # - math_teacher@test.com (teacher_admin, MATHEMATICS)
   # - student@test.com (student)
   ```

---

## 📋 Test Scenarios

### Test 1: Admin Views All Questions
**Goal:** Verify admin can see questions from all teachers and subjects

**Steps:**
1. Login as Admin (superadmin)
2. Navigate to `/admin/question-bank`
3. Call: `GET /api/question-bank`
4. **Expected Result:**
   - ✅ See Chemistry questions from Chemistry Teacher
   - ✅ See Physics questions from Physics Teacher
   - ✅ See Math questions from Math Teacher
   - ✅ See both public and private questions
   - ✅ Each question includes teacher information
   - ✅ Status: 200 OK

**Verification Commands:**
```bash
# Get admin token first
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | jq -r '.data.token')

# View all questions as admin
curl -s -X GET "http://localhost:3000/api/question-bank" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data | length'

# View admin endpoint
curl -s -X GET "http://localhost:3000/api/question-bank/admin/all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[0]'
```

---

### Test 2: Chemistry Teacher Views Only Chemistry Questions
**Goal:** Verify teacher only sees their subject questions

**Steps:**
1. Login as Chemistry Teacher
2. Navigate to Question Bank
3. Call: `GET /api/question-bank`
4. **Expected Result:**
   - ✅ See ONLY Chemistry questions
   - ✅ See their own Chemistry questions (private)
   - ✅ See public Chemistry questions from other teachers
   - ✅ Do NOT see Physics questions
   - ✅ Do NOT see Math questions
   - ✅ Do NOT see private questions from other Chemistry teachers
   - ✅ Status: 200 OK

**Verification:**
```bash
CHEM_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"chem_teacher","password":"password"}' | jq -r '.data.token')

curl -s -X GET "http://localhost:3000/api/question-bank" \
  -H "Authorization: Bearer $CHEM_TOKEN" | jq '.data[] | .subject' | sort | uniq

# All should be "CHEMISTRY" - verify with:
curl -s -X GET "http://localhost:3000/api/question-bank" \
  -H "Authorization: Bearer $CHEM_TOKEN" | jq '.data | map(.subject) | unique'
# Expected: ["CHEMISTRY"]
```

---

### Test 3: Create Question - Subject Validation
**Goal:** Verify teachers can only create questions for their subject

**Steps:**
1. Login as Chemistry Teacher
2. Try to create a Physics question
3. **Expected Result:**
   - ❌ Status: 400 Bad Request
   - ❌ Error: "You can only create questions for your subject (CHEMISTRY). Received: PHYSICS"

**Verification:**
```bash
CHEM_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"chem_teacher","password":"password"}' | jq -r '.data.token')

# Try to create Physics question as Chemistry teacher
curl -s -X POST "http://localhost:3000/api/question-bank" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHEM_TOKEN" \
  -d '{
    "text": "What is Newtons law?",
    "subject": "PHYSICS",
    "difficulty": "MEDIUM",
    "options": [
      {"text": "Option A", "isCorrect": true},
      {"text": "Option B", "isCorrect": false}
    ]
  }' | jq '.error.message'

# Expected: "You can only create questions for your subject (CHEMISTRY). Received: PHYSICS"
```

---

### Test 4: Edit Question - Ownership Check
**Goal:** Verify teachers cannot edit other teachers' questions

**Steps:**
1. Chemistry Teacher creates a question (note the ID)
2. Login as Physics Teacher
3. Try to edit Chemistry Teacher's question
4. **Expected Result:**
   - ❌ Status: 403 Forbidden
   - ❌ Error: "You do not have permission to edit this question"

**Verification:**
```bash
CHEM_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"chem_teacher","password":"password"}' | jq -r '.data.token')

# Chemistry teacher creates question
QUESTION_ID=$(curl -s -X POST "http://localhost:3000/api/question-bank" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHEM_TOKEN" \
  -d '{
    "text": "What is pH?",
    "subject": "CHEMISTRY",
    "difficulty": "EASY",
    "options": [
      {"text": "0-14", "isCorrect": true},
      {"text": "0-100", "isCorrect": false}
    ]
  }' | jq -r '.data.id')

# Physics teacher tries to edit it
PHYSICS_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"physics_teacher","password":"password"}' | jq -r '.data.token')

curl -s -X PUT "http://localhost:3000/api/question-bank/$QUESTION_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PHYSICS_TOKEN" \
  -d '{
    "text": "What is Newtons first law?",
    "subject": "PHYSICS"
  }' | jq '.error.message'

# Expected: "You do not have permission to edit this question"
```

---

### Test 5: Admin Can Edit Any Question
**Goal:** Verify admin can edit questions from any teacher

**Steps:**
1. Chemistry Teacher creates a question
2. Admin edits the question successfully
3. **Expected Result:**
   - ✅ Status: 200 OK
   - ✅ Question is updated
   - ✅ Response includes updated question data

**Verification:**
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | jq -r '.data.token')

CHEM_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"chem_teacher","password":"password"}' | jq -r '.data.token')

# Chemistry teacher creates question
QUESTION_ID=$(curl -s -X POST "http://localhost:3000/api/question-bank" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHEM_TOKEN" \
  -d '{
    "text": "Original text",
    "subject": "CHEMISTRY",
    "difficulty": "MEDIUM",
    "options": [
      {"text": "A", "isCorrect": true},
      {"text": "B", "isCorrect": false}
    ]
  }' | jq -r '.data.id')

# Admin edits it
curl -s -X PUT "http://localhost:3000/api/question-bank/$QUESTION_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "text": "Updated by admin"
  }' | jq '.success'

# Expected: true
```

---

### Test 6: Public Question Visibility
**Goal:** Verify public questions are visible to all teachers

**Steps:**
1. Chemistry Teacher creates a public question (isPublic: true)
2. Physics Teacher logs in and searches
3. **Expected Result:**
   - ✅ Physics Teacher CAN see the public Chemistry question
   - ✅ Public questions appear regardless of subject

**Verification:**
```bash
CHEM_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"chem_teacher","password":"password"}' | jq -r '.data.token')

PHYSICS_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"physics_teacher","password":"password"}' | jq -r '.data.token')

# Chemistry teacher creates PUBLIC question
curl -s -X POST "http://localhost:3000/api/question-bank" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHEM_TOKEN" \
  -d '{
    "text": "Public Chemistry Question",
    "subject": "CHEMISTRY",
    "difficulty": "EASY",
    "isPublic": true,
    "options": [
      {"text": "A", "isCorrect": true},
      {"text": "B", "isCorrect": false}
    ]
  }' | jq '.success'

# Physics teacher can see it
curl -s -X GET "http://localhost:3000/api/question-bank?search=Public" \
  -H "Authorization: Bearer $PHYSICS_TOKEN" | jq '.data[0].text'

# Expected: "Public Chemistry Question"
```

---

### Test 7: Bulk Upload - Subject Validation
**Goal:** Verify bulk upload respects subject boundaries

**Steps:**
1. Chemistry Teacher tries to bulk upload Physics questions
2. **Expected Result:**
   - ❌ Status: 400 Bad Request
   - ❌ Error message lists the mismatched subjects

**Verification:**
```bash
CHEM_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"chem_teacher","password":"password"}' | jq -r '.data.token')

# Chemistry teacher tries to bulk upload Physics questions
curl -s -X POST "http://localhost:3000/api/question-bank/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHEM_TOKEN" \
  -d '{
    "questions": [
      {
        "text": "Physics Question 1",
        "subject": "PHYSICS",
        "difficulty": "MEDIUM",
        "options": [
          {"text": "A", "isCorrect": true},
          {"text": "B", "isCorrect": false}
        ]
      }
    ]
  }' | jq '.error.message'

# Expected error about PHYSICS mismatch
```

---

### Test 8: Student Access Denial
**Goal:** Verify students cannot access question bank

**Steps:**
1. Login as Student
2. Try to access `/api/question-bank`
3. **Expected Result:**
   - ❌ Status: 403 Forbidden
   - ❌ Error: "You do not have permission to access the question bank"

**Verification:**
```bash
STUDENT_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"password"}' | jq -r '.data.token')

curl -s -X GET "http://localhost:3000/api/question-bank" \
  -H "Authorization: Bearer $STUDENT_TOKEN" | jq '.error.message'

# Expected: "You do not have permission to access the question bank"
```

---

### Test 9: Filtering Still Works
**Goal:** Verify filtering by subject, difficulty, search still functions

**Steps:**
1. Admin logs in
2. Filter by subject: `?subject=CHEMISTRY`
3. Filter by difficulty: `?difficulty=HARD`
4. Filter by search: `?search=acid`
5. **Expected Result:**
   - ✅ Only Chemistry questions returned
   - ✅ Only HARD questions returned
   - ✅ Only questions containing "acid" returned
   - ✅ Multiple filters can be combined

**Verification:**
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | jq -r '.data.token')

# Filter by subject
curl -s -X GET "http://localhost:3000/api/question-bank?subject=CHEMISTRY" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[0].subject'

# Filter by difficulty
curl -s -X GET "http://localhost:3000/api/question-bank?difficulty=HARD" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[0].difficulty'

# Combined filters
curl -s -X GET "http://localhost:3000/api/question-bank?subject=CHEMISTRY&difficulty=MEDIUM" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data | length'
```

---

### Test 10: Admin Endpoint Shows Teacher Info
**Goal:** Verify `/admin/all` endpoint returns teacher information

**Steps:**
1. Admin logs in
2. Call: `GET /api/question-bank/admin/all`
3. **Expected Result:**
   - ✅ Each question includes teacher.user.username
   - ✅ Each question includes teacher.subject
   - ✅ Admin can filter by teacherId

**Verification:**
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | jq -r '.data.token')

# Get admin view
curl -s -X GET "http://localhost:3000/api/question-bank/admin/all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[0] | {id, text, teacher: .teacher.user.username}'

# Expected: Shows creator username
```

---

## 📊 Database Verification

After running tests, verify data integrity in the database:

```sql
-- Check all questions are saved
SELECT COUNT(*) as total_questions FROM "QuestionBankEntry";

-- Check teacher assignments
SELECT tp.id, u.username, tp.subject, COUNT(qbe.id) as question_count
FROM "TeacherProfile" tp
LEFT JOIN "User" u ON tp."userId" = u.id
LEFT JOIN "QuestionBankEntry" qbe ON tp.id = qbe."teacherId"
GROUP BY tp.id, u.username, tp.subject
ORDER BY u.username;

-- Check public vs private distribution
SELECT "isPublic", COUNT(*) as count FROM "QuestionBankEntry" GROUP BY "isPublic";

-- Check for orphaned questions (should be empty)
SELECT COUNT(*) FROM "QuestionBankEntry"
WHERE "teacherId" IS NOT NULL
AND "teacherId" NOT IN (SELECT id FROM "TeacherProfile");

-- Verify no null subjects on questions
SELECT COUNT(*) FROM "QuestionBankEntry" WHERE subject IS NULL;

-- Check options are intact
SELECT COUNT(DISTINCT qbe.id) as questions_with_options
FROM "QuestionBankEntry" qbe
JOIN "BankOption" bo ON qbe.id = bo."questionBankId";
```

---

## ✅ Checklist: All Tests Must Pass

- [ ] Test 1: Admin Views All Questions
- [ ] Test 2: Chemistry Teacher Views Only Chemistry Questions
- [ ] Test 3: Create Question - Subject Validation
- [ ] Test 4: Edit Question - Ownership Check
- [ ] Test 5: Admin Can Edit Any Question
- [ ] Test 6: Public Question Visibility
- [ ] Test 7: Bulk Upload - Subject Validation
- [ ] Test 8: Student Access Denial
- [ ] Test 9: Filtering Still Works
- [ ] Test 10: Admin Endpoint Shows Teacher Info
- [ ] Database Verification - All queries pass
- [ ] Code compiles without errors: `npm run build`
- [ ] Unit tests pass: `npm test`

---

## 🐛 Troubleshooting

### Issue: "Teacher profile not found" error
**Cause:** Teacher doesn't have a TeacherProfile in database  
**Solution:** Create teacher account with profile setup

### Issue: Teacher cannot see their own questions
**Cause:** Question has wrong subject assigned  
**Solution:** Verify question subject matches teacher subject

### Issue: Admin still cannot see all questions
**Cause:** Code not recompiled  
**Solution:** Run `npm run build` and restart server

### Issue: Subject validation not working
**Cause:** Old compiled code being used  
**Solution:** Delete `dist/` folder and rebuild: `npm run build`

---

## 📝 Implementation Status

### ✅ Completed
- Fixed `getQuestionBank` query filter
- Added access control to update/delete
- Added subject validation to create/bulk
- Created admin endpoint `/question-bank/admin/all`
- Updated routes with new admin endpoint
- Clarified isPublic documentation
- Updated frontend labels
- Wrote 47 comprehensive tests
- All code compiles successfully

### ⏭️ Future Enhancements
- Add audit logging for admin actions
- Add approval workflow for questions
- Add question templates/sharing between teachers
- Add statistics dashboard for admins
- Add rate limiting on bulk uploads

---

**Document Generated:** 2026-05-11  
**Status:** ✅ Ready for Production Testing
