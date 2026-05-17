#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKTREE_DIR=".worktrees"
REGISTRY_FILE="$WORKTREE_DIR/.port-registry.json"
BASE_FRONTEND_PORT=5173
BASE_BACKEND_PORT=3000
BASE_ADMIN_PORT=5174
PORT_STEP=100

# Parse arguments
BRANCH_NAME=""
START_SERVERS=false
OPEN_BROWSER=false

print_usage() {
    echo "Usage: $0 <branch-name> [options]"
    echo ""
    echo "Options:"
    echo "  --start     Start dev servers after creation"
    echo "  --open      Open browser after starting servers (implies --start)"
    echo "  --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 feature/user-auth           # Create worktree only"
    echo "  $0 feature/user-auth --start   # Create and start servers"
    echo "  $0 feature/user-auth --open    # Create, start, and open browser"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --start)
            START_SERVERS=true
            shift
            ;;
        --open)
            OPEN_BROWSER=true
            START_SERVERS=true
            shift
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
            if [ -z "$BRANCH_NAME" ]; then
                BRANCH_NAME="$1"
            else
                echo -e "${RED}Too many arguments${NC}"
                print_usage
                exit 1
            fi
            shift
            ;;
    esac
done

if [ -z "$BRANCH_NAME" ]; then
    echo -e "${RED}Error: Branch name is required${NC}"
    print_usage
    exit 1
fi

# Sanitize branch name for directory (replace / with -)
DIR_NAME="${BRANCH_NAME//\//-}"
WORKTREE_PATH="$WORKTREE_DIR/$DIR_NAME"

echo -e "${BLUE}=== Creating Git Worktree ===${NC}"
echo -e "Branch: ${GREEN}$BRANCH_NAME${NC}"
echo -e "Path: ${GREEN}$WORKTREE_PATH${NC}"

# Ensure .worktrees directory exists
mkdir -p "$WORKTREE_DIR"

# Initialize port registry if needed
if [ ! -f "$REGISTRY_FILE" ]; then
    echo '{"worktrees": {}, "nextIndex": 1}' > "$REGISTRY_FILE"
fi

# Check if worktree already exists
if [ -d "$WORKTREE_PATH" ]; then
    echo -e "${RED}Error: Worktree already exists at $WORKTREE_PATH${NC}"
    echo -e "Use ${YELLOW}./scripts/worktree-start.sh $DIR_NAME${NC} to start it"
    exit 1
fi

# Get next available index from registry using portable parsing
NEXT_INDEX=$(grep -o '"nextIndex":[0-9]*' "$REGISTRY_FILE" | grep -o '[0-9]*')
if [ -z "$NEXT_INDEX" ]; then
    NEXT_INDEX=1
fi

# Calculate ports
FRONTEND_PORT=$((BASE_FRONTEND_PORT + NEXT_INDEX * PORT_STEP))
BACKEND_PORT=$((BASE_BACKEND_PORT + NEXT_INDEX * PORT_STEP))
ADMIN_PORT=$((BASE_ADMIN_PORT + NEXT_INDEX * PORT_STEP))

echo -e "${YELLOW}Assigned ports:${NC}"
echo -e "  Frontend: ${GREEN}$FRONTEND_PORT${NC}"
echo -e "  Backend:  ${GREEN}$BACKEND_PORT${NC}"
echo -e "  Admin:    ${GREEN}$ADMIN_PORT${NC}"

# Create the worktree
echo -e "\n${BLUE}Creating git worktree...${NC}"

# Check if branch exists
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    # Branch exists, check it out
    git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
else
    # Branch doesn't exist, create it
    echo -e "${YELLOW}Branch doesn't exist, creating new branch...${NC}"
    git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH"
fi

# Update port registry - create new registry content
NEW_ENTRY="\"$DIR_NAME\": {\"index\": $NEXT_INDEX, \"branch\": \"$BRANCH_NAME\", \"frontend\": $FRONTEND_PORT, \"backend\": $BACKEND_PORT, \"admin\": $ADMIN_PORT}"
NEW_NEXT_INDEX=$((NEXT_INDEX + 1))

# Read current worktrees section and add new entry
if grep -q '"worktrees": {}' "$REGISTRY_FILE"; then
    # Empty worktrees, add first entry
    echo "{\"worktrees\": {$NEW_ENTRY}, \"nextIndex\": $NEW_NEXT_INDEX}" > "$REGISTRY_FILE"
else
    # Has existing entries, add to them
    sed -i "s/\"worktrees\": {/\"worktrees\": {$NEW_ENTRY, /" "$REGISTRY_FILE"
    sed -i "s/\"nextIndex\": $NEXT_INDEX/\"nextIndex\": $NEW_NEXT_INDEX/" "$REGISTRY_FILE"
fi

# Generate .env.local files
echo -e "\n${BLUE}Generating .env.local files...${NC}"

# Frontend .env.local
cat > "$WORKTREE_PATH/frontend/.env.local" << EOF
VITE_API_URL=http://localhost:$BACKEND_PORT/api
VITE_DEV_BRANCH=$BRANCH_NAME
VITE_DEV_PORT=$FRONTEND_PORT
EOF

# Copy other env vars from example if they exist
if [ -f "$WORKTREE_PATH/frontend/.env.example" ]; then
    grep -v "VITE_API_URL" "$WORKTREE_PATH/frontend/.env.example" >> "$WORKTREE_PATH/frontend/.env.local" 2>/dev/null || true
fi

# Backend .env.local - start with worktree-specific vars
cat > "$WORKTREE_PATH/backend/.env.local" << EOF
PORT=$BACKEND_PORT
DEV_BRANCH=$BRANCH_NAME
EOF

# Copy other env vars from main backend .env if it exists
if [ -f "backend/.env" ]; then
    grep -v "^PORT=" "backend/.env" >> "$WORKTREE_PATH/backend/.env.local" 2>/dev/null || true
fi

# Admin .env.local
cat > "$WORKTREE_PATH/admin/.env.local" << EOF
VITE_API_URL=http://localhost:$BACKEND_PORT/api
VITE_DEV_BRANCH=$BRANCH_NAME
VITE_DEV_PORT=$ADMIN_PORT
EOF

# Copy other env vars from example if they exist
if [ -f "$WORKTREE_PATH/admin/.env.example" ]; then
    grep -v "VITE_API_URL" "$WORKTREE_PATH/admin/.env.example" >> "$WORKTREE_PATH/admin/.env.local" 2>/dev/null || true
fi

echo -e "${GREEN}Environment files created${NC}"

# Install dependencies
echo -e "\n${BLUE}Installing dependencies...${NC}"
cd "$WORKTREE_PATH"
npm install

echo -e "\n${GREEN}=== Worktree created successfully! ===${NC}"
echo -e "Path: ${BLUE}$WORKTREE_PATH${NC}"
echo -e "Ports: Frontend=$FRONTEND_PORT, Backend=$BACKEND_PORT, Admin=$ADMIN_PORT"
echo -e "\nTo start servers, run:"
echo -e "  ${YELLOW}./scripts/worktree-start.sh $DIR_NAME${NC}"
echo -e "Or:"
echo -e "  ${YELLOW}npm run worktree:start $DIR_NAME${NC}"

# Start servers if requested
if [ "$START_SERVERS" = true ]; then
    echo -e "\n${BLUE}Starting dev servers...${NC}"
    cd - > /dev/null
    if [ "$OPEN_BROWSER" = true ]; then
        ./scripts/worktree-start.sh "$DIR_NAME" --open
    else
        ./scripts/worktree-start.sh "$DIR_NAME"
    fi
fi
