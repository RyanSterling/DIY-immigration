---
name: worktree-merge
description: Merge worktree feature branch into development and clean up the worktree. Only works on feature/* branches.
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion
---

# Worktree Merge

Merges a completed feature branch into development and cleans up the worktree.

## When to Use

Invoke this skill when:
- User runs `/worktree-merge` from within a feature worktree
- User wants to complete a feature and merge it into development
- User is done with a feature branch and wants to clean up

## Process

1. **Safety check** - Verify on a `feature/*` branch
2. **Check for uncommitted changes** - Warn if dirty working tree
3. **Extract names** - Get feature branch name and worktree directory name
4. **Navigate to main repo** - Switch context from worktree to main repository
5. **Optional: Push feature branch** - Ask user if they want to push before merge
6. **Update development** - Checkout and pull latest development branch
7. **Merge feature** - Regular merge (not squash) into development
8. **Optional: Push development** - Ask user if they want to push merged development
9. **Delete remote branch** - Remove feature branch from remote
10. **Remove worktree** - Clean up worktree and port registry
11. **Report summary** - Show what was done

## Safety Check

Before proceeding, verify the current branch is a feature branch:

```bash
CURRENT_BRANCH=$(git branch --show-current)
if [[ ! $CURRENT_BRANCH =~ ^feature/ ]]; then
  echo "Error: This skill can only be used on feature/* branches."
  echo "Current branch: $CURRENT_BRANCH"
  echo "Use /new-feature to create a worktree first."
  exit 1
fi
```

## Uncommitted Changes Check

Check for uncommitted changes and warn the user:

```bash
if [ -n "$(git status --porcelain)" ]; then
  echo "Warning: You have uncommitted changes."
  git status --short
  echo ""
  echo "Consider using /worktree-commit to commit your changes first."
fi
```

If uncommitted changes are found:
- Display the changes
- Ask if user wants to proceed anyway or commit first
- If user chooses to proceed, changes will be lost when worktree is removed

## Instructions

When invoked:

1. **Run the safety check** to verify on a `feature/*` branch
   - Exit with error if not on a feature branch

2. **Check for uncommitted changes**
   - If changes exist, warn user and suggest `/worktree-commit`
   - Ask if they want to proceed or commit first

3. **Extract branch and worktree names**:
   ```bash
   FEATURE_BRANCH=$(git branch --show-current)
   # Convert feature/my-feature to feature-my-feature
   WORKTREE_NAME=$(echo "$FEATURE_BRANCH" | sed 's|/|-|g')
   ```

4. **Find and navigate to the main repository**:
   ```bash
   # Get the main repo path from worktree list
   MAIN_REPO=$(git worktree list | grep -v "\.worktrees" | head -1 | awk '{print $1}')
   cd "$MAIN_REPO"
   ```

5. **Ask about pushing the feature branch**:
   - "Do you want to push the feature branch before merging? (y/n)"
   - If yes: `git push origin $FEATURE_BRANCH`

6. **Checkout development and pull latest**:
   ```bash
   git checkout development
   git pull origin development
   ```

7. **Merge the feature branch** (regular merge, not squash):
   ```bash
   git merge $FEATURE_BRANCH
   ```
   - If merge conflicts occur, stop and inform user (see Conflict Handling)

8. **Ask about pushing development**:
   - "Merge successful. Do you want to push development to remote? (y/n)"
   - If yes: `git push origin development`

9. **Delete the remote feature branch**:
   ```bash
   git push origin --delete $FEATURE_BRANCH
   ```

10. **Remove the worktree**:
    ```bash
    ./scripts/worktree-remove.sh $WORKTREE_NAME
    ```

11. **Report summary**:
    ```
    Feature merge complete:
    - Branch merged: feature/your-feature-name
    - Merged into: development
    - Remote branch deleted: Yes
    - Worktree removed: feature-your-feature-name
    - Port registry cleaned up
    ```

## Conflict Handling

If merge conflicts occur during the merge step:

1. **Stop the process** and inform the user:
   ```
   Merge conflict detected!

   Conflicting files:
   - path/to/file1.ts
   - path/to/file2.ts

   Please resolve the conflicts manually:
   1. Edit the conflicting files to resolve conflicts
   2. Stage the resolved files: git add <files>
   3. Complete the merge: git commit
   4. Then run /worktree-merge again to continue cleanup
   ```

2. **Do not proceed** with the remaining steps
3. Let the user resolve conflicts and re-run the skill

## Example Invocation

**User:** `/worktree-merge`

**Claude:**
1. Checks branch: `feature/document-preview-modal`
2. Checks for uncommitted changes: None found
3. Asks: "Do you want to push the feature branch before merging? (y/n)"
4. User: "y"
5. Pushes feature branch
6. Switches to main repo, checks out development, pulls latest
7. Merges `feature/document-preview-modal` into development
8. Asks: "Merge successful. Do you want to push development to remote? (y/n)"
9. User: "y"
10. Pushes development
11. Deletes remote branch `feature/document-preview-modal`
12. Removes worktree: `./scripts/worktree-remove.sh feature-document-preview-modal`
13. Reports:
    ```
    Feature merge complete:
    - Branch merged: feature/document-preview-modal
    - Merged into: development
    - Remote branch deleted: Yes
    - Worktree removed: feature-document-preview-modal
    - Port registry cleaned up

    You are now on the development branch in the main repository.
    ```

## Notes

- This skill only works on `feature/*` branches for safety
- The worktree directory name uses hyphens instead of slashes (e.g., `feature/my-feature` becomes `feature-my-feature`)
- The `worktree-remove.sh` script handles port registry cleanup automatically
- Use regular merge (not squash) to preserve commit history
- Always delete the remote feature branch after successful merge to keep the repository clean
- If you need to abort mid-process, the worktree will still exist and can be cleaned up manually
