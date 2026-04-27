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
│   │   ├── lib/           # Utilities (supabase, api, scoring, stripeApi)
│   │   ├── data/          # Questions, visa types, countries
│   │   └── pages/         # Static pages + VisaPricingPage
│   └── public/
├── worker/             # Cloudflare Worker backend
│   └── src/
│       ├── index.js       # Hono API routes
│       ├── stripe.js      # Stripe payment integration
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

**Worker** (wrangler secrets for production):
```bash
wrangler secret put CLAUDE_API_KEY
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put N8N_WEBHOOK_URL  # optional
```

**Worker** (local development - `.dev.vars`):
```
CLERK_SECRET_KEY=sk_test_xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Database Setup

1. Create a new Supabase project
2. Run migrations in SQL Editor (in order):
   - `supabase/migrations/001_initial_schema.sql` - Core tables
   - `supabase/migrations/002_k1_and_users.sql` - K-1 visa type + users table
   - `supabase/migrations/003_k1_dashboard.sql` - Document progress tracking
   - `supabase/migrations/004_document_comments.sql` - Document comments/notes
   - `supabase/migrations/007_purchases.sql` - Stripe purchase tracking
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
| `/my-purchases` | GET | User's completed purchases |
| `/purchases/:visaType` | GET | Check if user purchased visa |
| `/stripe/create-checkout` | POST | Create Stripe checkout session |
| `/visa/:visaType/dashboard` | GET | Visa dashboard (purchase required) |
| `/visa/:visaType/documents` | GET | Visa documents (purchase required) |
| `/k1/dashboard` | GET | K-1 dashboard summary |
| `/k1/documents` | GET | K-1 documents with progress |
| `/k1/documents/:id/progress` | PUT | Update document status |
| `/k1/documents/:id/comments` | GET | Fetch document comments |
| `/k1/documents/:id/comments` | POST | Add document comment |

### Stripe Webhook (signature verified)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stripe/webhook` | POST | Handle Stripe events |

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

### Phase 4: Stripe Payments ✅
- Stripe Checkout integration
- Per-visa-type pricing (K-1: $400)
- Purchase gating on dashboards
- Webhook handling for payment confirmation
- Success/cancel redirect flows

---

## Stripe Payment Integration

### User Flow
```
[Free Quiz] → [Results] → [Create Account] → [Account Page]
                                                   ↓
                                    [Assessment History + "Get Started $400"]
                                                   ↓
                                    [Pricing Page: /visa/k1/pricing]
                                                   ↓
                                    [Stripe Checkout]
                                                   ↓
                                    [Redirect back → Dashboard unlocked]
```

### Pricing Configuration
Pricing is defined in two places (keep in sync):
- **Frontend**: `frontend/src/data/visaTypes.js` → `pricing` field
- **Backend**: `worker/src/stripe.js` → `VISA_PRICING` object

```js
// Example: K-1 pricing
k1: {
  amountCents: 40000,  // $400
  name: 'K-1 Fiancé Visa DIY Guide',
  description: 'Complete step-by-step K-1 visa application guidance'
}
```

### Key Files
| File | Purpose |
|------|---------|
| `worker/src/stripe.js` | Stripe client, checkout session creation, pricing |
| `frontend/src/lib/stripeApi.js` | Frontend API calls for Stripe |
| `frontend/src/pages/VisaPricingPage.jsx` | Pricing page with checkout button |
| `frontend/src/pages/VisaDashboard.jsx` | Dashboard with purchase gate |
| `frontend/src/pages/AccountPage.jsx` | Shows purchases + CTAs |
| `supabase/migrations/007_purchases.sql` | Purchases table schema |

### Local Development with Stripe
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:8787/stripe/webhook`
4. Copy webhook secret to `worker/.dev.vars` as `STRIPE_WEBHOOK_SECRET`
5. Add test secret key to `worker/.dev.vars` as `STRIPE_SECRET_KEY`

### Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

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
- Stripe: Use test mode keys for development, webhook forwarding required locally
- Dashboard access is gated by purchase - redirects to pricing page if not purchased
