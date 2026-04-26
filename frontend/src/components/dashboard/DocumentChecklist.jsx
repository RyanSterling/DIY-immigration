/**
 * DocumentChecklist Component
 * Displays grouped list of K-1 document requirements with expandable guidance
 */

import { useState } from 'react';
import { useAuth } from '@clerk/react';
import DocumentDetail from './DocumentDetail';
import { updateDocumentProgress } from '../../lib/k1Api';
import { K1_GUIDANCE, DOCUMENT_CATEGORIES } from '../../data/k1Guidance';

export default function DocumentChecklist({ documents, onUpdate }) {
  const [expandedDoc, setExpandedDoc] = useState(null);
  const { getToken } = useAuth();

  const handleStatusChange = async (docId, newStatus) => {
    try {
      const token = await getToken();
      await updateDocumentProgress(token, docId, { status: newStatus });
      onUpdate();
    } catch (error) {
      console.error('Error updating document progress:', error);
    }
  };

  // Group documents by category
  const groupedDocs = DOCUMENT_CATEGORIES.map(cat => ({
    ...cat,
    documents: documents.filter(d => d.category === cat.id)
  })).filter(group => group.documents.length > 0);

  // Calculate progress for each category
  const getCategoryProgress = (docs) => {
    const completed = docs.filter(d => d.progress?.status === 'completed').length;
    const total = docs.filter(d => d.progress?.status !== 'not_applicable').length;
    return { completed, total };
  };

  return (
    <div className="space-y-8">
      {groupedDocs.map(group => {
        const progress = getCategoryProgress(group.documents);

        return (
          <div key={group.id}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 style={{
                  fontFamily: 'Libre Baskerville, serif',
                  fontSize: '1.125rem',
                  color: '#1E1F1C',
                  marginBottom: '0.25rem'
                }}>
                  {group.label}
                </h3>
                <p style={{
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '0.8125rem',
                  color: '#77716E'
                }}>
                  {group.description}
                </p>
              </div>
              <span style={{
                fontFamily: 'Soehne, sans-serif',
                fontSize: '0.875rem',
                color: '#77716E'
              }}>
                {progress.completed} / {progress.total}
              </span>
            </div>

            <div className="space-y-2">
              {group.documents.map(doc => (
                <DocumentDetail
                  key={doc.id}
                  document={doc}
                  guidance={K1_GUIDANCE[doc.document_name]}
                  isExpanded={expandedDoc === doc.id}
                  onToggle={() => setExpandedDoc(
                    expandedDoc === doc.id ? null : doc.id
                  )}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
