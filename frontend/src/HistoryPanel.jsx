import React from 'react';

const HistoryPanel = ({ sessions, onClose, onLoadSession, onClearAll }) => {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPreview = (session) => {
    const userMsgs = session.messages.filter(m => m.type === 'user');
    if (userMsgs.length > 0) return userMsgs[0].content;
    return 'Empty conversation';
  };

  const getMsgCount = (session) => {
    const userCount = session.messages.filter(m => m.type === 'user').length;
    return `${userCount} question${userCount !== 1 ? 's' : ''}`;
  };

  return (
    <>
      <div className="history-overlay" onClick={onClose} />
      <div className="history-panel">
        <div className="history-header">
          <h3>
            <span role="img" aria-label="history">🕘</span>
            Chat History
          </h3>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close history"
            style={{ fontSize: '16px' }}
          >
            ✕
          </button>
        </div>

        <div className="history-body">
          {sessions.length === 0 ? (
            <div className="history-empty">
              <span role="img" aria-label="empty">💬</span>
              <p>No conversation history yet.</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                Your past conversations will appear here.
              </p>
            </div>
          ) : (
            sessions.map((session, idx) => (
              <div
                key={session.id || idx}
                className="history-session"
                onClick={() => onLoadSession(session)}
              >
                <div className="session-date">{formatDate(session.date)}</div>
                <div className="session-preview">{getPreview(session)}</div>
                <div className="session-count">{getMsgCount(session)}</div>
              </div>
            ))
          )}
        </div>

        {sessions.length > 0 && (
          <div className="history-footer">
            <button className="clear-history-btn" onClick={onClearAll}>
              🗑️ Clear All History
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default HistoryPanel;
