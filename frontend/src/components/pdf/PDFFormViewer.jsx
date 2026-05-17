import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { fetchFormData, saveFormData } from '../../lib/k1Api';

// Set worker source from the installed package
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Load from local public folder (no CORS issues)
const PDF_URL = '/assets/forms/i-129f.pdf';
const FORM_TYPE = 'i-129f';
const AUTO_SAVE_DELAY = 3000; // 3 seconds after last change

export default function PDFFormViewer({ token }) {
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [fieldAnnotations, setFieldAnnotations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const canvasRef = useRef(null);
  const annotationLayerRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);
  const formDataRef = useRef(formData);
  const tokenRef = useRef(token);
  const currentPageRef = useRef(currentPage);

  // Keep refs in sync
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Load saved form data from backend
  useEffect(() => {
    const loadSavedData = async () => {
      if (!token) return;

      try {
        const result = await fetchFormData(token, FORM_TYPE);
        if (result.formData && Object.keys(result.formData).length > 0) {
          setFormData(result.formData);
          formDataRef.current = result.formData;
          if (result.lastPage) {
            setCurrentPage(result.lastPage);
          }
          if (result.updatedAt) {
            setLastSaved(new Date(result.updatedAt));
          }
        }
        setDataLoaded(true);
      } catch (err) {
        console.error('Error loading saved form data:', err);
        setDataLoaded(true);
      }
    };

    loadSavedData();
  }, [token]);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument({
          url: PDF_URL,
          enableXfa: true,
        });

        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(`Failed to load PDF: ${err.message}`);
        setLoading(false);
      }
    };

    loadPdf();
  }, []);

  // Render current page - NO formData dependency to avoid re-render on typing
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !dataLoaded) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        const annotations = await page.getAnnotations();
        const formFields = annotations.filter(
          (annot) => annot.subtype === 'Widget' && !annot.readOnly
        );

        setFieldAnnotations(formFields);
        renderAnnotationLayer(formFields, viewport);
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale, dataLoaded]); // Removed formData dependency

  // Save to backend - using refs to avoid stale closures
  const saveToBackend = useCallback(async () => {
    const currentToken = tokenRef.current;
    const currentFormData = formDataRef.current;
    const page = currentPageRef.current;

    if (!currentToken) {
      console.log('No token, skipping save');
      return;
    }

    if (Object.keys(currentFormData).length === 0) {
      console.log('No form data to save');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      console.log('Saving form data...', Object.keys(currentFormData).length, 'fields');
      await saveFormData(currentToken, FORM_TYPE, currentFormData, page);
      console.log('Save successful');
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error saving form data:', err);
      setSaveError(err.message);
      // Keep hasUnsavedChanges true so user knows save failed
    } finally {
      setSaving(false);
    }
  }, []);

  // Auto-save when form data changes
  useEffect(() => {
    if (!token || !dataLoaded) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Only mark as unsaved if we have data
    if (Object.keys(formData).length > 0) {
      setHasUnsavedChanges(true);

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveToBackend();
      }, AUTO_SAVE_DELAY);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, token, dataLoaded, saveToBackend]);

  // Manual save
  const handleSave = async () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    await saveToBackend();
  };

  // Render form field overlay - uses formDataRef to avoid needing formData as dependency
  const renderAnnotationLayer = (annotations, viewport) => {
    if (!annotationLayerRef.current) return;

    const layer = annotationLayerRef.current;
    layer.innerHTML = '';
    layer.style.width = `${viewport.width}px`;
    layer.style.height = `${viewport.height}px`;

    annotations.forEach((annotation) => {
      const rect = annotation.rect;
      if (!rect) return;

      const [x1, y1, x2, y2] = pdfjsLib.Util.normalizeRect(
        viewport.convertToViewportRectangle(rect)
      );

      const fieldName = annotation.fieldName || annotation.id;
      const fieldType = annotation.fieldType;
      // Use ref for initial value
      const currentValue = formDataRef.current[fieldName] || annotation.fieldValue || '';

      let element;

      if (fieldType === 'Tx') {
        element = document.createElement('input');
        element.type = 'text';
        element.value = currentValue;
        element.maxLength = annotation.maxLen || 100;
        element.placeholder = getFieldPlaceholder(fieldName);
        element.className = 'pdf-form-input';
        // Use input event for immediate feedback, change for final value
        element.addEventListener('blur', (e) => {
          handleFieldChange(fieldName, e.target.value);
        });
      } else if (fieldType === 'Btn') {
        if (annotation.checkBox) {
          element = document.createElement('input');
          element.type = 'checkbox';
          element.checked = currentValue === 'Yes' || currentValue === 'On' || currentValue === true;
          element.className = 'pdf-form-checkbox';
          element.addEventListener('change', (e) => {
            handleFieldChange(fieldName, e.target.checked ? 'Yes' : 'Off');
          });
        } else if (annotation.radioButton) {
          element = document.createElement('input');
          element.type = 'radio';
          element.name = annotation.fieldName;
          element.value = annotation.buttonValue || '';
          element.checked = currentValue === annotation.buttonValue;
          element.className = 'pdf-form-radio';
          element.addEventListener('change', (e) => {
            if (e.target.checked) {
              handleFieldChange(fieldName, annotation.buttonValue);
            }
          });
        }
      } else if (fieldType === 'Ch') {
        element = document.createElement('select');
        element.className = 'pdf-form-select';

        if (annotation.options) {
          annotation.options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.exportValue || opt.displayValue;
            option.textContent = opt.displayValue;
            if (currentValue === option.value) {
              option.selected = true;
            }
            element.appendChild(option);
          });
        }

        element.addEventListener('change', (e) => {
          handleFieldChange(fieldName, e.target.value);
        });
      }

      if (element) {
        element.style.position = 'absolute';
        element.style.left = `${x1}px`;
        element.style.top = `${y1}px`;
        element.style.width = `${x2 - x1}px`;
        element.style.height = `${y2 - y1}px`;
        element.dataset.fieldName = fieldName;
        element.title = fieldName;

        layer.appendChild(element);
      }
    });
  };

  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  }, []);

  const getFieldPlaceholder = (fieldName) => {
    const match = fieldName.match(/([A-Za-z]+)(?:\[|$)/);
    if (match) {
      return match[1].replace(/([A-Z])/g, ' $1').trim();
    }
    return '';
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));

  // Download as JSON backup
  const downloadFormData = () => {
    const dataStr = JSON.stringify(formData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'i-129f-form-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Load from JSON file
  const loadFormDataFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setFormData(data);
        formDataRef.current = data;
      } catch (err) {
        alert('Error loading form data: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Format last saved time
  const formatLastSaved = (date) => {
    if (!date) return null;
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading I-129F Form...</p>
          <p className="text-gray-400 text-sm mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-gray-100">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <div className="text-red-500 text-4xl mb-4">!</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Error Loading PDF</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Make sure the PDF exists at /public/assets/forms/i-129f.pdf
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Form I-129F</h2>
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Page Navigation */}
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
          >
            Prev
          </button>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
          >
            Next
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 ml-4 border-l pl-4">
            <button
              onClick={zoomOut}
              className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
            >
              -
            </button>
            <span className="text-sm text-gray-600 w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
            >
              +
            </button>
          </div>
        </div>

        {/* Save Controls */}
        <div className="flex items-center gap-3">
          {/* Save status */}
          <div className="text-sm text-gray-500">
            {saving ? (
              <span className="flex items-center gap-1">
                <span className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full"></span>
                Saving...
              </span>
            ) : saveError ? (
              <span className="text-red-600">Save failed</span>
            ) : hasUnsavedChanges ? (
              <span className="text-amber-600">Unsaved changes</span>
            ) : lastSaved ? (
              <span className="text-green-600">Saved {formatLastSaved(lastSaved)}</span>
            ) : null}
          </div>

          {/* Manual save button */}
          {token && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition"
            >
              Save
            </button>
          )}

          {/* Backup options */}
          <div className="flex items-center gap-1 border-l pl-3">
            <label className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded cursor-pointer transition">
              Import
              <input
                type="file"
                accept=".json"
                onChange={loadFormDataFromFile}
                className="hidden"
              />
            </label>
            <button
              onClick={downloadFormData}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Not signed in warning */}
      {!token && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          Sign in to save your progress automatically. Your work will be lost if you close this page.
        </div>
      )}

      {/* Save error banner */}
      {saveError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-800 text-sm">
          Failed to save: {saveError}. Try clicking Save again.
        </div>
      )}

      {/* PDF Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
        style={{ backgroundColor: '#525659' }}
      >
        <div className="flex justify-center">
          <div className="relative bg-white shadow-lg">
            <canvas ref={canvasRef} />
            <div
              ref={annotationLayerRef}
              className="absolute top-0 left-0 annotation-layer"
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-white border-t text-sm text-gray-600 flex justify-between">
        <span>
          {Object.keys(formData).length} fields filled |{' '}
          {fieldAnnotations.length} editable fields on this page
        </span>
        {lastSaved && (
          <span className="text-gray-400">
            Last saved: {lastSaved.toLocaleString()}
          </span>
        )}
      </div>

      {/* CSS for form fields */}
      <style>{`
        .annotation-layer {
          pointer-events: none;
        }
        .annotation-layer input,
        .annotation-layer select {
          pointer-events: auto;
        }
        .pdf-form-input {
          background: rgba(255, 255, 240, 0.95);
          border: 1px solid #ccc;
          padding: 1px 3px;
          font-size: 12px;
          font-family: Arial, sans-serif;
          box-sizing: border-box;
          line-height: 1.2;
        }
        .pdf-form-input:focus {
          background: #fff;
          border-color: #2563eb;
          outline: none;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }
        .pdf-form-checkbox,
        .pdf-form-radio {
          cursor: pointer;
          accent-color: #2563eb;
        }
        .pdf-form-select {
          background: rgba(255, 255, 240, 0.95);
          border: 1px solid #ccc;
          font-size: 11px;
          padding: 1px 2px;
          box-sizing: border-box;
        }
        .pdf-form-select:focus {
          background: #fff;
          border-color: #2563eb;
          outline: none;
        }
      `}</style>
    </div>
  );
}
