import React, { useState, useRef, useEffect } from 'react';
import './CustomDropdown.css';

function CustomDropdown({ options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="dropdown-selected-text">{selectedOption ? selectedOption.label : ''}</span>
        <svg
          className="dropdown-chevron-svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1DB954"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={isSelected}
              >
                <span>{option.label}</span>
                {isSelected && <span className="item-checkmark">✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomDropdown;
