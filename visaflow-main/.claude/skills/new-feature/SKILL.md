---
name: new-feature
description: Start a new feature by creating a git worktree with isolated dev servers. Use when beginning work on a new feature or capability.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# New Feature Kickoff

Creates a git worktree for isolated feature development with automatic server startup.

## When to Use

Invoke this skill when:
- User runs `/new-feature <description>`
- User confirms they want a worktree after `/go` detection

## Process

1. **Parse feature description** from arguments or prompt
2. **Generate branch name**:
   - Convert description to kebab-case
   - Prefix with `feature/`
   - Example: "user authentication" → `feature/user-authentication`
3. **Create worktree** with servers:
   ```bash
   ./scripts/worktree-create.sh feature/<branch-name> --open
   ```
4. **Report setup details**:
   - Worktree path
   - Assigned ports (frontend, backend, admin)
   - Browser URL
5. **Continue with implementation** - help the user build the feature

## Branch Name Generation

| Input | Output |
|-------|--------|
| "user authentication" | `feature/user-authentication` |
| "PDF document preview" | `feature/pdf-document-preview` |
| "email notifications for admins" | `feature/email-notifications-for-admins` |

Rules:
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters except hyphens
- Prefix with `feature/`

## Instructions

When invoked:

1. **Parse the feature description** from `$ARGUMENTS` or ask if not provided
2. **If description is vague**, ask for clarification:
   - "What specific functionality should this feature include?"
3. **Generate branch name** and confirm with user:
   - "I'll create branch `feature/your-feature-name`. Sound good?"
4. **Run the worktree creation script**:
   ```bash
   ./scripts/worktree-create.sh feature/<branch-name> --open
   ```
5. **Wait for script to complete** and capture the output
6. **Report the setup details**:
   - Worktree path (e.g., `.worktrees/feature-your-feature-name`)
   - Frontend port (e.g., `http://localhost:5273`)
   - Backend port (e.g., `http://localhost:3100`)
   - Admin port (e.g., `http://localhost:5274`)
7. **Ask what to implement first**:
   - "The worktree is ready and servers are starting. What would you like to implement first?"
8. **Continue with normal development workflow** in the new worktree context

## Example Invocation

**User:** `/new-feature document preview modal`

**Claude:**
1. Generates branch name: `feature/document-preview-modal`
2. Confirms: "I'll create `feature/document-preview-modal`. Creating worktree now..."
3. Runs: `./scripts/worktree-create.sh feature/document-preview-modal --open`
4. Reports:
   ```
   Worktree created:
   - Path: .worktrees/feature-document-preview-modal
   - Frontend: http://localhost:5273
   - Backend: http://localhost:3100
   - Admin: http://localhost:5274

   Browser opening to frontend...
   ```
5. Asks: "What would you like to implement first for the document preview modal?"

## Notes

- The script handles npm install automatically
- Servers start with `concurrently` (colored output per service)
- Browser opens after ~5 seconds when servers are ready
- The new worktree is completely isolated from main
