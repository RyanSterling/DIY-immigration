# Code Quality Fixes Plan

## Overview

This plan addresses issues discovered during code review of the Template Seeding and Frontend-Backend Integration implementations.

---

## Critical Issues (5)

### 1. Transaction Errors Not Caught
**File:** `backend/src/db/seed-templates.ts`

**Problem:** Database operations inside `db.transaction()` can fail silently. Errors within the transaction don't propagate to the outer catch block properly.

**Fix:**
- Wrap transaction body in try-catch
- Re-throw errors with context
- Log transaction failures with details

---

### 2. Race Condition on Template Lookup
**File:** `backend/src/db/seed-templates.ts`

**Problem:** Check-then-insert pattern is not atomic. Two concurrent processes can both see "no template exists" and attempt to insert, causing duplicate key violations.

**Fix:**
- Use INSERT ... ON CONFLICT (upsert) pattern
- Or use database-level advisory locks for seeding
- Add explicit unique constraint handling

---

### 3. Token Refresh Retry Missing
**Files:** `frontend/src/hooks/useFormInstancesApi.ts`, `frontend/src/hooks/useFormTemplatesApi.ts`

**Problem:** `handleResponse` in `api.ts` throws `{ retryable: true }` after token refresh, but hooks don't retry. Users see error messages for valid operations.

**Fix:**
- Add retry wrapper for mutations
- Check for `retryable` flag on errors
- Automatically retry once on token refresh

---

### 4. Query Key Cache Pollution
**File:** `frontend/src/hooks/useFormInstancesApi.ts:161-172`

**Problem:** `useGet(undefined)` creates cache entry `["formInstances", "detail", undefined]`, causing memory leaks.

**Fix:**
- Guard query key generation: don't include undefined values
- Use conditional query key pattern
- Add cleanup for stale cache entries

---

### 5. List Query Silently Disabled
**File:** `frontend/src/hooks/useFormInstancesApi.ts:148-158`

**Problem:** When `clientId` is undefined, query is disabled via `enabled: !!clientId` but returns empty array. Callers can't distinguish "no data" from "query disabled".

**Fix:**
- Return `undefined` instead of `[]` when query disabled
- Or make `clientId` required parameter
- Add `isDisabled` flag to return value

---

## High Priority Issues (12)

### Backend (4)

#### 6. Cascading Deletes Without FK Validation
**File:** `backend/src/db/seed-templates.ts`

**Problem:** Re-seeding deletes sections which cascades to fields. Fails with FK error if form instances exist.

**Fix:**
- Check for existing form instances before re-seeding
- Either refuse to re-seed or handle gracefully
- Add warning/confirmation for destructive re-seed

---

#### 7. Missing Audit Fields
**File:** `backend/src/db/seed-templates.ts`

**Problem:** `createdBy`/`updatedBy` are NULL - no audit trail.

**Fix:**
- Create system user for seeding operations
- Or use a constant "SYSTEM" identifier
- Set audit fields on all created records

---

#### 8. Validation Rules Not Enforced
**File:** `backend/src/db/seed-templates.ts`

**Problem:** `extractValidationRules()` stores rules but nothing uses them.

**Fix:**
- Document that validation is frontend-only (if intended)
- Or implement backend validation endpoint
- Low priority if frontend handles all validation

---

#### 9. pdfFieldId Type Inconsistency
**File:** `backend/src/db/seed-templates.ts`

**Problem:** `pdfFieldId` can be string OR object. No type guard exists.

**Fix:**
- Add TypeScript union type: `string | Record<string, string>`
- Create helper function: `isPdfFieldIdObject()`
- Use consistent access pattern throughout codebase

---

### Frontend Hooks (3)

#### 10. responsesToFlatData Crashes on Null
**File:** `frontend/src/hooks/useFormInstancesApi.ts`

**Problem:** If `resp.value` is null/undefined, function behavior is undefined.

**Fix:**
```typescript
Object.entries(responses ?? {}).map(([fieldName, resp]) => [
  fieldName,
  resp?.value ?? null
])
```

---

#### 11. buildResponseUpdates Skips New Fields
**File:** `frontend/src/hooks/useFormInstancesApi.ts`

**Problem:** Only creates updates for fields in `existingResponses`. New fields are silently ignored.

**Fix:**
- Accept `allFieldIds` parameter for new field creation
- Or return separate arrays: updates vs creates
- Log warning for unmapped fields

---

#### 12. No onError Mutation Handlers
**Files:** All API hooks

**Problem:** Mutations fail silently - no user feedback.

**Fix:**
- Add `onError` callbacks to all mutations
- Integrate with toast notification system
- Return error state for component handling

---

### Page Components (5)

#### 13. No Error Feedback in Forms.tsx
**File:** `frontend/src/pages/Forms.tsx`

**Problem:** Create mutation fails silently. Button returns to normal state with no message.

**Fix:**
- Add error toast on mutation failure
- Show inline error message
- Keep modal open on failure with error display

---

#### 14. Race Condition in handleComplete
**File:** `frontend/src/pages/FormInstance.tsx`

**Problem:** Two sequential API calls (save responses, then update status). If status update fails, responses were saved but form shows "in progress".

**Fix:**
- Combine into single API endpoint: `completeFormInstance`
- Or use optimistic status update with rollback
- At minimum: show error if status update fails

---

#### 15. formNumber Null Bug
**File:** `frontend/src/pages/client-detail/ClientForms.tsx:105`

**Problem:** Navigation URL uses `formNumber.toLowerCase()`. If null, URL becomes invalid.

**Fix:**
```typescript
const url = formNumber
  ? `/forms/${formNumber.toLowerCase()}/${instance.id}`
  : `/forms/instance/${instance.id}`;
```

---

#### 16. No Success Feedback on Save
**File:** `frontend/src/pages/FormInstance.tsx`

**Problem:** Save shows loading spinner then nothing. No confirmation.

**Fix:**
- Add success toast: "Form saved successfully"
- Or show temporary inline "Saved" indicator
- Update "last saved" timestamp display

---

#### 17. Error State Shows as Empty
**File:** `frontend/src/pages/client-detail/ClientForms.tsx`

**Problem:** API error shows "No forms" instead of error message.

**Fix:**
- Check `isError` state from hook
- Display error message with retry button
- Distinguish between empty vs error states

---

## Medium Priority Issues (6)

### 18. No Optimistic Updates
**Location:** All mutations

**Problem:** UI waits for API response before updating.

**Fix:** Add `onMutate` handlers to update cache optimistically, with rollback on error.

---

### 19. Inconsistent Query Key Patterns
**File:** `frontend/src/hooks/useFormTemplatesApi.ts`

**Problem:** Uses hardcoded strings instead of factory pattern like `useFormInstancesApi`.

**Fix:** Create `formTemplatesKeys` factory object matching the instances pattern.

---

### 20. Silent Field Mapping Failures
**File:** `backend/src/db/seed-templates.ts`

**Problem:** Unmapped PDF fields get `null` with no warning.

**Fix:** Log warning for fields without PDF mappings. Add summary report after seeding.

---

### 21. Missing Validation for showWhen Rules
**File:** `backend/src/db/seed-templates.ts`

**Problem:** Conditional rules reference fields that may not exist.

**Fix:** Validate that all referenced field names exist in template before saving.

---

### 22. Effect Dependency Issues
**File:** `frontend/src/pages/Forms.tsx`

**Problem:** `createMutation.isPending` in useEffect deps can cause issues.

**Fix:** Remove mutation state from effect dependencies. Use mutation callbacks instead.

---

### 23. No Unsaved Changes Warning
**File:** `frontend/src/pages/FormInstance.tsx`

**Problem:** User can navigate away and lose form data.

**Fix:** Add `beforeunload` handler. Use react-router prompt for navigation.

---

## Implementation Order

### Phase 1: Critical Fixes
1. Transaction error handling (Issue #1)
2. Token refresh retry (Issue #3)
3. Query key pollution fix (Issue #4)
4. Error feedback in components (Issues #13, #17)

### Phase 2: High Priority
5. handleComplete race condition (Issue #14)
6. Data conversion null checks (Issues #10, #11)
7. formNumber null bug (Issue #15)
8. Success feedback (Issue #16)
9. onError handlers (Issue #12)

### Phase 3: Medium Priority
10. Remaining issues as time permits

---

## Files to Modify

| File | Issues |
|------|--------|
| `backend/src/db/seed-templates.ts` | #1, #2, #6, #7, #9, #20, #21 |
| `frontend/src/hooks/useFormInstancesApi.ts` | #3, #4, #5, #10, #11, #12 |
| `frontend/src/hooks/useFormTemplatesApi.ts` | #3, #12, #19 |
| `frontend/src/pages/FormInstance.tsx` | #14, #16, #23 |
| `frontend/src/pages/Forms.tsx` | #13, #22 |
| `frontend/src/pages/client-detail/ClientForms.tsx` | #15, #17 |
