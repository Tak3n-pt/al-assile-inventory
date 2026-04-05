import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ value, onChange, options = [], placeholder = 'Select...', disabled = false, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [isOpen]);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors text-left
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'border-violet-500' : 'border-dark-700 hover:border-dark-600'}`}
        style={{ backgroundColor: '#1a2332', color: selectedOption ? '#fff' : '#64748b' }}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: '#64748b' }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-xl border border-dark-600 shadow-2xl overflow-y-auto"
          style={{
            backgroundColor: '#1a2332',
            maxHeight: '220px',
            zIndex: 9999,
          }}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: '#64748b' }}>No options</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-dark-700 flex items-center justify-between"
                style={{
                  color: String(opt.value) === String(value) ? '#D4A574' : '#e2e8f0',
                  backgroundColor: String(opt.value) === String(value) ? 'rgba(212,165,116,0.08)' : 'transparent',
                }}
              >
                <span className="truncate">{opt.label}</span>
                {String(opt.value) === String(value) && (
                  <span className="text-xs" style={{ color: '#D4A574' }}>✓</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
