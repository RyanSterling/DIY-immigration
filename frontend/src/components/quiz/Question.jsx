import { useState, useEffect } from 'react';
import { COUNTRIES } from '../../data/countries';

export default function Question({ question, value, onChange, onNext, onBack, showBack, current, total, hideTotal, onTransitionStart }) {
  const [flashingValue, setFlashingValue] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);
  const [multiSelectValues, setMultiSelectValues] = useState(value || []);

  // Reset state when question changes
  useEffect(() => {
    setFlashingValue(null);
    setIsFlashing(false);
    setSelectedValue(null);
    setMultiSelectValues(value || []);
  }, [question.id, value]);

  const handleOptionClick = (optionValue) => {
    if (isFlashing) return;

    // For multi-select questions
    if (question.type === 'multiselect') {
      const newValues = multiSelectValues.includes(optionValue)
        ? multiSelectValues.filter(v => v !== optionValue)
        : [...multiSelectValues, optionValue];
      setMultiSelectValues(newValues);
      onChange(newValues);
      return;
    }

    // For single-select questions
    setIsFlashing(true);
    setFlashingValue(optionValue);
    setSelectedValue(optionValue);

    setTimeout(() => {
      setFlashingValue(null);
    }, 100);

    setTimeout(() => {
      setFlashingValue(optionValue);
    }, 200);

    setTimeout(() => {
      if (onTransitionStart) {
        onTransitionStart();
      }
      onChange(optionValue, (newAnswers) => {
        onNext(newAnswers);
      });
    }, 600);
  };

  const handleCountryChange = (e) => {
    const countryValue = e.target.value;
    onChange(countryValue);
  };

  const handleMultiSelectNext = () => {
    if (multiSelectValues.length > 0) {
      onNext();
    }
  };

  // Country dropdown type
  if (question.type === 'country') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pt-20 pb-8 px-4">
          <div className="max-w-3xl mx-auto flex flex-col h-full">
            <div className="space-y-4 mb-auto">
              <p className="text-sm font-medium mb-2" style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#8B8886'
              }}>
                Question {current}{!hideTotal && ` of ${total}`}
              </p>

              <h2 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.875rem',
                color: '#1E1F1C',
                lineHeight: '1.3',
                fontWeight: '400'
              }}>
                {question.text}
              </h2>

              {question.helper && (
                <p className="text-sm italic" style={{
                  fontFamily: 'Soehne, sans-serif',
                  color: '#77716E'
                }}>
                  {question.helper}
                </p>
              )}
            </div>

            <div className="space-y-3 mt-8">
              <select
                value={value || ''}
                onChange={handleCountryChange}
                className="w-full px-4 py-4 transition-colors cursor-pointer"
                style={{
                  backgroundColor: '#E6E4E1',
                  borderRadius: '12px',
                  border: 'none',
                  fontFamily: 'Soehne, sans-serif',
                  fontSize: '1rem',
                  color: value ? '#1E1F1C' : '#77716E',
                  outline: 'none'
                }}
              >
                <option value="">Select a country...</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>

              {value && (
                <button
                  onClick={() => onNext()}
                  className="w-full px-8 py-4 font-medium transition-all mt-4"
                  style={{
                    backgroundColor: '#1E3A5F',
                    color: 'white',
                    borderRadius: '27px',
                    fontFamily: 'Soehne, sans-serif'
                  }}
                >
                  Continue
                </button>
              )}
            </div>

            {showBack && (
              <div className="mt-6">
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
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Multi-select type
  if (question.type === 'multiselect') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 pt-20 pb-8 px-4">
          <div className="max-w-3xl mx-auto flex flex-col h-full">
            <div className="space-y-4 mb-auto">
              <p className="text-sm font-medium mb-2" style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#8B8886'
              }}>
                Question {current}{!hideTotal && ` of ${total}`}
              </p>

              <h2 style={{
                fontFamily: 'Libre Baskerville, serif',
                fontSize: '1.875rem',
                color: '#1E1F1C',
                lineHeight: '1.3',
                fontWeight: '400'
              }}>
                {question.text}
              </h2>

              <p className="text-sm" style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#77716E'
              }}>
                Select all that apply
              </p>
            </div>

            <div className="space-y-3 mt-8">
              {question.options.map((option) => {
                const isSelected = multiSelectValues.includes(option.value);

                return (
                  <button
                    key={option.value}
                    onClick={() => handleOptionClick(option.value)}
                    className="w-full text-left px-6 py-4 transition-all duration-100"
                    style={{
                      backgroundColor: isSelected ? '#1E3A5F' : '#E6E4E1',
                      borderRadius: '27px',
                      fontFamily: 'Soehne, sans-serif',
                      color: isSelected ? 'white' : '#77716E'
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all duration-100"
                        style={{
                          border: `2px solid ${isSelected ? 'white' : '#CBC9C8'}`,
                          backgroundColor: isSelected ? '#1E3A5F' : 'transparent',
                          marginTop: '2px'
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-lg">{option.label}</span>
                    </div>
                  </button>
                );
              })}

              <button
                onClick={handleMultiSelectNext}
                disabled={multiSelectValues.length === 0}
                className="w-full px-8 py-4 font-medium transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {showBack && (
              <div className="mt-6">
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
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default single-select (choice, yesno, scale)
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pt-20 pb-8 px-4">
        <div className="max-w-3xl mx-auto flex flex-col h-full">
          <div className="space-y-4 mb-auto">
            <p className="text-sm font-medium mb-2" style={{
              fontFamily: 'Soehne, sans-serif',
              color: '#8B8886'
            }}>
              Question {current}{!hideTotal && ` of ${total}`}
            </p>

            <h2 style={{
              fontFamily: 'Libre Baskerville, serif',
              fontSize: '1.875rem',
              color: '#1E1F1C',
              lineHeight: '1.3',
              fontWeight: '400'
            }}>
              {question.text}
            </h2>

            {question.helper && (
              <p className="text-sm italic" style={{
                fontFamily: 'Soehne, sans-serif',
                color: '#77716E'
              }}>
                {question.helper}
              </p>
            )}
          </div>

          <div className="space-y-3 mt-8">
            {question.options.map((option) => {
              const isVisuallySelected = isFlashing ? flashingValue === option.value : value === option.value;
              const showCheckmark = isFlashing ? selectedValue === option.value : value === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => handleOptionClick(option.value)}
                  className="w-full text-left px-6 py-4 transition-all duration-100"
                  style={{
                    backgroundColor: isVisuallySelected ? '#1E3A5F' : '#E6E4E1',
                    borderRadius: '27px',
                    fontFamily: 'Soehne, sans-serif',
                    color: isVisuallySelected ? 'white' : '#77716E'
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-100"
                      style={{
                        borderColor: isVisuallySelected ? 'white' : '#CBC9C8',
                        backgroundColor: 'transparent',
                        marginTop: '2px'
                      }}
                    >
                      {showCheckmark && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke={isVisuallySelected ? "white" : "#CBC9C8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-lg">{option.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {showBack && (
            <div className="mt-6">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
