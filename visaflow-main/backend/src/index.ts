import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import authRoutes from './routes/auth.js';
import organizationsRoutes from './routes/organizations.js';
import usersRoutes from './routes/users.js';
import clientsRoutes from './routes/clients.js';
import documentsRoutes from './routes/documents.js';
import clientFieldValuesRoutes from './routes/clientFieldValues.js';
import jobsRoutes from './routes/jobs.js';
import adminRoutes from './routes/admin.js';
import adminFormTemplatesRoutes from './routes/adminFormTemplates.js';
import formTemplatesRoutes from './routes/formTemplates.js';
import formInstancesRoutes from './routes/formInstances.js';
import { setQbBaseUrl, getQbBaseUrl } from './lib/queuebear.js';

// Create app with chained routes for type inference
const app = new Hono()
  // Middleware
  .use('*', logger())
  .use('*', cors({
    origin: (origin) => {
      // Allow any localhost port in development for worktree support
      if (origin?.startsWith('http://localhost:')) {
        return origin;
      }
      // Fallback to known origins
      return 'http://localhost:5173';
    },
    credentials: true,
  }))
  // Health check
  .get('/', (c) => c.text('Hello VisaFlow'))
  .get('/health', (c) => c.json({ status: 'ok' }))
  // Internal endpoint for tunnel script to update QB_BASE_URL at runtime
  .post('/_internal/set-qb-base-url', async (c) => {
    // Only allow from localhost
    const host = c.req.header('host') || '';
    if (!host.startsWith('localhost:') && !host.startsWith('127.0.0.1:')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const body = await c.req.json<{ url: string }>();
    if (!body.url) {
      return c.json({ error: 'Missing url in request body' }, 400);
    }
    setQbBaseUrl(body.url);
    return c.json({ success: true, qbBaseUrl: body.url });
  })
  .get('/_internal/qb-base-url', (c) => {
    const host = c.req.header('host') || '';
    if (!host.startsWith('localhost:') && !host.startsWith('127.0.0.1:')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    return c.json({ qbBaseUrl: getQbBaseUrl() });
  })
  // API routes
  .route('/api/auth', authRoutes)
  .route('/api/organizations', organizationsRoutes)
  .route('/api/users', usersRoutes)
  .route('/api/clients', clientsRoutes)
  .route('/api/documents', documentsRoutes)
  .route('/api/client-field-values', clientFieldValuesRoutes)
  .route('/api/jobs', jobsRoutes)
  .route('/api/admin', adminRoutes)
  .route('/api/admin/form-templates', adminFormTemplatesRoutes)
  .route('/api/form-templates', formTemplatesRoutes)
  .route('/api/form-instances', formInstancesRoutes);

// Export type for frontend RPC client
export type AppType = typeof app;

// Start server
const port = parseInt(process.env.PORT || '3000');
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
