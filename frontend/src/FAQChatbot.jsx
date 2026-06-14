import React, { useState, useRef, useEffect, useCallback } from 'react';
import AllQuestionsModal from "./AllQuestionsModal";
import HistoryPanel from "./HistoryPanel";

const FAQChatbot = () => {
  const [faqDatabase, setFaqDatabase] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // ==================== DARK MODE ====================

  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('faq-theme');
      if (stored) return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('faq-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // ==================== NLP PREPROCESSING ====================

  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into',
    'is', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'to', 'was',
    'will', 'with', 'your', 'you', 'this', 'what', 'how', 'my', 'do', 'does', 'did',
    'can', 'could', 'would', 'should', 'have', 'has', 'had', 'am', 'me', 'him', 'her'
  ]);

  const tokenize = (text) => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 0 && !stopWords.has(token));
  };

  const calculateTF = (tokens) => {
    const tf = {};
    tokens.forEach(token => { tf[token] = (tf[token] || 0) + 1; });
    Object.keys(tf).forEach(token => { tf[token] = tf[token] / tokens.length; });
    return tf;
  };

  const calculateIDF = (allDocuments) => {
    const idf = {};
    const totalDocs = allDocuments.length;
    allDocuments.forEach(doc => {
      const uniqueTokens = new Set(doc);
      uniqueTokens.forEach(token => { idf[token] = (idf[token] || 0) + 1; });
    });
    Object.keys(idf).forEach(token => { idf[token] = Math.log(totalDocs / idf[token]); });
    return idf;
  };

  const calculateTFIDF = (tokens, tf, idf) => {
    const vector = {};
    tokens.forEach(token => { vector[token] = (tf[token] || 0) * (idf[token] || 0); });
    return vector;
  };

  const cosineSimilarity = (vec1, vec2) => {
    const allKeys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
    let dotProduct = 0, magnitude1 = 0, magnitude2 = 0;
    allKeys.forEach(key => {
      const val1 = vec1[key] || 0;
      const val2 = vec2[key] || 0;
      dotProduct += val1 * val2;
      magnitude1 += val1 * val1;
      magnitude2 += val2 * val2;
    });
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  };

  const findBestMatch = useCallback((userQuestion) => {
    const userTokens = tokenize(userQuestion);
    if (userTokens.length === 0) return { match: null, confidence: 0 };

    const allTokens = faqDatabase.map(faq => tokenize(faq.question));
    const idf = calculateIDF(allTokens);
    const userTF = calculateTF(userTokens);
    const userVector = calculateTFIDF(userTokens, userTF, idf);

    let bestMatch = null;
    let bestScore = 0;

    faqDatabase.forEach(faq => {
      const faqTokens = tokenize(faq.question);
      const faqTF = calculateTF(faqTokens);
      const faqVector = calculateTFIDF(faqTokens, faqTF, idf);
      const similarity = cosineSimilarity(userVector, faqVector);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = faq;
      }
    });

    return { match: bestMatch, confidence: Math.round(bestScore * 100) };
  }, [faqDatabase]);

  // ==================== STATE MANAGEMENT ====================

  const welcomeMessage = {
    type: 'bot',
    content: "Hello! 👋 I'm your FAQ Assistant. Ask me anything about cloud hosting services, and I'll find the best answer for you.",
    timestamp: new Date().toISOString()
  };

  const [messages, setMessages] = useState([welcomeMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  // ==================== HISTORY MANAGEMENT ====================

  const [historySessions, setHistorySessions] = useState(() => {
    try {
      const stored = localStorage.getItem('faq-history-sessions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('faq-history-sessions', JSON.stringify(historySessions));
  }, [historySessions]);

  // Save current conversation as a session when it has user messages
  const saveCurrentSession = useCallback(() => {
    const userMessages = messages.filter(m => m.type === 'user');
    if (userMessages.length === 0) return;

    const sessionId = `session-${Date.now()}`;
    const newSession = {
      id: sessionId,
      date: new Date().toISOString(),
      messages: messages.filter(m => m.content !== welcomeMessage.content || m.type !== 'bot')
    };

    setHistorySessions(prev => {
      // Avoid duplicate saves — check if last session has same first user message
      const lastSession = prev[0];
      if (lastSession) {
        const lastFirstUser = lastSession.messages.find(m => m.type === 'user');
        const newFirstUser = newSession.messages.find(m => m.type === 'user');
        if (lastFirstUser && newFirstUser && lastFirstUser.content === newFirstUser.content
            && lastSession.messages.length === newSession.messages.length) {
          return prev;
        }
      }
      return [newSession, ...prev].slice(0, 50); // Keep last 50 sessions
    });
  }, [messages]);

  const loadSession = (session) => {
    setMessages([welcomeMessage, ...session.messages]);
    setShowHistory(false);
  };

  const clearAllHistory = () => {
    setHistorySessions([]);
    setShowHistory(false);
  };

  const startNewChat = () => {
    // Save current conversation before starting new
    saveCurrentSession();
    setMessages([welcomeMessage]);
  };

  // ==================== FETCH DATA ====================

  useEffect(() => {
    fetch('http://localhost:5000/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Failed to load categories', err));

    const url = selectedCategory
      ? `http://localhost:5000/api/faqs?category=${encodeURIComponent(selectedCategory)}`
      : 'http://localhost:5000/api/faqs';
    fetch(url)
      .then(res => res.json())
      .then(data => setFaqDatabase(data))
      .catch(err => console.error('Failed to load FAQs', err));
  }, [selectedCategory]);

  // ==================== SCROLL ====================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ==================== MESSAGE HANDLING ====================

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const question = inputValue;
    setInputValue('');
    setIsLoading(true);

    setTimeout(() => {
      const { match, confidence } = findBestMatch(question);

      const botMessage = match
        ? {
            type: 'bot',
            content: match.answer,
            faqId: match.id,
            confidence,
            question: match.question,
            timestamp: new Date().toISOString()
          }
        : {
            type: 'bot',
            content: "I couldn't find a matching answer to your question. Could you rephrase it or try asking something different? You can also contact our support team for help.",
            confidence: 0,
            timestamp: new Date().toISOString()
          };

      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 400);
  };

  const handleSuggestedQuestion = (question) => {
    setInputValue(question);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Save session on unmount or when navigating away
  useEffect(() => {
    const handleBeforeUnload = () => saveCurrentSession();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveCurrentSession]);

  // ==================== SUGGESTED QUESTIONS ====================

  const suggestedQuestions = [
    "How much does cloud hosting cost?",
    "What is cloud hosting?",
    "Do you support Docker and Kubernetes?",
    "What support do you provide?"
  ];

  // ==================== RENDER ====================

  return (
    <div className="chat-glass">
      {showModal && (
        <AllQuestionsModal
          onClose={() => setShowModal(false)}
          faqDatabase={faqDatabase}
          onSelect={handleSuggestedQuestion}
        />
      )}
      {showHistory && (
        <HistoryPanel
          sessions={historySessions}
          onClose={() => setShowHistory(false)}
          onLoadSession={loadSession}
          onClearAll={clearAllHistory}
        />
      )}

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-background-secondary)',
        padding: '14px 20px',
        borderBottom: '1px solid var(--color-border-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px'
      }}>
        {/* Left: Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>🤖</span>
          <div>
            <h2 style={{
              margin: '0',
              fontSize: '15px',
              fontWeight: '600',
              color: 'var(--color-text-primary)'
            }}>FAQ Assistant</h2>
            <p style={{
              margin: '2px 0 0 0',
              fontSize: '11px',
              color: 'var(--color-text-secondary)'
            }}>Cloud Hosting Support</p>
          </div>
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Category Selector */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{
              background: 'var(--color-background-primary)',
              border: '1px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-md)',
              padding: '6px 10px',
              color: 'var(--color-text-primary)',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)'
            }}
          >
            <option value="">All Categories</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>

          {/* All Questions */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              borderRadius: 'var(--border-radius-md)',
              color: 'var(--accent)',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            📋 Questions
          </button>

          {/* New Chat */}
          <button
            className="icon-btn"
            onClick={startNewChat}
            title="New chat"
            aria-label="New chat"
          >
            ✏️
          </button>

          {/* History */}
          <button
            className="icon-btn"
            onClick={() => {
              saveCurrentSession();
              setShowHistory(true);
            }}
            title="Chat history"
            aria-label="Chat history"
          >
            🕘
          </button>

          {/* Dark Mode Toggle */}
          <button
            className="icon-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label="Toggle dark mode"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {/* ── Messages Container ────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Suggested questions when chat is empty */}
        {messages.length === 1 && (
          <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
            <p style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              margin: '0 0 12px 0',
              fontWeight: '500'
            }}>Try asking about:</p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}>
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuestion(q)}
                  style={{
                    background: 'var(--color-background-secondary)',
                    border: '1px solid var(--color-border-tertiary)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '10px 12px',
                    fontSize: '13px',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    lineHeight: '1.4'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <div
              style={{
                maxWidth: '75%',
                padding: '12px 14px',
                borderRadius: 'var(--border-radius-md)',
                background: msg.type === 'user'
                  ? 'var(--color-background-info)'
                  : 'var(--color-background-secondary)',
                color: msg.type === 'user'
                  ? 'var(--color-text-info)'
                  : 'var(--color-text-primary)',
                fontSize: '14px',
                lineHeight: '1.5',
                border: msg.type === 'user' ? 'none' : '1px solid var(--color-border-tertiary)'
              }}
            >
              <p style={{ margin: '0' }}>{msg.content}</p>

              {/* Confidence badge */}
              {msg.confidence > 0 && msg.type === 'bot' && (
                <div style={{
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--color-border-tertiary)',
                  fontSize: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: msg.confidence >= 60 ? '#22c55e' : msg.confidence >= 30 ? '#f59e0b' : '#ef4444'
                    }} />
                    <span style={{
                      color: 'var(--color-text-secondary)',
                      fontWeight: '500'
                    }}>
                      {msg.confidence}% match
                    </span>
                  </div>
                  <p style={{
                    margin: '0',
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                    fontStyle: 'italic'
                  }}>
                    Q: {msg.question}
                  </p>
                </div>
              )}

              {/* No match warning */}
              {msg.confidence === 0 && msg.type === 'bot' && idx > 0 && (
                <div style={{
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--color-border-tertiary)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--color-text-warning)'
                }}>
                  ⚠️ <span>No match found</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 14px',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--color-background-secondary)',
              border: '1px solid var(--color-border-tertiary)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  animation: 'pulse 1.5s infinite',
                  animationDelay: `${delay}s`
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ────────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--color-border-tertiary)',
        background: 'var(--color-background-primary)',
        display: 'flex',
        gap: '10px'
      }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask a question about cloud hosting..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border-tertiary)',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
            background: 'var(--color-background-primary)',
            color: 'var(--color-text-primary)',
            opacity: isLoading ? 0.6 : 1,
            transition: 'border-color 0.2s',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--color-border-tertiary)'}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          style={{
            padding: '10px 18px',
            background: isLoading || !inputValue.trim() ? 'var(--accent-bg)' : 'var(--color-background-info)',
            border: '1px solid var(--color-border-info)',
            borderRadius: 'var(--border-radius-md)',
            color: isLoading || !inputValue.trim() ? 'var(--accent)' : 'var(--color-text-info)',
            cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: isLoading || !inputValue.trim() ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default FAQChatbot;