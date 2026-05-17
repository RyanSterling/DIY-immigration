# Claude Code Skills Plan

## What is a Skill?

A **skill** is a markdown file (`.claude/skills/<name>/SKILL.md`) that teaches Claude Code how to perform specific tasks. When you describe a task that matches a skill's purpose, Claude automatically applies the skill's instructions.

Skills encode project-specific patterns so Claude generates code consistent with your codebase.

### Basic Structure

```yaml
---
name: skill-name
description: When to use this skill (max 1024 chars)
allowed-tools: Read, Grep, Glob # optional
---
# Skill Name

Instructions for Claude to follow...
```

### Locations

| Path                       | Scope                     |
| -------------------------- | ------------------------- |
| `~/.claude/skills/<name>/` | Personal (all projects)   |
| `.claude/skills/<name>/`   | Project (shared via repo) |

---

## Proposed Skills

| Skill               | Purpose                                     | When to Use                      | Priority |
| ------------------- | ------------------------------------------- | -------------------------------- | -------- |
| `/api-hook`         | Generate React Query hooks with Hono client | Adding new API endpoints         | High     |
| `/multistep-form`   | Generate multi-step form configs            | Building new form workflows      | High     |
| `/immigration-form` | Create USCIS form templates                 | Implementing I-765, I-131, etc.  | High     |
| `/form-atom`        | Create RHF-integrated input atoms           | Adding new input types           | Medium   |
| `/component`        | Create composite components                 | Building feature components      | Medium   |
| `/page`             | Create route page components                | Adding new views                 | Low      |
| `/document-type`    | Add document extraction types               | Supporting new documents         | Low      |
| `/pdf-field`        | Map PDF fields to form fields               | After PDF editing is implemented | Future   |

---

## Skill Details

### 2. `/multistep-form`

**Generate JSON-driven multi-step form configurations.**

- Config type: `MultiStepFormConfig` from `components/multi-step-form/types.ts`
- Field types: text, email, phone, number, textarea, select, checkbox, radio, date, file
- Conditional fields via `showWhen` rules
- URL-based step navigation

**Reference:** `components/multi-step-form/types.ts`, `MultiStepForm.tsx`

---

### 3. `/immigration-form`

**Create complete USCIS form templates (I-765, I-131, I-485, G-1450, I-864, I-140).**

- Break paper form sections into app steps
- Only include fields with inputs (exclude intro content)
- Support conditional questions
- Exclude signature blocks
- Map to canonical fields for autofill
- Follow "no blocking validation" rule

**Reference:** `CLAUDE.md`, `pages/client-new/types.ts`

---

### 4. `/form-atom`

**Create atomic form components integrated with React Hook Form.**

- Location: `frontend/src/atoms/`
- Uses `useFormContext()` + `register()`
- Wraps in `InputWrapper` for label/error display
- Supports `rules` prop for validation

**Reference:** `atoms/Input.tsx`, `atoms/Select.tsx`, `atoms/DatePicker.tsx`

---

### 5. `/component`

**Create composite components following project patterns.**

- Location: `frontend/src/components/`
- Uses atoms for form elements
- TypeScript interfaces for props
- Tailwind CSS with `cn()` utility

**Reference:** `components/forms/DocumentItem.tsx`

---

### 6. `/page`

**Create route page components.**

- Location: `frontend/src/pages/`
- Uses React Query hooks for data
- Add route to `router.tsx` with lazy loading
- Include loading/error states

**Reference:** `pages/ClientDetail.tsx`, `pages/Clients.tsx`

---

### 7. `/document-type`

**Add new document types to the extraction pipeline.**

- Add to `DocumentType` union in `components/forms/types.ts`
- Update `FileUpload.tsx` options
- Define extraction fields in backend
- Add canonical field mappings

**Reference:** `components/forms/FileUpload.tsx`

---

### 8. `/pdf-field` (Future)

**Map PDF form fields to HTML form fields with bidirectional sync.**

- Create field mapping configuration
- Handle format transformations (dates, etc.)
- Support autofill from extracted data
- Enable two-way updates between PDF viewer and form

**Note:** Implement after react-pdf integration is complete.

---

## Implementation Notes

Each skill should:

1. Include 2-3 concrete examples
2. Reference specific files for patterns
3. List required imports/dependencies
4. Specify TypeScript types to use

Skills live in `.claude/skills/<skill-name>/SKILL.md` for project-wide use.
