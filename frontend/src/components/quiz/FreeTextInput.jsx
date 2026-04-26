export default function FreeTextInput({ value, onChange, onNext, onBack }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#EFEDEC' }}>
      <div className="flex-1 pt-20 pb-8 px-4">
        <div className="max-w-3xl mx-auto flex flex-col h-full">
          <div className="space-y-4 mb-auto">
            <h2 style={{
              fontFamily: 'Libre Baskerville, serif',
              fontSize: '1.875rem',
              color: '#1E1F1C',
              lineHeight: '1.3',
              fontWeight: '400'
            }}>
              Is there anything else we should know about your situation?
            </h2>

            <p className="text-sm" style={{
              fontFamily: 'Soehne, sans-serif',
              color: '#77716E'
            }}>
              Optional: Share any additional context that might help us provide more accurate recommendations
              (e.g., specific achievements, unique circumstances, timing constraints).
            </p>

            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Share any additional details..."
              className="w-full px-4 py-3 transition-colors resize-none"
              rows={6}
              style={{
                backgroundColor: '#E6E4E1',
                borderRadius: '12px',
                border: 'none',
                fontFamily: 'Soehne, sans-serif',
                fontSize: '1rem',
                color: '#1E1F1C',
                outline: 'none'
              }}
            />
          </div>

          <div className="flex justify-between items-center mt-8">
            <button
              onClick={onBack}
              className="font-medium transition-colors"
              style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#77716E'
              }}
            >
              &#8592; Back
            </button>

            <button
              onClick={onNext}
              className="px-8 py-3 font-medium transition-all"
              style={{
                backgroundColor: '#1E3A5F',
                color: 'white',
                borderRadius: '27px',
                fontFamily: 'Soehne, sans-serif'
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
