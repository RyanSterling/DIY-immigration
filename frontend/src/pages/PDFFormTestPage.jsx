import React from 'react';
import { useAuth } from '@clerk/react';
import PDFFormViewer from '../components/pdf/PDFFormViewer';

export default function PDFFormTestPage() {
  const { getToken, isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'Libre Baskerville, serif', color: '#1E3A5F' }}
            >
              PDF Form Viewer POC
            </h1>
            <p className="text-gray-600 mt-1">
              Testing client-side PDF viewing and form filling with PDF.js
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <span className="text-sm text-green-600">Signed in - progress will be saved</span>
            ) : (
              <span className="text-sm text-amber-600">Not signed in - progress won't be saved</span>
            )}
            <a
              href="/dashboard/k1"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <p className="text-blue-800 text-sm">
            <strong>POC Notes:</strong> This proof-of-concept tests browser-based PDF viewing and form filling.
            {isSignedIn
              ? ' Your progress is automatically saved to your account.'
              : ' Sign in to save your progress.'}
          </p>
        </div>
      </div>

      {/* PDF Viewer */}
      <main className="flex-1 flex flex-col">
        <PDFFormViewerWithAuth getToken={getToken} isSignedIn={isSignedIn} />
      </main>

      {/* Footer with technical notes */}
      <footer className="bg-white border-t px-6 py-4">
        <div className="max-w-7xl mx-auto text-sm text-gray-600">
          <details className="cursor-pointer">
            <summary className="font-medium">Technical Details</summary>
            <div className="mt-2 space-y-2 text-gray-500">
              <p>
                <strong>Library:</strong> PDF.js (Mozilla) - pdfjs-dist
              </p>
              <p>
                <strong>Form Fields:</strong> I-129F has 445 fields (289 text, 140 checkboxes, 16 dropdowns)
              </p>
              <p>
                <strong>Persistence:</strong> Form data is saved to your account as JSON.
                Export/Import buttons allow local backup.
              </p>
              <p>
                <strong>Limitations:</strong> PDF.js can view/fill forms but cannot save filled values back
                to the original PDF. Server-side tools (pdftk, qpdf) are needed for that.
              </p>
            </div>
          </details>
        </div>
      </footer>
    </div>
  );
}

// Wrapper component to handle async token fetching
function PDFFormViewerWithAuth({ getToken, isSignedIn }) {
  const [token, setToken] = React.useState(null);

  React.useEffect(() => {
    const fetchToken = async () => {
      if (isSignedIn) {
        try {
          const t = await getToken();
          setToken(t);
        } catch (err) {
          console.error('Error getting token:', err);
        }
      }
    };
    fetchToken();
  }, [isSignedIn, getToken]);

  return <PDFFormViewer token={token} />;
}
