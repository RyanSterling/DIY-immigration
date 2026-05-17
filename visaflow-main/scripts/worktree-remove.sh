#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WORKTREE_DIR=".worktrees"
REGISTRY_FILE="$WORKTREE_DIR/.port-registry.json"

print_usage() {
    echo "Usage: $0 <worktree-name> [options]"
    echo ""
    echo "Options:"
    echo "  --force     Force remove even if there are uncommitted changes"
    echo "  --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 feature-user-auth         # Remove worktree (fails if dirty)"
    echo "  $0 feature-user-auth --force # Force remove"
}

WORKTREE_NAME=""
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --help)
            print_usage
            exit 0
            ;;
        *)
            WORKTREE_NAME="$1"
            shift
            ;;
    esac
done

if [ -z "$WORKTREE_NAME" ]; then
    echo -e "${RED}Error: Worktree name is required${NC}"
    print_usage
    exit 1
fi

WORKTREE_PATH="$WORKTREE_DIR/$WORKTREE_NAME"

if [ ! -d "$WORKTREE_PATH" ]; then
    echo -e "${RED}Error: Worktree not found at $WORKTREE_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}=== Removing Git Worktree ===${NC}"
echo -e "Worktree: ${YELLOW}$WORKTREE_NAME${NC}"
echo -e "Path: ${YELLOW}$WORKTREE_PATH${NC}"

# Check for uncommitted changes
cd "$WORKTREE_PATH"
if [ -n "$(git status --porcelain)" ]; then
    if [ "$FORCE" = false ]; then
        echo -e "${RED}Error: Worktree has uncommitted changes${NC}"
        echo "Use --force to remove anyway"
        git status --short
        exit 1
    else
        echo -e "${YELLOW}Warning: Forcing removal with uncommitted changes${NC}"
    fi
fi
cd - > /dev/null

# Remove git worktree
echo -e "${BLUE}Removing git worktree...${NC}"
if [ "$FORCE" = true ]; then
    git worktree remove "$WORKTREE_PATH" --force
else
    git worktree remove "$WORKTREE_PATH"
fi

# Update registry - remove entry
if [ -f "$REGISTRY_FILE" ]; then
    echo -e "${BLUE}Updating port registry...${NC}"

    # Create a temporary file
    TMP_FILE=$(mktemp)

    # Remove the worktree entry - handle both "entry, " and ", entry" patterns
    cat "$REGISTRY_FILE" | \
        sed "s/\"$WORKTREE_NAME\": {[^}]*}, //" | \
        sed "s/, \"$WORKTREE_NAME\": {[^}]*}//" | \
        sed "s/\"$WORKTREE_NAME\": {[^}]*}//" > "$TMP_FILE"

    mv "$TMP_FILE" "$REGISTRY_FILE"
fi

echo -e "${GREEN}Worktree removed successfully${NC}"
