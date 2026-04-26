/**
 * Session Management
 * Generates and manages unique session IDs for tracking quiz starts/completions
 */

const SESSION_KEY = 'visa_quiz_session_id';

/**
 * Generate a unique session ID
 */
export function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get or create session ID
 */
export function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Clear session ID (after quiz completion)
 */
export function clearSessionId() {
  sessionStorage.removeItem(SESSION_KEY);
}
