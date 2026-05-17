#!/bin/bash

WORKTREE_DIR=".worktrees"
REGISTRY_FILE="$WORKTREE_DIR/.port-registry.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Pruning Stale Worktrees ===${NC}"

# Prune git worktrees that no longer exist
echo -e "${YELLOW}Running git worktree prune...${NC}"
git worktree prune -v

# Check for orphaned entries in our registry
if [ -f "$REGISTRY_FILE" ]; then
    echo -e "\n${YELLOW}Checking for orphaned registry entries...${NC}"

    REGISTRY_CONTENT=$(cat "$REGISTRY_FILE")

    # Extract worktree names and check if directories exist
    echo "$REGISTRY_CONTENT" | grep -o '"[^"]*": {"index"' | sed 's/": {"index"//g' | sed 's/"//g' | while read -r name; do
        if [ ! -d "$WORKTREE_DIR/$name" ]; then
            echo -e "  ${RED}Orphaned: $name${NC} - removing from registry"

            # Create a temporary file
            TMP_FILE=$(mktemp)

            # Remove the orphaned entry
            cat "$REGISTRY_FILE" | \
                sed "s/\"$name\": {[^}]*}, //" | \
                sed "s/, \"$name\": {[^}]*}//" | \
                sed "s/\"$name\": {[^}]*}//" > "$TMP_FILE"

            mv "$TMP_FILE" "$REGISTRY_FILE"
        else
            echo -e "  ${GREEN}OK: $name${NC}"
        fi
    done
else
    echo -e "${YELLOW}No registry file found${NC}"
fi

echo -e "\n${GREEN}Prune complete${NC}"
