import React, { useState } from 'react';

const AllQuestionsModal = ({ onClose, faqDatabase, onSelect }) => {
  const [search, setSearch] = useState('');

  const filtered = faqDatabase.filter(faq =>
    faq.question.toLowerCase().includes(search.toLowerCase())
  );

  const handleClick = (question) => {
    if (onSelect) {
      onSelect(question);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>All Questions</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} aria-label="Close">×</button>
        </div>
        <input
          type="text"
          placeholder="Search questions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            margin: '12px 0',
            padding: '8px 12px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border-tertiary)',
            background: 'var(--color-background-primary)',
            color: 'var(--color-text-primary)'
          }}
        />
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {filtered.map(faq => (
            <button
              key={faq.id}
              onClick={() => handleClick(faq.question)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                marginBottom: '4px',
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer'
              }}
            >
              {faq.question}
            </button>
          ))}
          {filtered.length === 0 && <p>No matching questions.</p>}
        </div>
      </div>
    </div>
  );
};

export default AllQuestionsModal;
