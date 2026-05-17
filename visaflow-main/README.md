# VisaFlow - PDF Form Management System

A multi-tenant web application for managing USCIS immigration forms with user-friendly HTML interfaces and bidirectional PDF editing.

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Git

### GraphicsMagick & Ghostscript (Required for PDF Processing)

The `pdf2pic` library requires both GraphicsMagick and Ghostscript for converting PDF pages to images.

**Why these tools?**
- **GraphicsMagick**: Converts PDF pages to PNG images for preview/thumbnail generation
- **Ghostscript**: PDF interpreter that GraphicsMagick uses internally for PDF parsing

**IMPORTANT**: Ghostscript version 9.52 is required. Versions 9.53+ have a known bug that causes errors with pdf2pic. See: https://github.com/yakovmeister/pdf2image/blob/HEAD/docs/gm-installation.md

#### Windows (via Chocolatey)
```powershell
# Install specific Ghostscript version (9.52 required - newer versions have bugs)
choco install ghostscript --version=9.52

# Install GraphicsMagick (latest version works)
choco install graphicsmagick
```

#### macOS (via Homebrew)
```bash
brew update
brew install gs graphicsmagick
```
Note: Homebrew may install a newer Ghostscript. If you encounter PDF conversion errors, you may need to manually install Ghostscript 9.52 from https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/tag/gs952

#### Linux (Debian/Ubuntu)
```bash
sudo apt-get update
sudo apt-get install ghostscript graphicsmagick
```
Note: Check your Ghostscript version with `gs --version`. If > 9.52 and experiencing issues, install 9.52 manually.

#### Verifying Installation
```bash
# Check GraphicsMagick
gm version

# Check Ghostscript (should show 9.52.x)
gs --version
```

## Quick Start

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts:

- PostgreSQL on port 5433
- Redis on port 6379

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run db:push
npm run dev
```

Backend runs on http://localhost:3000

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## Project Structure

```
visaflow/
├── backend/                 # Hono API server
│   ├── src/
│   │   ├── db/             # Drizzle schema and migrations
│   │   ├── lib/            # Utilities (redis, supabase, s3, textract)
│   │   ├── middleware/     # Auth, caching, role middleware
│   │   ├── routes/         # API route handlers
│   │   ├── jobs/           # Background workers (textract, email)
│   │   └── index.ts        # Main app entry
│   ├── drizzle/            # Generated migrations
│   └── assets/forms/       # PDF form templates
├── frontend/               # React organization admin app
│   └── src/
│       ├── atoms/          # Form input components
│       ├── components/     # UI components
│       ├── hooks/          # React Query hooks
│       ├── lib/            # API client, utilities
│       ├── pages/          # Route page components
│       └── providers/      # Auth, theme providers
├── admin/                  # React super admin app (port 5174)
│   └── src/                # Similar structure to frontend
├── shared/                 # Shared types and utilities
│   └── src/
│       └── types/          # Canonical fields, country data
├── scripts/                # Development utility scripts
├── .claude/                # Claude Code configuration
│   ├── skills/             # Custom skills (pdf-form-pipeline, etc.)
│   └── settings.local.json # Local Claude settings
├── docker-compose.yml      # Local Redis
└── package.json            # Workspace root
```

## Environment Variables

### Backend (.env)

```bash
# Server
PORT=3000

# Database (Supabase PostgreSQL)
DATABASE_URL=postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Redis (local via Docker)
REDIS_URL=redis://localhost:6379

# Supabase
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SECRET_KEY=eyJ...     # service_role key from Supabase dashboard
SUPABASE_PUBLISHABLE_KEY=eyJ... # anon key from Supabase dashboard

# AWS (for S3 storage and Textract)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# QueueBear (background job processing)
QB_API_KEY=...
QB_PROJECT_ID=...
QB_BASE_URL=https://api.queuebear.com
QB_SIGNING_SECRET=...

# Optional
DISABLE_CACHE=false          # Set to true to bypass Redis caching
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

### Admin (.env)

```bash
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

## API Routes

### Authentication
| Method | Path                      | Description            | Access         |
| ------ | ------------------------- | ---------------------- | -------------- |
| POST   | /api/auth/login           | Login                  | Public         |
| POST   | /api/auth/logout          | Logout                 | Authenticated  |
| POST   | /api/auth/refresh         | Refresh token          | Authenticated  |
| POST   | /api/auth/forgot-password | Request password reset | Public         |
| POST   | /api/auth/reset-password  | Reset password         | Public         |

### Organizations & Users
| Method | Path                      | Description            | Access         |
| ------ | ------------------------- | ---------------------- | -------------- |
| GET    | /api/organizations        | List organizations     | Super Admin    |
| POST   | /api/organizations        | Create organization    | Super Admin    |
| GET    | /api/organizations/:id    | Get organization       | Super Admin    |
| PATCH  | /api/organizations/:id    | Update organization    | Super Admin    |
| DELETE | /api/organizations/:id    | Soft delete            | Super Admin    |
| GET    | /api/users                | List users             | Scoped by role |
| POST   | /api/users                | Create user            | Admin          |
| GET    | /api/users/:id            | Get user               | Scoped by role |
| PATCH  | /api/users/:id            | Update user            | Self or Admin  |
| DELETE | /api/users/:id            | Soft delete            | Admin          |
| GET    | /api/users/me             | Get current user       | Authenticated  |

### Clients
| Method | Path                      | Description            | Access         |
| ------ | ------------------------- | ---------------------- | -------------- |
| GET    | /api/clients              | List clients           | Org Admin      |
| POST   | /api/clients              | Create client          | Org Admin      |
| GET    | /api/clients/:id          | Get client             | Org Admin      |
| PATCH  | /api/clients/:id          | Update client          | Org Admin      |
| DELETE | /api/clients/:id          | Soft delete            | Org Admin      |

### Documents
| Method | Path                              | Description                  | Access    |
| ------ | --------------------------------- | ---------------------------- | --------- |
| GET    | /api/documents                    | List documents for client    | Org Admin |
| POST   | /api/documents                    | Upload document              | Org Admin |
| GET    | /api/documents/:id                | Get document                 | Org Admin |
| DELETE | /api/documents/:id                | Delete document              | Org Admin |
| GET    | /api/documents/:id/download       | Download original file       | Org Admin |
| POST   | /api/documents/:id/reprocess      | Reprocess with Textract      | Org Admin |

### Client Field Values
| Method | Path                              | Description                  | Access    |
| ------ | --------------------------------- | ---------------------------- | --------- |
| GET    | /api/client-field-values          | Get extracted values         | Org Admin |
| PATCH  | /api/client-field-values/:id      | Update/select value          | Org Admin |

### Form Templates (Admin)
| Method | Path                              | Description                  | Access      |
| ------ | --------------------------------- | ---------------------------- | ----------- |
| GET    | /api/form-templates               | List templates               | Org Admin   |
| GET    | /api/admin/form-templates         | List all templates           | Super Admin |
| POST   | /api/admin/form-templates         | Create template              | Super Admin |
| GET    | /api/admin/form-templates/:id     | Get template with sections   | Super Admin |
| PATCH  | /api/admin/form-templates/:id     | Update template              | Super Admin |
| DELETE | /api/admin/form-templates/:id     | Delete template              | Super Admin |

### Form Instances
| Method | Path                              | Description                  | Access    |
| ------ | --------------------------------- | ---------------------------- | --------- |
| GET    | /api/form-instances               | List instances for client    | Org Admin |
| POST   | /api/form-instances               | Create new form instance     | Org Admin |
| GET    | /api/form-instances/:id           | Get instance with responses  | Org Admin |
| PATCH  | /api/form-instances/:id           | Update instance status       | Org Admin |
| DELETE | /api/form-instances/:id           | Delete instance              | Org Admin |
| POST   | /api/form-instances/:id/responses | Save form responses          | Org Admin |
| GET    | /api/form-instances/:id/pdf       | Generate/download PDF        | Org Admin |

## Available Scripts

### Backend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate migrations
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio
- `npm run db:seed` - Seed database

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Tech Stack

### Backend

- **Hono** - REST API framework
- **Drizzle ORM** - PostgreSQL database access
- **Supabase** - PostgreSQL hosting and file storage
- **Redis** - Response caching (via Docker locally)
- **QueueBear** - Background job processing (BullMQ-compatible)
- **pdf-lib** - PDF form field manipulation
- **pdf2pic** - PDF to image conversion for previews
- **Sharp** - Image processing and compression
- **AWS Textract** - Document OCR and data extraction

### Frontend

- **React 18** with Vite and TypeScript
- **React Router v6** - Client-side routing
- **TanStack Query** - Server state management
- **React Hook Form + Zod** - Form handling and validation
- **Tailwind CSS v4** - Styling
- **react-pdf** - PDF viewing in browser

### Shared

- **TypeScript** - Type safety across the monorepo
- **Zod** - Runtime validation schemas

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd visaflow
npm install
```

### 2. Set Up External Services

Before running the application, you need accounts for:

- **Supabase** - Create a project at https://supabase.com
  - Get your project URL, anon key, and service role key from Settings > API
  - Get your database connection string from Settings > Database
- **AWS** - Set up S3 bucket and IAM credentials for Textract
  - See `docs/aws-s3.md` for detailed AWS configuration
- **QueueBear** - Create account at https://queuebear.com for background jobs

### 3. Start Docker Services

```bash
docker-compose up -d
```

This starts Redis on port 6379.

### 4. Configure Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env

# Admin
cp admin/.env.example admin/.env
# Edit admin/.env
```

### 5. Run Database Migrations

```bash
cd backend
npm run db:push
```

### 6. Create Super Admin Account

```bash
cd backend
npm run db:seed
```

This creates a super admin user. Check the seed script for credentials.

### 7. Start Development Servers

From the root directory:

```bash
npm run dev
```

This starts all services concurrently:
- Backend API: http://localhost:3000
- Frontend (Org Admin): http://localhost:5173
- Admin (Super Admin): http://localhost:5174

## Development Workflow

### Running Services

From the workspace root, `npm run dev` starts all services concurrently using Turbo.

To run individual services:
```bash
npm run dev --workspace=backend
npm run dev --workspace=frontend
npm run dev --workspace=admin
```

### Git Worktrees for Feature Development

The project uses git worktrees for isolated feature development:

```bash
# Create a new feature worktree
git worktree add ../visaflow-feature-name feature/feature-name

# Work in the worktree
cd ../visaflow-feature-name
npm install
npm run dev

# Merge and clean up when done
git checkout development
git merge feature/feature-name
git worktree remove ../visaflow-feature-name
```

### Claude Code Skills

Custom Claude Code skills are available in `.claude/skills/`:

- `/pdf-form-pipeline` - Orchestrate PDF form template generation
- `/analyze-pdf-form` - Extract structure from USCIS PDF forms
- `/generate-form-template` - Generate TypeScript form templates
- `/validate-form-template` - Validate templates against PDFs
- `/seed-form-template` - Seed templates into database
- `/new-feature` - Create git worktree for new features
- `/worktree-commit` - Commit changes in feature branches
- `/worktree-merge` - Merge feature branches to development

### Database Management

```bash
cd backend

# Generate migration from schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema directly (development)
npm run db:push

# Open Drizzle Studio for database inspection
npm run db:studio
```

## License

ISC
