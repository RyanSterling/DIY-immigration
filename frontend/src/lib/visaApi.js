/**
 * Visa Dashboard API Functions
 * Generic API layer that supports any visa type via parameterized endpoints.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

/**
 * Fetch visa dashboard summary including progress stats and latest assessment
 * @param {string} token - Auth token
 * @param {string} visaType - Visa type code (e.g., 'k1', 'h1b')
 */
export async function fetchVisaDashboard(token, visaType) {
  const response = await fetch(`${WORKER_URL}/visa/${visaType}/dashboard`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch dashboard' }));
    throw new Error(error.error || 'Failed to fetch dashboard');
  }

  return response.json();
}

/**
 * Fetch document requirements with user's progress for a visa type
 * @param {string} token - Auth token
 * @param {string} visaType - Visa type code
 */
export async function fetchVisaDocuments(token, visaType) {
  const response = await fetch(`${WORKER_URL}/visa/${visaType}/documents`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch documents' }));
    throw new Error(error.error || 'Failed to fetch documents');
  }

  return response.json();
}

/**
 * Update progress for a specific document
 * @param {string} token - Auth token
 * @param {string} visaType - Visa type code
 * @param {string} documentId - Document ID
 * @param {Object} data - Progress data { status, notes }
 */
export async function updateDocumentProgress(token, visaType, documentId, { status, notes }) {
  const response = await fetch(`${WORKER_URL}/visa/${visaType}/documents/${documentId}/progress`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status, notes })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update progress' }));
    throw new Error(error.error || 'Failed to update progress');
  }

  return response.json();
}

/**
 * Fetch comments for a specific document
 * @param {string} token - Auth token
 * @param {string} visaType - Visa type code
 * @param {string} documentId - Document ID
 */
export async function fetchDocumentComments(token, visaType, documentId) {
  const response = await fetch(`${WORKER_URL}/visa/${visaType}/documents/${documentId}/comments`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch comments' }));
    throw new Error(error.error || 'Failed to fetch comments');
  }

  return response.json();
}

/**
 * Add a comment to a document
 * @param {string} token - Auth token
 * @param {string} visaType - Visa type code
 * @param {string} documentId - Document ID
 * @param {string} content - Comment content
 */
export async function addDocumentComment(token, visaType, documentId, content) {
  const response = await fetch(`${WORKER_URL}/visa/${visaType}/documents/${documentId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to add comment' }));
    throw new Error(error.error || 'Failed to add comment');
  }

  return response.json();
}

/**
 * Fetch user's preferences for a visa type (conditional document answers)
 * @param {string} token - Auth token
 * @param {string} visaType - Visa type code
 */
export async function fetchVisaPreferences(token, visaType) {
  const response = await fetch(`${WORKER_URL}/visa/${visaType}/preferences`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    // 404 means no preferences yet - return empty
    if (response.status === 404) {
      return { preferences: null };
    }
    const error = await response.json().catch(() => ({ error: 'Failed to fetch preferences' }));
    throw new Error(error.error || 'Failed to fetch preferences');
  }

  return response.json();
}

/**
 * Save user's preferences for a visa type
 * @param {string} token - Auth token
 * @param {string} visaType - Visa type code
 * @param {Object} preferences - Preferences object (varies by visa type)
 */
export async function saveVisaPreferences(token, visaType, preferences) {
  const response = await fetch(`${WORKER_URL}/visa/${visaType}/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(preferences)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to save preferences' }));
    throw new Error(error.error || 'Failed to save preferences');
  }

  return response.json();
}
