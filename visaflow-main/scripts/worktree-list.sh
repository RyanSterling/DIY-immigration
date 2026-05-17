#!/bin/bash

WORKTREE_DIR=".worktrees"
REGISTRY_FILE="$WORKTREE_DIR/.port-registry.json"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Git Worktrees ===${NC}"
echo ""

# Show git worktree list
echo -e "${YELLOW}Git Worktree Status:${NC}"
git worktree list
echo ""

# Show our tracked worktrees with ports
if [ -f "$REGISTRY_FILE" ]; then
    echo -e "${YELLOW}Port Assignments:${NC}"
    printf "%-25s %-25s %-10s %-10s %s\n" "Name" "Branch" "Frontend" "Backend" "Admin"
    printf "%-25s %-25s %-10s %-10s %s\n" "----" "------" "--------" "-------" "-----"

    # Parse registry and display each entry
    REGISTRY_CONTENT=$(cat "$REGISTRY_FILE")

    # Extract each worktree entry
    echo "$REGISTRY_CONTENT" | grep -o '"[^"]*": {"index": [0-9]*, "branch": "[^"]*", "frontend": [0-9]*, "backend": [0-9]*, "admin": [0-9]*}' | while read -r line; do
        name=$(echo "$line" | grep -o '^"[^"]*"' | sed 's/"//g')
        branch=$(echo "$line" | grep -o '"branch": "[^"]*"' | sed 's/"branch": "//;s/"$//')
        frontend=$(echo "$line" | grep -o '"frontend": [0-9]*' | grep -o '[0-9]*')
        backend=$(echo "$line" | grep -o '"backend": [0-9]*' | grep -o '[0-9]*')
        admin=$(echo "$line" | grep -o '"admin": [0-9]*' | grep -o '[0-9]*')
        printf "%-25s %-25s %-10s %-10s %s\n" "$name" "$branch" "$frontend" "$backend" "$admin"
    done
else
    echo -e "${YELLOW}No worktrees tracked in registry${NC}"
fi
