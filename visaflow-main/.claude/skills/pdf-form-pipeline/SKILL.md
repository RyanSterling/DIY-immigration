---
name: pdf-form-pipeline
description: Orchestrate the complete PDF form to template pipeline with iterative refinement. Chains analyze, generate, validate, and refine skills.
allowed-tools: Read, Write, Edit, Glob, Grep, Task, Skill
---

# PDF Form Pipeline Skill

Orchestrates the complete PDF form processing pipeline, chaining analysis, generation, validation, and refinement phases with checkpoint-based resumability.

## When to Use

Use this skill when you want to:
- Process a PDF form end-to-end from raw PDF to validated TypeScript template
- Automatically handle the full pipeline with iterative refinement
- Resume a failed or interrupted pipeline run from the last successful phase

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| PDF file path | Yes | Path to the USCIS PDF form to process |

## Outputs

- Validated `FormTemplate` TypeScript file in `frontend/src/templates/`
- JSON template file in `frontend/src/templates/_generated/` (for database seeding)
- Analysis documentation in `docs/forms/`
- Optionally: Template seeded to database
- Checkpoint file removed on successful completion

## Pipeline Flow

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌───────────────┐     ┌─────────┐     ┌────────────┐     ┌──────┐
│ analyze │ ──▶ │ generate │ ──▶ │ validate │ ──▶ │ done/refine   │ ──▶ │ preview │ ──▶ │ ask user   │ ──▶ │ seed │
└─────────┘     └──────────┘     └──────────┘     └───────────────┘     └─────────┘     │ seed now?  │     └──────┘
                                       │                  │                             └────────────┘
                                       │    ┌─────────────┘
                                       │    │ (if validation issues found)
                                       │    ▼
                                       │  ┌────────┐
                                       │  │ refine │
                                       │  └────────┘
                                       │    │
                                       └────┘ (re-validate, max 3 iterations)
```

**Phases:**
1. **analyze** - Extract structure from PDF using parallel sub-agents
2. **generate** - Convert analysis JSON to TypeScript template
3. **validate** - Check template completeness and correctness
4. **refine** - Fix validation issues (up to 3 iterations)
5. **preview** - Visual verification of PDF field mappings
6. **seed** - Insert template into database (optional)

## Process

### 1. Initialize Pipeline

Check for existing checkpoint file at `.claude/checkpoints/{form-name}-pipeline.md`:

```markdown
# Pipeline Checkpoint: {form-name}

## Status
- Phase: analyze | generate | validate | refine
- Iteration: 1-3 (for refine phase)
- Started: {timestamp}
- Last Updated: {timestamp}

## Completed Phases
- [x] analyze - {timestamp}
- [ ] generate
- [ ] validate
- [ ] refine
- [ ] seed

## Current State
{serialized state data}
```

### 2. Run Analysis Phase

Invoke the analyze skill on a sub-agent:
```
/analyze-pdf-form {pdf-path}
```

**Expected output:**
- Analysis markdown in `docs/forms/{form-name}/analysis.md`
- Field mapping data for generation phase

Update checkpoint to mark analyze complete.

### 3. Run Generation Phase

Invoke the generate skill on a sub-agent:
```
/generate-form-template {form-name}
```

**Expected output:**
- TypeScript template file at `frontend/src/templates/{form-name}.ts`

Update checkpoint to mark generate complete.

### 4. Run Validation Phase

Invoke the validate skill on a sub-agent:
```
/validate-form-template {template-path}
```

**Expected output:**
- Validation report with pass/fail status
- List of issues if any found

Update checkpoint to mark validate complete (or record issues).

### 5. Handle Validation Results

**If validation passes:**
- Report success with template location
- Proceed to preview phase (step 6.5)

**If validation fails:**
- Proceed to refinement phase
- Track iteration count

### 6. Run Refinement Phase (if needed)

Invoke the refine skill on a sub-agent with validation issues:
```
/refine-form-template {template-path} --issues "{issue-list}"
```

**Iteration loop:**
```
for iteration in 1..3:
    run refine with current issues
    run validate on refined template
    if validation passes:
        break
    if iteration == 3:
        report partial success with remaining issues
```

Update checkpoint after each iteration.

### 6.5. Run Preview Phase

After validation passes (either initially or after refinement), show a visual preview of the mappings:

Invoke the preview skill:
```
/preview-pdf-mapping {form-name}
```

**Expected output:**
- Summary table with field counts and coverage
- Section-by-section mapping preview (form field → PDF field → autofill)
- List of unmapped fields (if any)
- Warnings for potential issues
- Conditional logic summary

Display the preview report to the user and let them review before proceeding to seeding.

Update checkpoint to mark preview complete.

### 7. Prompt for Database Seeding

After preview is displayed, ask the user:

```
Template validated successfully!

Files generated:
- TypeScript: frontend/src/templates/{form-name}.ts
- JSON: frontend/src/templates/_generated/{form-name}.json

Would you like to seed this template to the database now?
This will make it available for creating form instances.
```

**If user says yes:**
- Run `/seed-form-template {form-name}`
- Report template ID and API endpoint

**If user says no:**
- Inform user they can seed later with `/seed-form-template {form-name}`
- Clean up checkpoint file
- Report success

### 8. Run Seed Phase (if requested)

Invoke the seed skill:
```
/seed-form-template {form-name}
```

**Expected output:**
- Template record in database
- Section records in database
- Field records in database
- Autofill mapping records in database

Update checkpoint to mark seed complete, then clean up checkpoint file.

## Checkpoint Format

```markdown
# Pipeline Checkpoint: i-765

## Status
- Phase: validate
- Iteration: 2
- Started: 2025-01-15T10:30:00Z
- Last Updated: 2025-01-15T10:45:00Z

## Completed Phases
- [x] analyze - 2025-01-15T10:32:00Z
- [x] generate - 2025-01-15T10:38:00Z
- [x] validate - 2025-01-15T10:42:00Z (failed - 3 issues)
- [x] refine (iteration 1) - 2025-01-15T10:45:00Z

## Validation Issues (Current)
1. Missing field mapping for Part2_Line1a
2. Section "Additional Information" has no fields
3. Type mismatch on dateOfBirth field

## Files Generated
- Analysis: docs/forms/i-765/analysis.md
- Template: frontend/src/templates/i-765.ts
```

## Error Handling

| Error Scenario | Recovery Action |
|----------------|-----------------|
| Analyze phase fails | Report error, preserve partial output, suggest manual review |
| Generate phase fails | Report error with analysis data location for manual generation |
| Validate phase fails | Proceed to refinement (not an error, expected path) |
| Refine phase fails | Continue validation loop, report issues after max iterations |
| Max iterations reached | Report partial success with remaining issues for manual fix |
| Sub-agent timeout | Update checkpoint, allow resume on next invocation |

### Unrecoverable Errors

If a critical error occurs:
1. Preserve checkpoint with error state
2. Log error details in checkpoint
3. Report to user with:
   - Last successful phase
   - Error description
   - Suggested manual intervention

## Example Invocation

**Command:**
```
/pdf-form-pipeline backend/assets/forms/i-765.pdf
```

**Expected Console Output:**
```
Starting PDF Form Pipeline for: i-765.pdf

[1/5] Analyzing PDF form...
      ✓ Found 47 form fields
      ✓ Identified 6 sections
      ✓ Analysis saved to docs/forms/i-765/analysis.md

[2/5] Generating template...
      ✓ Created template with 6 sections, 47 fields
      ✓ TypeScript saved to frontend/src/templates/i-765.ts
      ✓ JSON saved to frontend/src/templates/_generated/i-765.json

[3/5] Validating template...
      ✗ Found 2 issues:
        - Missing field: Part3_Line2b
        - Invalid conditional logic in section 4

[4/5] Refining template (iteration 1)...
      ✓ Fixed missing field Part3_Line2b
      ✓ Corrected conditional logic

      Re-validating...
      ✓ Validation passed

Template validated successfully!
Would you like to seed this template to the database now? (yes/no)
> yes

[5/5] Seeding to database...
      ✓ Template created: 550e8400-e29b-41d4-a716-446655440000
      ✓ 6 sections created
      ✓ 47 fields created
      ✓ 18 autofill mappings created

Pipeline Complete!
─────────────────────────────────────────
Template: frontend/src/templates/i-765.ts
JSON: frontend/src/templates/_generated/i-765.json
Analysis: docs/forms/i-765/analysis.md
Database ID: 550e8400-e29b-41d4-a716-446655440000
API: GET /api/form-templates/550e8400-e29b-41d4-a716-446655440000
Status: SUCCESS (1 refinement iteration, seeded to database)
```

## Important Notes

### Sub-Agent Isolation

Each skill runs on a **fresh sub-agent** with clean context. This ensures:
- No context pollution between phases
- Clear separation of concerns
- Predictable behavior for each phase
- Ability to parallelize future enhancements

### Checkpoint Persistence

The checkpoint file enables:
- Resume after interruption or failure
- Audit trail of pipeline execution
- Debugging information for failed runs

### Idempotency

Re-running the pipeline on the same form will:
1. Check for existing checkpoint
2. If checkpoint exists with completed phases, skip those phases
3. Resume from the last incomplete phase
4. To force full re-run, delete the checkpoint file first

---

## Error Recovery Guide

### Phase-by-Phase Recovery

#### Analyze Phase Failure

**Symptoms:**
- "PDF cannot be read" or "No form fields found"
- Checkpoint shows analyze phase incomplete

**Recovery:**
1. Check PDF file exists and is fillable: `ls -la {pdf-path}`
2. Verify PDF has form fields (open in Adobe Reader)
3. Re-download from USCIS if needed
4. Delete checkpoint and retry: `rm .claude/checkpoints/{form}-pipeline.md`

**Manual intervention:**
- If PDF is scanned/non-fillable, manual field extraction is needed
- Create analysis JSON manually based on visual inspection

#### Generate Phase Failure

**Symptoms:**
- "Analysis JSON not found" or "Invalid analysis format"
- Checkpoint shows analyze complete but generate incomplete

**Recovery:**
1. Verify analysis JSON exists: `cat frontend/src/templates/_analysis/{form}.json`
2. Validate JSON structure: Check for formInfo, structure.sections
3. If corrupted, delete checkpoint and re-run analyze phase

**Manual intervention:**
- Edit analysis JSON to fix structural issues
- Resume pipeline - it will skip analyze and start at generate

#### Validate Phase Failure

**Symptoms:**
- Validation returns critical errors
- Checkpoint shows validate phase with issues

**Recovery:**
1. Review validation issues in checkpoint or console output
2. Pipeline will automatically proceed to refinement (this is expected)
3. If issues persist after 3 refinement iterations, manual editing is needed

**Manual intervention:**
- Edit template file directly to fix complex issues
- Re-run validation: `/validate-form-template {form}`

#### Refine Phase Failure

**Symptoms:**
- Same issues persist after multiple iterations
- Max iterations (3) reached with remaining issues

**Recovery:**
1. Review remaining issues in checkpoint
2. Edit template manually for complex cases
3. Resume pipeline - it will skip refine and proceed to preview

**Manual intervention:**
- Open `frontend/src/templates/{form}.ts`
- Fix specific fields mentioned in validation issues
- Re-run validation to verify fixes

#### Preview Phase Failure

**Symptoms:**
- Preview skill fails to load template or analysis JSON

**Recovery:**
1. Verify both files exist:
   - `frontend/src/templates/_generated/{form}.json`
   - `frontend/src/templates/_analysis/{form}.json`
2. Re-run preview: `/preview-pdf-mapping {form}`

#### Seed Phase Failure

**Symptoms:**
- Database connection error
- Duplicate template error
- Partial insert (some records created)

**Recovery:**
1. Check database connection: `cd backend && npm run db:studio`
2. For duplicates, choose to skip/replace/new-revision when prompted
3. For partial inserts, run cleanup SQL (see seed-form-template skill)

**Manual intervention:**
- Use Drizzle Studio to inspect/remove partial records
- Re-run seed: `/seed-form-template {form}`

### Manual Intervention Points

At any point, you can:

1. **Edit checkpoint to skip phases:**
   ```markdown
   ## Completed Phases
   - [x] analyze - 2025-01-15T10:32:00Z
   - [x] generate - 2025-01-15T10:38:00Z  # Add this to skip
   ```

2. **Force re-run of a phase:**
   - Remove the phase from "Completed Phases" in checkpoint
   - Resume pipeline

3. **Abandon pipeline and start fresh:**
   ```bash
   rm .claude/checkpoints/{form}-pipeline.md
   rm frontend/src/templates/{form}.ts
   rm frontend/src/templates/_generated/{form}.json
   rm frontend/src/templates/_analysis/{form}.json
   ```

4. **Skip directly to seeding:**
   - If template exists and is valid, run `/seed-form-template {form}` directly

### Recovery Decision Tree

```
Pipeline failed at which phase?
│
├─ analyze
│   └─ Is PDF fillable?
│       ├─ Yes → Delete checkpoint, retry
│       └─ No → Manual field extraction needed
│
├─ generate
│   └─ Does analysis JSON exist?
│       ├─ Yes → Check JSON validity, retry
│       └─ No → Re-run analyze phase
│
├─ validate
│   └─ Are issues fixable by refinement?
│       ├─ Yes → Let pipeline continue to refine
│       └─ No → Manual template editing
│
├─ refine (max iterations)
│   └─ Review remaining issues
│       ├─ Simple fixes → Edit template, re-validate
│       └─ Complex issues → Manual template rewrite
│
├─ preview
│   └─ Files exist?
│       ├─ Yes → Re-run preview skill
│       └─ No → Re-run earlier phases
│
└─ seed
    └─ Database issue type?
        ├─ Connection → Check backend server
        ├─ Duplicate → Choose skip/replace/revision
        └─ Partial → Cleanup and retry
```

---

## Standardized Paths

Use `getFormPaths()` from config.ts for consistent file locations:

```typescript
import { getFormPaths, LIMITS } from '../pdf-form-utils/config';

const paths = getFormPaths(formId);

// All pipeline files:
paths.analysisJson        // frontend/src/templates/_analysis/{form}.json
paths.template            // frontend/src/templates/{form}.ts
paths.generatedJson       // frontend/src/templates/_generated/{form}.json
paths.validationJson      // frontend/src/templates/_analysis/{form}-validation.json
paths.checkpoint          // .claude/checkpoints/{form}-pipeline.md
paths.processingCheckpoint // frontend/src/templates/_analysis/processing-{form}.md

// Configuration:
LIMITS.maxRefinementIterations  // 3
LIMITS.maxFieldsPerStep         // 20
```
