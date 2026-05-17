# VisaFlow Project Overview

## Purpose
A multi-tenant web application for managing PDF immigration forms. The system:
- Maps PDF form fields to user-friendly HTML interfaces
- Breaks large forms into logical sections
- Extracts data from uploaded documents using AWS Textract for autofill
- Provides interactive PDF editing with bidirectional sync

## Tech Stack

### Frontend
- React 19 with Vite and TypeScript
- React Query for state management
- Tailwind CSS for styling
- React Hook Form for form management
- react-pdf.dev SDK for PDF viewing/editing

### Backend
- Hono API (REST) with TypeScript
- Drizzle ORM with PostgreSQL
- Supabase for database and storage
- BullMQ with ioredis for job queues
- AWS Textract for document processing

### Database
- PostgreSQL via Supabase with Row Level Security (RLS)
- Drizzle Kit for migrations

### Infrastructure
- Vercel (Frontend) + Render (Backend)
- Supabase Storage or AWS S3 for files
- Redis for job queues

## Project Structure
```
visaflow/
├── backend/
│   └── src/
│       ├── config/       # Configuration (canonical fields)
│       ├── db/           # Database schema, seed
│       ├── jobs/         # BullMQ job handlers
│       ├── lib/          # Utilities (env, redis, supabase)
│       ├── middleware/   # Auth, cache, role middleware
│       └── routes/       # API route handlers
├── frontend/
│   └── src/
│       ├── components/   # UI components
│       ├── hooks/        # Custom hooks
│       ├── layouts/      # Page layouts
│       ├── lib/          # API client, utils
│       ├── pages/        # Page components
│       ├── providers/    # Context providers
│       └── routes/       # Route definitions
├── supabase/             # Supabase config
└── sandboxing/           # Experiments
```
