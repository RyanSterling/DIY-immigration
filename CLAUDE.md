# Immigration DIY - US Visa Assessment & Application Platform

A quiz-based visa eligibility assessment tool with DIY application guidance for tech-savvy users.

## Project Overview

This platform helps users:
1. **Assess Visa Eligibility** - Take a quiz to discover which US visa types they may qualify for
2. **Understand Options** - See estimated costs, processing times, and approval likelihood
3. **DIY Application** (Phase 3+) - Self-guided application process for eligible visa types

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Cloudflare Workers + Hono |
| Database | Supabase (PostgreSQL) |
| AI | Claude API (visa assessment) |
| Payments | Stripe (one-time purchases) |
| Storage | Supabase Storage (documents) |

## Project Structure

```
immigration-diy/
├── frontend/           # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── quiz/      # Quiz flow components
│   │   │   ├── dashboard/ # DIY dashboard (Phase 2+)
│   │   │   ├── admin/     # Admin dashboard
│   │   │   └── shared/    # Shared UI components
│   │   ├── lib/           # Utilities (supabase, api, scoring)
│   │   ├── data/          # Questions, visa types, countries
│   │   └── pages/         # Static pages
│   └── public/
├── worker/             # Cloudflare Worker backend
│   └── src/
│       ├── index.js       # Hono API routes
│       ├── claude.js      # AI integration
│       ├── rateLimit.js   # Rate limiting
│       └── webhook.js     # Email provider webhooks
└── supabase/
    └── migrations/        # Database schema
```

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

### Worker
```bash
cd worker
npm install
npm run dev
# Runs at http://localhost:8787
```

### Environment Variables

**Frontend** (.env):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_WORKER_URL=http://localhost:8787
```

**Worker** (wrangler secrets):
```bash
wrangler secret put CLAUDE_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put N8N_WEBHOOK_URL  # optional
```

## Database Setup

1. Create a new Supabase project
2. Run migrations in SQL Editor (in order):
   - `supabase/migrations/001_initial_schema.sql` - Core tables
   - `supabase/migrations/002_k1_and_users.sql` - K-1 visa type + users table
   - `supabase/migrations/003_k1_dashboard.sql` - Document progress tracking
   - `supabase/migrations/004_document_comments.sql` - Document comments/notes
3. Copy your project URL and anon key to frontend .env

**Note:** The quiz will show results even if database tables don't exist (graceful degradation).

## Quiz Products

This platform has **two separate quiz products**:

| Quiz | Route | Purpose | Documentation |
|------|-------|---------|---------------|
| **General Visa Quiz** | `/` | Work/investment/green card visas | Below |
| **K-1 Fiancé Quiz** | `/k1` | Family-based fiancé visa | [K1.md](K1.md) |

---

## General Visa Quiz

### Features
- ~14 questions with conditional branching
- Country selection, multi-select options
- Local eligibility scoring (no API required for basic results)
- AI-enhanced personalized recommendations (optional)

### Supported Visa Types
- H-1B (Specialty Occupation)
- L-1A/L-1B (Intracompany Transfer)
- O-1A (Extraordinary Ability)
- EB-1A (Green Card - Extraordinary Ability)
- EB-2 NIW (National Interest Waiver)
- E-2 (Treaty Investor)
- EB-5 (Investor Green Card)

### Key Files
- Questions: `frontend/src/data/questions.js`
- Scoring: `frontend/src/lib/scoring.js` → `calculateVisaEligibility()`
- Container: `frontend/src/components/quiz/QuizContainer.jsx`

### Scoring Logic
- Each visa type has specific eligibility criteria
- Points assigned for education, experience, achievements
- Threshold determines likelihood rating (high/medium/low)
- See `frontend/src/lib/scoring.js` for full logic

## API Endpoints

### Public
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/generate-assessment` | POST | AI visa recommendations |
| `/webhook` | POST | Email provider webhook |
| `/analyze-responses` | POST | Admin analytics AI |

### Protected (require auth)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sync-user` | POST | Sync Clerk user to database |
| `/my-assessments` | GET | User's assessment history |
| `/k1/dashboard` | GET | K-1 dashboard summary |
| `/k1/documents` | GET | K-1 documents with progress |
| `/k1/documents/:id/progress` | PUT | Update document status |
| `/k1/documents/:id/comments` | GET | Fetch document comments |
| `/k1/documents/:id/comments` | POST | Add document comment |

## Implementation Phases

### Phase 1: Quiz Foundation ✅
- Quiz flow with conditional branching
- Visa eligibility scoring
- Results display
- Email capture
- Rate limiting

### Phase 2: User Accounts & K-1 Dashboard ✅
- Clerk Auth integration
- User sync to Supabase
- K-1 DIY Dashboard with sidebar navigation
- Document progress tracking (Start → In Progress → Complete)
- Per-document comments/notes
- Phase-based organization with priority indicators
- Video support for instructional content

### Phase 3: DIY Application Wizard (Next)
- Multi-step application forms
- Document upload
- AI form guidance
- Form auto-fill from quiz answers

### Phase 4: Payments
- Stripe one-time purchases
- Per-visa-type pricing
- Purchase verification

## Design Decisions

### Colors
- Primary: `#1E3A5F` (navy blue - professional/trustworthy)
- Background: `#EFEDEC` (warm off-white)
- Text: `#1E1F1C` (near-black)
- Secondary: `#77716E` (warm gray)

### Fonts
- Headings: Libre Baskerville (serif)
- Body: Inter (sans-serif)

## Deployment

### Frontend (Netlify)
```bash
cd frontend
npm run build
# Deploy dist/ folder
```

### Worker (Cloudflare)
```bash
cd worker
npm run deploy
```

## Notes

- This is a separate project from `soft-regulation-funnel`
- Quiz framework adapted from existing nervous system quiz
- Rate limiting: 2 assessments per email per 24h
- AI content is optional - local scoring always works
