import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateVisaAssessment, analyzeResponses } from './claude.js';
import { sendWebhook } from './webhook.js';
import { checkRateLimit } from './rateLimit.js';
import { authMiddleware } from './auth.js';
import { createClient } from '@supabase/supabase-js';

const app = new Hono();

// Enable CORS for all routes
app.use('/*', cors({
  origin: '*', // In production, restrict this to your domain
  allowMethods: ['POST', 'GET', 'PUT', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'x-bypass-key', 'Authorization'],
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'Immigration DIY API',
    version: '1.0.0'
  });
});

// Generate AI visa assessment
app.post('/generate-assessment', async (c) => {
  try {
    const body = await c.req.json();
    const { email, answers, freeText, visaResults } = body;

    // Validate required fields
    if (!email || !answers) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Check for rate limit bypass (for testing)
    const bypassKey = c.req.header('x-bypass-key');
    const validBypass = bypassKey && c.env.RATE_LIMIT_BYPASS_KEY && bypassKey === c.env.RATE_LIMIT_BYPASS_KEY;

    // Check rate limits (both email and IP)
    const clientIP = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const rateLimitResult = validBypass ? { allowed: true } : await checkRateLimit(c.env, email, clientIP);

    if (!rateLimitResult.allowed) {
      return c.json({
        error: rateLimitResult.reason,
        type: rateLimitResult.type
      }, 429);
    }

    // Generate AI assessment using Claude
    const aiResult = await generateVisaAssessment(c.env, {
      answers,
      freeText,
      visaResults
    });

    if (aiResult.error) {
      console.error('Claude API error:', aiResult.error);
      return c.json({
        recommendations: null,
        nextSteps: null,
        error: 'AI service unavailable'
      }, 200);
    }

    return c.json({
      recommendations: aiResult.recommendations,
      nextSteps: aiResult.nextSteps,
      additionalAdvice: aiResult.additionalAdvice
    });

  } catch (error) {
    console.error('Error in generate-assessment:', error);
    return c.json({ error: 'Internal server error', recommendations: null }, 200);
  }
});

// Send webhook to email provider
app.post('/webhook', async (c) => {
  try {
    const body = await c.req.json();
    const { email, topVisa, visaCount, utmSource, utmCampaign } = body;

    // Validate required fields
    if (!email) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Send to webhook
    const webhookResult = await sendWebhook(c.env, {
      email,
      topVisa,
      visaCount,
      utmSource,
      utmCampaign,
      timestamp: new Date().toISOString()
    });

    if (webhookResult.error) {
      console.error('Webhook error:', webhookResult.error);
      return c.json({ error: 'Webhook failed', success: false }, 200);
    }

    return c.json({ success: true });

  } catch (error) {
    console.error('Error in webhook:', error);
    return c.json({ error: 'Internal server error', success: false }, 200);
  }
});

// Analyze responses using AI (for admin dashboard)
app.post('/analyze-responses', async (c) => {
  try {
    const body = await c.req.json();
    const { question } = body;

    if (!question) {
      return c.json({ error: 'Question is required' }, 400);
    }

    // Initialize Supabase client
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Fetch all assessments from Supabase
    const { data: assessments, error } = await supabase
      .from('assessments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return c.json({ error: 'Failed to fetch assessments' }, 500);
    }

    // Analyze with Claude
    const result = await analyzeResponses(c.env, question, assessments);

    if (result.error) {
      return c.json({ error: result.error }, 500);
    }

    return c.json({ answer: result.answer });

  } catch (error) {
    console.error('Error in analyze-responses:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================

// Get user's assessment history
app.get('/my-assessments', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Find user by clerk_id and get their assessments
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.clerkId)
      .single();

    if (userError || !dbUser) {
      return c.json({ assessments: [] });
    }

    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select(`
        *,
        visa_eligibility_results (*)
      `)
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false });

    if (assessmentsError) {
      throw assessmentsError;
    }

    return c.json({ assessments: assessments || [] });

  } catch (error) {
    console.error('Error fetching assessments:', error);
    return c.json({ error: 'Failed to fetch assessments' }, 500);
  }
});

// Sync user from Clerk (called after sign up/sign in)
app.post('/sync-user', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Upsert user record
    const { data, error } = await supabase
      .from('users')
      .upsert({
        clerk_user_id: user.clerkId,
        email: user.email,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'clerk_user_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return c.json({ user: data });

  } catch (error) {
    console.error('Error syncing user:', error);
    return c.json({ error: 'Failed to sync user' }, 500);
  }
});

// ============================================
// K-1 DASHBOARD ROUTES
// ============================================

// Get K-1 dashboard summary (progress stats + latest assessment)
app.get('/k1/dashboard', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get user's internal ID
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.clerkId)
      .single();

    if (userError || !dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get latest K-1 assessment
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*, visa_eligibility_results(*)')
      .eq('user_id', dbUser.id)
      .not('k1_answers', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get K-1 visa type to count total documents
    const { data: visaType } = await supabase
      .from('visa_types')
      .select('id')
      .eq('code', 'k1')
      .single();

    // Count total K-1 documents
    const { count: totalDocs } = await supabase
      .from('document_requirements')
      .select('*', { count: 'exact', head: true })
      .eq('visa_type_id', visaType?.id);

    // Get user's progress stats
    const { data: progress } = await supabase
      .from('user_document_progress')
      .select('status')
      .eq('user_id', dbUser.id);

    const stats = {
      total: totalDocs || 16,
      completed: progress?.filter(p => p.status === 'completed').length || 0,
      in_progress: progress?.filter(p => p.status === 'in_progress').length || 0,
      not_applicable: progress?.filter(p => p.status === 'not_applicable').length || 0
    };
    stats.not_started = stats.total - stats.completed - stats.in_progress - stats.not_applicable;

    return c.json({
      assessment,
      stats,
      percentComplete: Math.round((stats.completed / stats.total) * 100)
    });

  } catch (error) {
    console.error('Error fetching K-1 dashboard:', error);
    return c.json({ error: 'Failed to fetch dashboard' }, 500);
  }
});

// Get K-1 document requirements with user's progress
app.get('/k1/documents', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get user's internal ID
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.clerkId)
      .single();

    if (userError || !dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get K-1 visa type ID
    const { data: visaType } = await supabase
      .from('visa_types')
      .select('id')
      .eq('code', 'k1')
      .single();

    if (!visaType) {
      return c.json({ error: 'K-1 visa type not found' }, 404);
    }

    // Get all K-1 document requirements
    const { data: documents, error: docsError } = await supabase
      .from('document_requirements')
      .select('*')
      .eq('visa_type_id', visaType.id)
      .order('sort_order');

    if (docsError) {
      throw docsError;
    }

    // Get user's progress for these documents
    const { data: progressRecords } = await supabase
      .from('user_document_progress')
      .select('*')
      .eq('user_id', dbUser.id);

    // Create a map of document_id -> progress
    const progressMap = {};
    progressRecords?.forEach(p => {
      progressMap[p.document_requirement_id] = p;
    });

    // Combine documents with progress
    const docsWithProgress = documents.map(doc => ({
      ...doc,
      progress: progressMap[doc.id] || { status: 'not_started', notes: null }
    }));

    return c.json({ documents: docsWithProgress });

  } catch (error) {
    console.error('Error fetching K-1 documents:', error);
    return c.json({ error: 'Failed to fetch documents' }, 500);
  }
});

// Update document progress
app.put('/k1/documents/:docId/progress', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');
    const docId = c.req.param('docId');
    const { status, notes } = await c.req.json();

    // Validate status
    const validStatuses = ['not_started', 'in_progress', 'completed', 'not_applicable'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get user's internal ID
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.clerkId)
      .single();

    if (userError || !dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Upsert progress record
    const { data, error } = await supabase
      .from('user_document_progress')
      .upsert({
        user_id: dbUser.id,
        document_requirement_id: docId,
        status,
        notes: notes || null,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,document_requirement_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return c.json({ progress: data });

  } catch (error) {
    console.error('Error updating document progress:', error);
    return c.json({ error: 'Failed to update progress' }, 500);
  }
});

// Get comments for a document
app.get('/k1/documents/:docId/comments', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');
    const docId = c.req.param('docId');

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get user's internal ID
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.clerkId)
      .single();

    if (userError || !dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get comments for this document
    const { data: comments, error } = await supabase
      .from('document_comments')
      .select('*')
      .eq('user_id', dbUser.id)
      .eq('document_requirement_id', docId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return c.json({ comments: comments || [] });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return c.json({ error: 'Failed to fetch comments' }, 500);
  }
});

// Add a comment to a document
app.post('/k1/documents/:docId/comments', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');
    const docId = c.req.param('docId');
    const { content } = await c.req.json();

    if (!content || !content.trim()) {
      return c.json({ error: 'Content is required' }, 400);
    }

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get user's internal ID
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.clerkId)
      .single();

    if (userError || !dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Insert comment
    const { data: comment, error } = await supabase
      .from('document_comments')
      .insert({
        user_id: dbUser.id,
        document_requirement_id: docId,
        content: content.trim()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return c.json({ comment });

  } catch (error) {
    console.error('Error adding comment:', error);
    return c.json({ error: 'Failed to add comment' }, 500);
  }
});

// Get user's K-1 preferences (conditional document answers)
app.get('/k1/preferences', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get preferences by clerk user ID
    const { data: preferences, error } = await supabase
      .from('user_k1_preferences')
      .select('*')
      .eq('user_id', user.clerkId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return c.json({ preferences });

  } catch (error) {
    console.error('Error fetching K-1 preferences:', error);
    return c.json({ error: 'Failed to fetch preferences' }, 500);
  }
});

// Save user's K-1 preferences
app.post('/k1/preferences', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');
    const { previously_married, spouse_deceased, onboarding_completed } = await c.req.json();

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Upsert preferences
    const { data: preferences, error } = await supabase
      .from('user_k1_preferences')
      .upsert({
        user_id: user.clerkId,
        previously_married: previously_married || false,
        spouse_deceased: spouse_deceased || false,
        onboarding_completed: onboarding_completed || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return c.json({ preferences });

  } catch (error) {
    console.error('Error saving K-1 preferences:', error);
    return c.json({ error: 'Failed to save preferences' }, 500);
  }
});

// ============================================
// GENERIC VISA DASHBOARD ROUTES
// Parameterized routes that work with any visa type
// ============================================

// Get visa dashboard summary (progress stats + latest assessment)
app.get('/visa/:visaType/dashboard', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');
    const visaType = c.req.param('visaType');

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get user's internal ID
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.clerkId)
      .single();

    if (userError || !dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get visa type record
    const { data: visaTypeRecord } = await supabase
      .from('visa_types')
      .select('id')
      .eq('code', visaType)
      .single();

    if (!visaTypeRecord) {
      return c.json({ error: `Unknown visa type: ${visaType}` }, 404);
    }

    // Get latest assessment for this visa type
    // For now, we check for visa-specific answer columns (k1_answers, h1b_answers, etc.)
    // This can be generalized later with a visa_type_code column
    const answersColumn = `${visaType}_answers`;
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*, visa_eligibility_results(*)')
      .eq('user_id', dbUser.id)
      .not(answersColumn, 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Count total documents for this visa type
    const { count: totalDocs } = await supabase
      .from('document_requirements')
      .select('*', { count: 'exact', head: true })
      .eq('visa_type_id', visaTypeRecord.id);

    // Get user's progress stats for documents of this visa type
    const { data: documents } = await supabase
      .from('document_requirements')
      .select('id')
      .eq('visa_type_id', visaTypeRecord.id);

    const docIds = documents?.map(d => d.id) || [];

    const { data: progress } = await supabase
      .from('user_document_progress')
      .select('status')
      .eq('user_id', dbUser.id)
      .in('document_requirement_id', docIds);

    const stats = {
      total: totalDocs || 0,
      completed: progress?.filter(p => p.status === 'completed').length || 0,
      in_progress: progress?.filter(p => p.status === 'in_progress').length || 0,
      not_applicable: progress?.filter(p => p.status === 'not_applicable').length || 0
    };
    stats.not_started = stats.total - stats.completed - stats.in_progress - stats.not_applicable;

    return c.json({
      assessment,
      stats,
      percentComplete: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    });

  } catch (error) {
    console.error(`Error fetching ${c.req.param('visaType')} dashboard:`, error);
    return c.json({ error: 'Failed to fetch dashboard' }, 500);
  }
});

// Get document requirements with user's progress for a visa type
app.get('/visa/:visaType/documents', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');
    const visaType = c.req.param('visaType');

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get user's internal ID
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.clerkId)
      .single();

    if (userError || !dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get visa type record
    const { data: visaTypeRecord } = await supabase
      .from('visa_types')
      .select('id')
      .eq('code', visaType)
      .single();

    if (!visaTypeRecord) {
      return c.json({ error: `Unknown visa type: ${visaType}` }, 404);
    }

    // Get all document requirements for this visa type
    const { data: documents, error: docsError } = await supabase
      .from('document_requirements')
      .select('*')
      .eq('visa_type_id', visaTypeRecord.id)
      .order('sort_order');

    if (docsError) {
      throw docsError;
    }

    // Get user's progress for these documents
    const { data: progressRecords } = await supabase
      .from('user_document_progress')
      .select('*')
      .eq('user_id', dbUser.id);

    // Create a map of document_id -> progress
    const progressMap = {};
    progressRecords?.forEach(p => {
      progressMap[p.document_requirement_id] = p;
    });

    // Combine documents with progress
    const docsWithProgress = documents.map(doc => ({
      ...doc,
      progress: progressMap[doc.id] || { status: 'not_started', notes: null }
    }));

    return c.json({ documents: docsWithProgress });

  } catch (error) {
    console.error(`Error fetching ${c.req.param('visaType')} documents:`, error);
    return c.json({ error: 'Failed to fetch documents' }, 500);
  }
});

// Update document progress (generic - works for any visa type)
app.put('/visa/:visaType/documents/:docId/progress', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');
    const docId = c.req.param('docId');
    const { status, notes } = await c.req.json();

    // Validate status
    const validStatuses = ['not_started', 'in_progress', 'completed', 'not_applicable'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get user's internal ID
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.clerkId)
      .single();

    if (userError || !dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Upsert progress record
    const { data, error } = await supabase
      .from('user_document_progress')
      .upsert({
        user_id: dbUser.id,
        document_requirement_id: docId,
        status,
        notes: notes || null,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,document_requirement_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return c.json({ progress: data });

  } catch (error) {
    console.error('Error updating document progress:', error);
    return c.json({ error: 'Failed to update progress' }, 500);
  }
});

// Get comments for a document (generic)
app.get('/visa/:visaType/documents/:docId/comments', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');
    const docId = c.req.param('docId');

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get user's internal ID
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.clerkId)
      .single();

    if (userError || !dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get comments for this document
    const { data: comments, error } = await supabase
      .from('document_comments')
      .select('*')
      .eq('user_id', dbUser.id)
      .eq('document_requirement_id', docId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return c.json({ comments: comments || [] });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return c.json({ error: 'Failed to fetch comments' }, 500);
  }
});

// Add a comment to a document (generic)
app.post('/visa/:visaType/documents/:docId/comments', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');
    const docId = c.req.param('docId');
    const { content } = await c.req.json();

    if (!content || !content.trim()) {
      return c.json({ error: 'Content is required' }, 400);
    }

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get user's internal ID
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.clerkId)
      .single();

    if (userError || !dbUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Insert comment
    const { data: comment, error } = await supabase
      .from('document_comments')
      .insert({
        user_id: dbUser.id,
        document_requirement_id: docId,
        content: content.trim()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return c.json({ comment });

  } catch (error) {
    console.error('Error adding comment:', error);
    return c.json({ error: 'Failed to add comment' }, 500);
  }
});

// Get user's preferences for a visa type (uses new user_visa_preferences table)
app.get('/visa/:visaType/preferences', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');
    const visaType = c.req.param('visaType');

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Get preferences from generic table
    const { data: preferences, error } = await supabase
      .from('user_visa_preferences')
      .select('*')
      .eq('user_id', user.clerkId)
      .eq('visa_type', visaType)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // If found in new table, return with preferences extracted
    if (preferences) {
      return c.json({
        preferences: {
          ...preferences.preferences,
          onboarding_completed: preferences.onboarding_completed
        }
      });
    }

    // Fallback to old K-1 table for backward compatibility
    if (visaType === 'k1') {
      const { data: k1Prefs } = await supabase
        .from('user_k1_preferences')
        .select('*')
        .eq('user_id', user.clerkId)
        .maybeSingle();

      if (k1Prefs) {
        return c.json({ preferences: k1Prefs });
      }
    }

    return c.json({ preferences: null });

  } catch (error) {
    console.error(`Error fetching ${c.req.param('visaType')} preferences:`, error);
    return c.json({ error: 'Failed to fetch preferences' }, 500);
  }
});

// Save user's preferences for a visa type (uses new user_visa_preferences table)
app.post('/visa/:visaType/preferences', authMiddleware({ required: true }), async (c) => {
  try {
    const user = c.get('user');
    const visaType = c.req.param('visaType');
    const body = await c.req.json();

    // Extract onboarding_completed from body, rest goes into preferences JSONB
    const { onboarding_completed, ...preferencesData } = body;

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // Upsert preferences into generic table
    const { data: preferences, error } = await supabase
      .from('user_visa_preferences')
      .upsert({
        user_id: user.clerkId,
        visa_type: visaType,
        preferences: preferencesData,
        onboarding_completed: onboarding_completed || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,visa_type'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Return in expected format
    return c.json({
      preferences: {
        ...preferences.preferences,
        onboarding_completed: preferences.onboarding_completed
      }
    });

  } catch (error) {
    console.error(`Error saving ${c.req.param('visaType')} preferences:`, error);
    return c.json({ error: 'Failed to save preferences' }, 500);
  }
});

export default app;
