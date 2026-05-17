# Phase 2: Frontend-Backend Integration Plan

## Goal
Replace localStorage-based form instance storage with API calls to the backend.

## Summary
- Create `useFormTemplatesApi.ts` - fetch templates from API (resolves "i-765" → UUID)
- Create `useFormInstancesApi.ts` - CRUD operations for form instances via API
- Update 3 components: `FormInstance.tsx`, `Forms.tsx`, `ClientForms.tsx`
- Handle data conversion between flat `data` object and API `responses` structure

---

## Files to Create

### 1. `frontend/src/hooks/useFormTemplatesApi.ts`
Fetches templates from backend API.

**Key functions:**
- `useGetByFormNumber(formNumber)` - Resolves "I-765" → UUID + full template

### 2. `frontend/src/hooks/useFormInstancesApi.ts`
Replaces localStorage with API calls.

**Key functions:**
- `listQuery` - List instances for a client
- `useGet(id)` - Get instance with responses
- `useCreate()` - Create instance with initial responses + autofill
- `useUpdate()` - Update status/progress
- `useUpdateResponses()` - Bulk save field values
- `useDelete()` - Soft delete

**Data conversion utilities:**
- `responsesToFlatData()` - API responses → flat data for MultiStepForm
- `buildResponseUpdates()` - Flat data → API update payload

---

## Files to Modify

### 3. `frontend/src/pages/Forms.tsx`
Update instance creation flow:
- Resolve templateId → formTemplateId via `useFormTemplatesApi`
- Build initial responses from autofill mappings + client's active values
- Call `useCreate()` mutation instead of localStorage

### 4. `frontend/src/pages/FormInstance.tsx`
Update load/save flow:
- Fetch instance via `useGet(instanceId)` instead of `getInstance()`
- Convert `responses` to flat data for MultiStepForm
- Save via `useUpdateResponses()` instead of `updateInstance()`
- Mark complete via `useUpdate({ status: "completed" })`

### 5. `frontend/src/pages/client-detail/ClientForms.tsx`
Update listing:
- Use `useFormInstancesApi(clientId)` instead of `listInstancesForClient()`
- Instance includes `formNumber` and `formTitle` from API join

---

## Key Data Transformations

### Loading (API → Form)
```
API: { responses: { fieldName: { id, formFieldId, value, version } } }
Form: { data: { fieldName: value } }
```

### Saving (Form → API)
```
Form: { data: { fieldName: value } }
API: { responses: [{ formFieldId, value, version }] }
```

---

## Implementation Steps

| # | Task | File |
|---|------|------|
| 1 | Create useFormTemplatesApi hook | `hooks/useFormTemplatesApi.ts` |
| 2 | Create useFormInstancesApi hook | `hooks/useFormInstancesApi.ts` |
| 3 | Update Forms.tsx (creation) | `pages/Forms.tsx` |
| 4 | Update FormInstance.tsx (load/save) | `pages/FormInstance.tsx` |
| 5 | Update ClientForms.tsx (listing) | `pages/client-detail/ClientForms.tsx` |
| 6 | Test full flow | - |

---

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/form-templates/by-form-number/:formNumber` | Resolve template |
| GET | `/api/form-instances?clientId=` | List client's instances |
| GET | `/api/form-instances/:id` | Get instance + responses |
| POST | `/api/form-instances` | Create instance |
| PATCH | `/api/form-instances/:id` | Update status |
| PATCH | `/api/form-instances/:instanceId/responses` | Bulk save responses |
| DELETE | `/api/form-instances/:id` | Soft delete |

---

## Critical Files Reference

| Purpose | Path |
|---------|------|
| Current localStorage hook | `frontend/src/hooks/useFormInstances.ts` |
| API patterns to follow | `frontend/src/hooks/useClients.ts` |
| Hono client | `frontend/src/lib/api.ts` |
| Backend routes | `backend/src/routes/form-instances.ts` |
| Backend template routes | `backend/src/routes/form-templates.ts` |
