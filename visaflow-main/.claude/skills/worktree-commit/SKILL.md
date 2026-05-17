---
name: worktree-commit
description: Commit changes in a worktree feature branch. Only works on feature/* branches.
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion
---

# Worktree Commit

Commits changes while working in a git worktree feature branch with safety checks and optional push.

## When to Use

Invoke this skill when:
- User runs `/worktree-commit` or `/worktree-commit <message>`
- User wants to commit changes in their current feature worktree
- User asks to save/commit their work on a feature branch

## Process

1. **Safety check** - Verify on a `feature/*` branch
2. **Show status** - Display current git status
3. **Get commit message** - From arguments or prompt user
4. **Stage changes** - Run `git add .`
5. **Create commit** - With Co-Authored-By line
6. **Ask about push** - Prompt user before pushing
7. **Push if confirmed** - Push with upstream tracking

## Safety Check

This skill only works on `feature/*` branches. Run this check first:

```bash
CURRENT_BRANCH=$(git branch --show-current)
if [[ ! $CURRENT_BRANCH =~ ^feature/ ]]; then
  echo "Error: This skill can only be used on feature/* branches."
  echo "Current branch: $CURRENT_BRANCH"
  echo "Use /new-feature to create a worktree first."
  exit 1
fi
```

## Instructions

When invoked:

1. **Run the safety check** to ensure you're on a `feature/*` branch:
   ```bash
   CURRENT_BRANCH=$(git branch --show-current)
   if [[ ! $CURRENT_BRANCH =~ ^feature/ ]]; then
     echo "Error: This skill can only be used on feature/* branches."
     echo "Current branch: $CURRENT_BRANCH"
     echo "Use /new-feature to create a worktree first."
     exit 1
   fi
   echo "On branch: $CURRENT_BRANCH"
   ```

2. **Show git status** to see what changes exist:
   ```bash
   git status
   ```

3. **Check if there are changes to commit**:
   - If no changes (working tree clean), inform the user and exit
   - "No changes to commit. Working tree is clean."

4. **Get the commit message**:
   - If `$ARGUMENTS` is provided, use it as the commit message
   - If no arguments, ask the user: "What's your commit message?"

5. **Stage all changes**:
   ```bash
   git add .
   ```

6. **Create the commit** using HEREDOC for proper formatting:
   ```bash
   git commit -m "$(cat <<'EOF'
   <commit message here>

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```

7. **Ask before pushing**:
   - "Would you like to push this commit to the remote? (yes/no)"

8. **If user confirms push**, push with upstream tracking:
   ```bash
   git push -u origin <branch-name>
   ```

9. **Report success**:
   - Show the commit hash
   - Show the branch name
   - If pushed, confirm push was successful

## Example Invocation

**User:** `/worktree-commit Add user profile validation`

**Claude:**
1. Runs safety check - confirms on `feature/user-profile`
2. Shows git status:
   ```
   Changes not staged for commit:
     modified:   src/components/UserProfile.tsx
     modified:   src/utils/validation.ts
   ```
3. Stages all changes with `git add .`
4. Creates commit:
   ```
   [feature/user-profile abc1234] Add user profile validation

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   ```
5. Asks: "Would you like to push this commit to the remote?"
6. If yes, runs: `git push -u origin feature/user-profile`
7. Reports: "Commit pushed successfully to origin/feature/user-profile"

**User:** `/worktree-commit` (no message provided)

**Claude:**
1. Runs safety check
2. Shows git status
3. Asks: "What's your commit message?"
4. User provides message
5. Continues with staging, commit, and push flow

## Notes

- This skill will refuse to run on non-feature branches (main, development, etc.)
- Always use `git add .` to stage all changes - the user can review via git status first
- The Co-Authored-By line credits Claude for collaborative work
- Push uses `-u` flag to set upstream tracking on first push
- If the branch already has upstream tracking, subsequent pushes work normally
