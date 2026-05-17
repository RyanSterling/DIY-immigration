# VisaFlow Development Commands

## Backend

```bash
# Run development server
cd backend && npm run dev

# Build for production
cd backend && npm run build

# Start production server
cd backend && npm start

# Database operations (Drizzle Kit)
cd backend && npm run db:generate    # Generate migrations
cd backend && npm run db:migrate     # Run migrations
cd backend && npm run db:push        # Push schema to database
cd backend && npm run db:studio      # Open Drizzle Studio
cd backend && npm run db:seed        # Seed database
```

## Frontend

```bash
# Run development server
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Lint code
cd frontend && npm run lint

# Preview production build
cd frontend && npm run preview
```

## Docker

```bash
# Start all services (Redis, etc.)
docker-compose up

# Stop services
docker-compose down

# Check running containers
docker ps
```

## System Utilities (Windows/Git Bash)

```bash
# Git commands work normally
git status
git diff
git add .
git commit -m "message"

# Directory navigation
ls          # List files
cd path     # Change directory
pwd         # Print working directory

# File operations
cat file    # View file contents
```
