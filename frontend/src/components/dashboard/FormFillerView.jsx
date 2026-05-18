/**
 * FormFillerView Component
 * Dashboard-integrated PDF form filler with matching styling
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { fetchFormData, saveFormData, fillPdf } from '../../lib/visaApi';
import { getFormGuidance } from '../../data/formGuidance';

// Set worker source from the installed package
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Mapping of fillable forms: document name → { formType, pdfFile, displayName, visaTypes }
// visaTypes array specifies which visa types can use this form
export const FILLABLE_FORMS = {
  // K-1 Fiancé Visa Forms
  'Form I-129F': {
    formType: 'i-129f',
    pdfFile: '/assets/forms/i-129f.pdf',
    displayName: 'Form I-129F',
    visaTypes: ['k1']
  },
  'Form I-134': {
    formType: 'i-134',
    pdfFile: '/assets/forms/i-134.pdf',
    displayName: 'Form I-134',
    visaTypes: ['k1', 'marriage']  // Used by both K-1 (interview) and marriage (if needed)
  },

  // Marriage-Based Green Card Forms
  'Form I-130': {
    formType: 'i-130',
    pdfFile: '/assets/forms/i-130.pdf',
    displayName: 'Form I-130',
    visaTypes: ['marriage']
  },
  'Form I-130A': {
    formType: 'i-130a',
    pdfFile: '/assets/forms/i-130a.pdf',
    displayName: 'Form I-130A',
    visaTypes: ['marriage']
  },
  'Form I-485': {
    formType: 'i-485',
    pdfFile: '/assets/forms/i-485.pdf',
    displayName: 'Form I-485',
    visaTypes: ['marriage']
  },
  'Form I-864': {
    formType: 'i-864',
    pdfFile: '/assets/forms/i-864.pdf',
    displayName: 'Form I-864',
    visaTypes: ['marriage']
  },
  'Form I-864A': {
    formType: 'i-864a',
    pdfFile: '/assets/forms/i-864a.pdf',
    displayName: 'Form I-864A',
    visaTypes: ['marriage']
  },
  'Form G-325A': {
    formType: 'g-325a',
    pdfFile: '/assets/forms/g-325a.pdf',
    displayName: 'Form G-325A',
    visaTypes: ['marriage']
  },
  'Form I-765': {
    formType: 'i-765',
    pdfFile: '/assets/forms/i-765.pdf',
    displayName: 'Form I-765',
    visaTypes: ['marriage']
  },
  'Form I-131': {
    formType: 'i-131',
    pdfFile: '/assets/forms/i-131.pdf',
    displayName: 'Form I-131',
    visaTypes: ['marriage']
  }
};

const AUTO_SAVE_DELAY = 3000;

export default function FormFillerView({ getToken, onBack, formType = 'i-129f', formName = 'Form I-129F', visaType = 'k1' }) {
  // Get form config from mapping or use defaults
  const formConfig = Object.values(FILLABLE_FORMS).find(f => f.formType === formType) || {
    formType,
    pdfFile: `/assets/forms/${formType}.pdf`,
    displayName: formName
  };

  // Keep visaType in ref for use in callbacks
  const visaTypeRef = useRef(visaType);

  // Get form guidance for tips panel
  const guidance = getFormGuidance(formType);

  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [fieldAnnotations, setFieldAnnotations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showTipsDrawer, setShowTipsDrawer] = useState(false);
  const [activeTipSection, setActiveTipSection] = useState('overview');
  const canvasRef = useRef(null);
  const annotationLayerRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);
  const formDataRef = useRef(formData);
  const getTokenRef = useRef(getToken);
  const currentPageRef = useRef(currentPage);

  // Keep refs in sync
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    visaTypeRef.current = visaType;
  }, [visaType]);

  // Load saved form data from backend
  useEffect(() => {
    const loadSavedData = async () => {
      if (!getToken) return;

      try {
        const token = await getToken();
        if (!token) return;
        const result = await fetchFormData(token, visaType, formConfig.formType);
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
  }, [getToken, visaType, formConfig.formType]);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument({
          url: formConfig.pdfFile,
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
  }, [formConfig.pdfFile]);

  // Render current page
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
  }, [pdfDoc, currentPage, scale, dataLoaded]);

  // Save to backend
  const saveToBackend = useCallback(async () => {
    const getTokenFn = getTokenRef.current;
    const currentFormData = formDataRef.current;
    const page = currentPageRef.current;
    const currentVisaType = visaTypeRef.current;

    if (!getTokenFn) return;
    if (Object.keys(currentFormData).length === 0) return;

    try {
      setSaving(true);
      setSaveError(null);
      const token = await getTokenFn();
      if (!token) {
        throw new Error('Not signed in');
      }
      await saveFormData(token, currentVisaType, formConfig.formType, currentFormData, page);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error saving form data:', err);
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }, [formConfig.formType]);

  // Auto-save when form data changes
  useEffect(() => {
    if (!getToken || !dataLoaded) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (Object.keys(formData).length > 0) {
      setHasUnsavedChanges(true);
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveToBackend();
      }, AUTO_SAVE_DELAY);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, getToken, dataLoaded, saveToBackend]);

  const handleSave = async () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    await saveToBackend();
  };

  // Download filled PDF using PDFtk microservice
  const handleDownload = async () => {
    try {
      setDownloading(true);

      // Call the PDF filler microservice
      const pdfBlob = await fillPdf(formConfig.formType, formDataRef.current);

      // Download the filled PDF
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const pdfLink = document.createElement('a');
      pdfLink.href = pdfUrl;
      pdfLink.download = `${formConfig.displayName.replace(/\s+/g, '-')}-filled.pdf`;
      document.body.appendChild(pdfLink);
      pdfLink.click();
      document.body.removeChild(pdfLink);
      URL.revokeObjectURL(pdfUrl);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download filled PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Render form field overlay
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
      const currentValue = formDataRef.current[fieldName] || annotation.fieldValue || '';

      let element;

      if (fieldType === 'Tx') {
        element = document.createElement('input');
        element.type = 'text';
        element.value = currentValue;
        element.maxLength = annotation.maxLen || 100;
        element.placeholder = getFieldPlaceholder(fieldName);
        element.className = 'form-filler-input';
        element.addEventListener('blur', (e) => {
          handleFieldChange(fieldName, e.target.value);
        });
      } else if (fieldType === 'Btn') {
        if (annotation.checkBox) {
          element = document.createElement('input');
          element.type = 'checkbox';
          element.checked = currentValue === 'Yes' || currentValue === 'On' || currentValue === true;
          element.className = 'form-filler-checkbox';
          element.addEventListener('change', (e) => {
            handleFieldChange(fieldName, e.target.checked ? 'Yes' : 'Off');
          });
        } else if (annotation.radioButton) {
          element = document.createElement('input');
          element.type = 'radio';
          element.name = annotation.fieldName;
          element.value = annotation.buttonValue || '';
          element.checked = currentValue === annotation.buttonValue;
          element.className = 'form-filler-radio';
          element.addEventListener('change', (e) => {
            if (e.target.checked) {
              handleFieldChange(fieldName, annotation.buttonValue);
            }
          });
        }
      } else if (fieldType === 'Ch') {
        element = document.createElement('select');
        element.className = 'form-filler-select';

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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <div
          className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4"
          style={{ borderColor: '#1E3A5F', borderTopColor: 'transparent' }}
        />
        <p style={{ fontFamily: 'Soehne, sans-serif', color: '#6B7280' }}>
          Loading {formConfig.displayName}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: '#FEE2E2' }}
        >
          <svg className="w-8 h-8" fill="#DC2626" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h3
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: 'Libre Baskerville, serif', color: '#1E1F1C' }}
        >
          Unable to Load Form
        </h3>
        <p style={{ fontFamily: 'Soehne, sans-serif', color: '#6B7280' }}>{error}</p>
      </div>
    );
  }

  // Tips Panel Content Component
  const TipsPanelContent = ({ inDrawer = false }) => (
    <div className={`flex flex-col ${inDrawer ? 'h-full' : ''}`}>
      {/* Section tabs */}
      <div className="flex gap-1 p-3 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'sections', label: 'Sections' },
          { id: 'mistakes', label: 'Common Mistakes' },
          { id: 'tips', label: 'Pro Tips' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTipSection(tab.id)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              activeTipSection === tab.id
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{ fontFamily: 'Soehne, sans-serif' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTipSection === 'overview' && guidance && (
          <>
            <div>
              <h3
                className="text-lg font-semibold mb-1"
                style={{ fontFamily: 'Libre Baskerville, serif', color: '#1E1F1C' }}
              >
                {guidance.displayName}
              </h3>
              <p
                className="text-sm text-gray-500 mb-3"
                style={{ fontFamily: 'Soehne, sans-serif' }}
              >
                {guidance.subtitle}
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: 'Soehne, sans-serif', color: '#4B5563' }}
              >
                {guidance.overview}
              </p>
            </div>
            {guidance.estimatedTime && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span style={{ fontFamily: 'Soehne, sans-serif' }}>Est. {guidance.estimatedTime}</span>
              </div>
            )}
            {guidance.links && guidance.links.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2" style={{ fontFamily: 'Soehne, sans-serif' }}>
                  Helpful Links
                </h4>
                <div className="space-y-2">
                  {guidance.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[#1E3A5F] hover:underline"
                      style={{ fontFamily: 'Soehne, sans-serif' }}
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTipSection === 'sections' && guidance?.sections && (
          <div className="space-y-4">
            {guidance.sections.map((section, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <h4
                  className="font-medium text-sm mb-2"
                  style={{ fontFamily: 'Soehne, sans-serif', color: '#1E1F1C' }}
                >
                  {section.title}
                </h4>
                <ul className="space-y-1.5">
                  {section.tips.map((tip, j) => (
                    <li key={j} className="flex gap-2 text-sm" style={{ fontFamily: 'Soehne, sans-serif', color: '#4B5563' }}>
                      <span className="text-[#1E3A5F] flex-shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {activeTipSection === 'mistakes' && guidance?.commonMistakes && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-sm" style={{ fontFamily: 'Soehne, sans-serif' }}>Avoid These Mistakes</span>
            </div>
            {guidance.commonMistakes.map((mistake, i) => (
              <div
                key={i}
                className="flex gap-2 text-sm bg-amber-50 border border-amber-100 rounded-lg p-3"
                style={{ fontFamily: 'Soehne, sans-serif', color: '#92400E' }}
              >
                <span className="flex-shrink-0 font-medium">{i + 1}.</span>
                <span>{mistake}</span>
              </div>
            ))}
          </div>
        )}

        {activeTipSection === 'tips' && guidance?.proTips && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-sm" style={{ fontFamily: 'Soehne, sans-serif' }}>Pro Tips</span>
            </div>
            {guidance.proTips.map((tip, i) => (
              <div
                key={i}
                className="flex gap-2 text-sm bg-green-50 border border-green-100 rounded-lg p-3"
                style={{ fontFamily: 'Soehne, sans-serif', color: '#065F46' }}
              >
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        )}

        {!guidance && (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={{ fontFamily: 'Soehne, sans-serif' }}>No tips available for this form yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Download Modal */}
      {downloading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center max-w-sm mx-4"
            style={{ minWidth: '280px' }}
          >
            <div
              className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mb-6"
              style={{ borderColor: '#1E3A5F', borderTopColor: 'transparent' }}
            />
            <h3
              className="text-lg font-semibold mb-2 text-center"
              style={{ fontFamily: 'Libre Baskerville, serif', color: '#1E1F1C' }}
            >
              Generating Your PDF
            </h3>
            <p
              className="text-center"
              style={{ fontFamily: 'Soehne, sans-serif', color: '#6B7280', fontSize: '0.9375rem' }}
            >
              Filling in your form data...
            </p>
          </div>
        </div>
      )}

      {/* Mobile Tips Panel - slides in from right */}
      {showTipsDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 xl:hidden"
            onClick={() => setShowTipsDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 bg-white shadow-2xl xl:hidden w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold" style={{ fontFamily: 'Libre Baskerville, serif', color: '#1E1F1C' }}>
                Form Tips & Guidance
              </h3>
              <button
                onClick={() => setShowTipsDrawer(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TipsPanelContent inDrawer />
            </div>
          </div>
        </>
      )}

      {/* Compact header bar */}
      <div
        className="flex items-center justify-between px-4 py-2 rounded-t-xl"
        style={{ backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}
      >
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-gray-900"
            style={{ fontFamily: 'Soehne, sans-serif', color: '#6B7280' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <span
            className="font-medium"
            style={{ fontFamily: 'Soehne, sans-serif', color: '#1E1F1C', fontSize: '0.9375rem' }}
          >
            {formConfig.displayName}
          </span>
        </div>

        {/* Center: Page navigation + Zoom */}
        <div className="flex items-center gap-4">
          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="p-1.5 rounded transition-colors disabled:opacity-40 hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="#6B7280" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span
              className="px-2 py-1 text-sm min-w-[60px] text-center"
              style={{ fontFamily: 'Soehne, sans-serif', color: '#374151' }}
            >
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded transition-colors disabled:opacity-40 hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="#6B7280" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="h-4 w-px bg-gray-200" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut}
              className="p-1.5 rounded transition-colors hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="#6B7280" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span
              className="text-sm min-w-[50px] text-center"
              style={{ fontFamily: 'Soehne, sans-serif', color: '#6B7280' }}
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-1.5 rounded transition-colors hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="#6B7280" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Save status */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 text-sm"
            style={{ fontFamily: 'Soehne, sans-serif' }}
          >
            {saving ? (
              <span className="flex items-center gap-1.5 text-gray-500">
                <span
                  className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#9CA3AF', borderTopColor: 'transparent' }}
                />
                Saving...
              </span>
            ) : saveError ? (
              <span className="text-red-600">Save failed</span>
            ) : hasUnsavedChanges ? (
              <span className="text-amber-600">Unsaved</span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1.5 text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Saved
              </span>
            ) : null}
          </div>

          {getToken && hasUnsavedChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                fontFamily: 'Soehne, sans-serif',
                backgroundColor: '#1E3A5F',
                color: 'white'
              }}
            >
              Save
            </button>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={downloading || Object.keys(formData).length === 0}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 hover:bg-gray-100"
            style={{
              fontFamily: 'Soehne, sans-serif',
              color: '#374151',
              border: '1px solid #D1D5DB'
            }}
            title="Download filled PDF"
          >
            {downloading ? (
              <>
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#6B7280', borderTopColor: 'transparent' }}
                />
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </>
            )}
          </button>
        </div>
      </div>

      {/* Not signed in warning - compact */}
      {!getToken && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-sm"
          style={{ backgroundColor: '#FEF3C7', borderBottom: '1px solid #FDE68A' }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="#92400E" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span style={{ fontFamily: 'Soehne, sans-serif', color: '#92400E' }}>
            Sign in to save your progress
          </span>
        </div>
      )}

      {/* Mobile tip bar - shown only on screens smaller than xl (where layout panel appears) */}
      {guidance && (
        <button
          onClick={() => setShowTipsDrawer(true)}
          className="flex items-center justify-between px-4 py-2.5 xl:hidden"
          style={{ backgroundColor: '#F0F9FF', borderBottom: '1px solid #BAE6FD' }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0369A1]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium" style={{ fontFamily: 'Soehne, sans-serif', color: '#0369A1' }}>
              View tips & guidance for this form
            </span>
          </div>
          <svg className="w-4 h-4 text-[#0369A1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* PDF Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded-b-xl"
        style={{ backgroundColor: '#525659' }}
      >
        <div className="flex justify-center p-4 min-h-full">
          <div className="relative bg-white shadow-2xl">
            <canvas ref={canvasRef} />
            <div
              ref={annotationLayerRef}
              className="absolute top-0 left-0 annotation-layer"
            />
          </div>
        </div>
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
        .form-filler-input {
          background: rgba(255, 255, 240, 0.97);
          border: 1px solid #D1D5DB;
          padding: 2px 4px;
          font-size: 12px;
          font-family: Arial, sans-serif;
          box-sizing: border-box;
          line-height: 1.2;
          border-radius: 2px;
        }
        .form-filler-input:focus {
          background: #fff;
          border-color: #1E3A5F;
          outline: none;
          box-shadow: 0 0 0 2px rgba(30, 58, 95, 0.2);
        }
        .form-filler-checkbox,
        .form-filler-radio {
          cursor: pointer;
          accent-color: #1E3A5F;
        }
        .form-filler-select {
          background: rgba(255, 255, 240, 0.97);
          border: 1px solid #D1D5DB;
          font-size: 11px;
          padding: 2px 4px;
          box-sizing: border-box;
          border-radius: 2px;
        }
        .form-filler-select:focus {
          background: #fff;
          border-color: #1E3A5F;
          outline: none;
        }
      `}</style>
    </div>
  );
}
