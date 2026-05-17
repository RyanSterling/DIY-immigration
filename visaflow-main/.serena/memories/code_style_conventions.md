# VisaFlow Code Style & Conventions

## TypeScript
- ESM modules (`"type": "module"`)
- TypeScript strict mode
- Zod for runtime validation
- Named exports preferred

## Backend Style
- Hono for REST API
- Drizzle ORM for database
- BullMQ for job queues
- Middleware pattern for auth/cache/roles

## Frontend Style
- React with TypeScript
- React Query for server state
- React Hook Form for forms
- Tailwind CSS (utility-first)
- Component-based architecture

## Naming Conventions
- camelCase for variables/functions
- PascalCase for components/types
- kebab-case for file names
- UPPER_CASE for constants

## UI Philosophy
- Build working features quickly
- Get core functionality working first
- Desktop only for MVP
- No excessive validation blocking
