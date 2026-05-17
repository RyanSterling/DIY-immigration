// K-1 Dashboard API Functions

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';
const PDF_SERVICE_URL = import.meta.env.VITE_PDF_SERVICE_URL || 'http://localhost:3001';

/**
 * Fetch K-1 dashboard summary including progress stats and latest assessment
 */
export async function fetchK1Dashboard(token) {
  const response = await fetch(`${WORKER_URL}/k1/dashboard`, {
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
 * Fetch K-1 document requirements with user's progress
 */
export async function fetchK1Documents(token) {
  const response = await fetch(`${WORKER_URL}/k1/documents`, {
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
 */
export async function updateDocumentProgress(token, documentId, { status, notes }) {
  const response = await fetch(`${WORKER_URL}/k1/documents/${documentId}/progress`, {
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
 */
export async function fetchDocumentComments(token, documentId) {
  const response = await fetch(`${WORKER_URL}/k1/documents/${documentId}/comments`, {
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
 */
export async function addDocumentComment(token, documentId, content) {
  const response = await fetch(`${WORKER_URL}/k1/documents/${documentId}/comments`, {
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
 * Fetch user's K-1 preferences (conditional document answers)
 */
export async function fetchK1Preferences(token) {
  const response = await fetch(`${WORKER_URL}/k1/preferences`, {
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
 * Save user's K-1 preferences
 */
export async function saveK1Preferences(token, preferences) {
  const response = await fetch(`${WORKER_URL}/k1/preferences`, {
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

/**
 * Fetch saved form data (PDF form field values)
 */
export async function fetchFormData(token, formType) {
  const response = await fetch(`${WORKER_URL}/k1/form-data/${formType}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { formData: {}, lastPage: 1, updatedAt: null };
    }
    const error = await response.json().catch(() => ({ error: 'Failed to fetch form data' }));
    throw new Error(error.error || 'Failed to fetch form data');
  }

  return response.json();
}

/**
 * Save form data (PDF form field values)
 */
export async function saveFormData(token, formType, formData, lastPage = 1) {
  const response = await fetch(`${WORKER_URL}/k1/form-data/${formType}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ formData, lastPage })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to save form data' }));
    throw new Error(error.error || 'Failed to save form data');
  }

  return response.json();
}

/**
 * Fill a PDF form using the PDFtk microservice
 * Returns a Blob of the filled PDF
 */
export async function fillPdf(formType, formData) {
  const response = await fetch(`${PDF_SERVICE_URL}/fill-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ formType, formData })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fill PDF' }));
    throw new Error(error.error || 'Failed to fill PDF');
  }

  return response.blob();
}
