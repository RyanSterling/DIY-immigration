#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WORKTREE_DIR=".worktrees"
REGISTRY_FILE="$WORKTREE_DIR/.port-registry.json"
OPEN_BROWSER=false

print_usage() {
    echo "Usage: $0 <worktree-name> [options]"
    echo ""
    echo "Options:"
    echo "  --open      Open browser after starting servers"
    echo "  --list      List available worktrees"
    echo "  --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 feature-user-auth        # Start worktree servers"
    echo "  $0 feature-user-auth --open # Start and open browser"
    echo "  $0 --list                   # List all worktrees"
}

# Parse arguments
WORKTREE_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --open)
            OPEN_BROWSER=true
            shift
            ;;
        --list)
            echo -e "${BLUE}Available worktrees:${NC}"
            if [ -f "$REGISTRY_FILE" ]; then
                # Extract worktree names from registry
                grep -o '"[^"]*": {"index"' "$REGISTRY_FILE" 2>/dev/null | sed 's/": {"index"//g' | sed 's/"//g' | while read -r name; do
                    echo "  - $name"
                done
            else
                echo "  (none)"
            fi
            exit 0
            ;;
        --help)
            print_usage
            exit 0
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
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

# Verify worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    echo -e "${RED}Error: Worktree not found at $WORKTREE_PATH${NC}"
    echo -e "Available worktrees:"
    ls -1 "$WORKTREE_DIR" 2>/dev/null | grep -v "\.port-registry" || echo "  (none)"
    exit 1
fi

# Read port configuration from registry
if [ ! -f "$REGISTRY_FILE" ]; then
    echo -e "${RED}Error: Port registry not found${NC}"
    exit 1
fi

# Extract ports using grep (portable)
REGISTRY_CONTENT=$(cat "$REGISTRY_FILE")

# Find the entry for this worktree
WORKTREE_ENTRY=$(echo "$REGISTRY_CONTENT" | grep -o "\"$WORKTREE_NAME\": {[^}]*}" || true)

if [ -z "$WORKTREE_ENTRY" ]; then
    echo -e "${RED}Error: Could not find port configuration for $WORKTREE_NAME${NC}"
    exit 1
fi

# Extract individual values
FRONTEND_PORT=$(echo "$WORKTREE_ENTRY" | grep -o '"frontend": [0-9]*' | grep -o '[0-9]*')
BACKEND_PORT=$(echo "$WORKTREE_ENTRY" | grep -o '"backend": [0-9]*' | grep -o '[0-9]*')
ADMIN_PORT=$(echo "$WORKTREE_ENTRY" | grep -o '"admin": [0-9]*' | grep -o '[0-9]*')
BRANCH=$(echo "$WORKTREE_ENTRY" | grep -o '"branch": "[^"]*"' | sed 's/"branch": "//;s/"$//')

if [ -z "$FRONTEND_PORT" ] || [ -z "$BACKEND_PORT" ]; then
    echo -e "${RED}Error: Could not read port configuration for $WORKTREE_NAME${NC}"
    exit 1
fi

echo -e "${BLUE}=== Starting Worktree Servers ===${NC}"
echo -e "Worktree: ${GREEN}$WORKTREE_NAME${NC}"
echo -e "Branch:   ${GREEN}$BRANCH${NC}"
echo -e "Path:     ${GREEN}$WORKTREE_PATH${NC}"
echo -e ""
echo -e "${YELLOW}Ports:${NC}"
echo -e "  Frontend: http://localhost:$FRONTEND_PORT"
echo -e "  Backend:  http://localhost:$BACKEND_PORT"
echo -e "  Admin:    http://localhost:$ADMIN_PORT"
echo -e ""

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx not found. Please ensure Node.js is installed.${NC}"
    exit 1
fi

# Open browser after a delay (in background)
if [ "$OPEN_BROWSER" = true ]; then
    (
        sleep 5  # Wait for servers to start
        # Cross-platform browser open
        if command -v start &> /dev/null; then
            # Windows (Git Bash)
            start "http://localhost:$FRONTEND_PORT"
        elif command -v xdg-open &> /dev/null; then
            # Linux
            xdg-open "http://localhost:$FRONTEND_PORT"
        elif command -v open &> /dev/null; then
            # macOS
            open "http://localhost:$FRONTEND_PORT"
        fi
    ) &
fi

# Navigate to worktree and start servers with concurrently
cd "$WORKTREE_PATH"

# Use concurrently with colored output
npx concurrently \
    --names "frontend,backend,admin" \
    --prefix-colors "cyan,yellow,magenta" \
    --kill-others-on-fail \
    "npm run dev -w frontend" \
    "npm run dev -w backend" \
    "npm run dev -w admin"
