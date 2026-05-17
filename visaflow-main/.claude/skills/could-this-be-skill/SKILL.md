---
name: could-this-be-skill
description: Automatically evaluate completed work for reusable patterns. Claude should consider this after implementing significant functionality.
---

# Skill Extraction Evaluator

After completing significant work, automatically evaluate whether patterns should become reusable skills.

## When to Evaluate

Trigger this evaluation after:
- Implementing a new feature with multiple steps
- Creating a new component pattern
- Setting up integrations (API hooks, form patterns, etc.)
- Building something that follows a repeatable structure

Do NOT evaluate after:
- Simple bug fixes
- Single-line changes
- Configuration tweaks
- One-off scripts

## Skill Candidate Criteria

A pattern is a GOOD skill candidate when ALL of these apply:

| Criterion | Question to Ask |
|-----------|----------------|
| **Repeatability** | Will this likely be built 3+ times in this project? |
| **Complexity** | Does it have enough steps to benefit from a template? (not just 1-2 lines) |
| **Stability** | Is the pattern unlikely to change significantly? |
| **Teachability** | Can it be explained with clear examples and instructions? |

A pattern is NOT a skill candidate when:
- Too specific to one feature (e.g., "UserProfileHeader component")
- Trivial (a single function call or import)
- Highly variable (approach changes significantly each time)
- Already covered by an existing skill

## Evaluation Process

1. **Identify**: What reusable work was just completed?
2. **Check**: Does a skill already cover this? (see `frontend/.claude/skills/`)
3. **Score**: Rate against the 4 criteria above
4. **Report**: If warranted, describe the opportunity to the user

## Output Format (Report Only)

When a skill opportunity is identified, report:

**Skill Opportunity Detected**

- **Suggested name**: `<skill-name>`
- **Description**: When to use this skill (one sentence)
- **Pattern captured**: What this skill would template
- **Key elements to include**:
  - [List of code patterns/examples]
  - [Reference files]
- **Why it qualifies**: Which criteria it meets

Then ask: "Would you like me to create this skill?"

## Reference

Existing skills to use as structural templates:
- `frontend/.claude/skills/simple-forms/SKILL.md`
- `frontend/.claude/skills/api-hook/SKILL.md`
- `frontend/.claude/skills/multi-step-forms/SKILL.md`
