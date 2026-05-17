# VisaFlow Task Completion Checklist

## Before Committing

1. **Backend changes**
   - Ensure TypeScript compiles: `npm run build` in backend/
   - Database schema changes: Run `npm run db:generate` and `npm run db:push`

2. **Frontend changes**
   - Run linter: `npm run lint` in frontend/
   - Build check: `npm run build` in frontend/

## Testing
- No automated test suite in MVP (tests not configured)
- Manual testing recommended

## Code Review Considerations
- Check for security vulnerabilities (no command injection, XSS, SQL injection)
- Ensure RLS policies are respected
- Verify multi-tenancy isolation
