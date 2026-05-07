import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Sparkles, Loader2, MessageSquare, Plus, Settings, History, Menu, X, Trash2, Mic } from 'lucide-react';
import axios from 'axios';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

const App: React.FC = () => {
  // Initialize from localStorage or create default
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('dacAi_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert string dates back to Date objects
        return parsed.map((s: any) => ({
          ...s,
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
    
    // Default session
    const defaultSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Conversation",
      messages: [
        {
          id: '1',
          text: "Hello! I am Dev-Ai (v2.1). How can I assist you today?",
          sender: 'bot',
          timestamp: new Date()
        }
      ],
      updatedAt: new Date()
    };
    return [defaultSession];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => sessions[0]?.id || Date.now().toString());
  
  // Derived state for current messages
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const updateCurrentSession = (updater: (prevMessages: Message[]) => Message[]) => {
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(session => {
        if (session.id === currentSessionId) {
          const newMessages = updater(session.messages);
          // Set title based on first user message if title is default
          let title = session.title;
          if (title === "New Conversation") {
            const firstUserMsg = newMessages.find(m => m.sender === 'user');
            if (firstUserMsg) {
              title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
            }
          }
          return { ...session, messages: newMessages, updatedAt: new Date(), title };
        }
        return session;
      });
      // Sort so most recent is at the top
      return updatedSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    });
  };

  // Save to localStorage whenever sessions change
  useEffect(() => {
    localStorage.setItem('dacAi_sessions', JSON.stringify(sessions));
  }, [sessions]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<'English' | 'Hindi' | 'Marathi'>('English');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
           setInput(prev => prev ? prev + ' ' + finalTranscript : finalTranscript);
        } else if (interimTranscript) {
           // Optionally update input with interim (though it can be jittery)
           // setInput(interimTranscript);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        // Update language before starting
        const langMap = {
          'English': 'en-IN',
          'Hindi': 'hi-IN',
          'Marathi': 'mr-IN'
        };
        recognitionRef.current.lang = langMap[language];
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.error("Could not start speech recognition", e);
        }
      } else {
        alert("Your browser does not support Speech Recognition.");
      }
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Automatically stop listening if user sends the message
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    updateCurrentSession(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chat', {
        query: input,
        language: language
      }, { timeout: 60000 });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date()
      };

      updateCurrentSession(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      const detail = error.response?.data?.error || error.message || "Unknown error";
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I'm having trouble connecting to my brain. (Error: ${detail}). Please check if the backend server is running and your API keys are valid.`,
        sender: 'bot',
        timestamp: new Date()
      };
      updateCurrentSession(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: newSessionId,
      title: "New Conversation",
      messages: [
        {
          id: '1',
          text: "Hello! I am Dev-Ai (v2.1). How can I assist you today?",
          sender: 'bot',
          timestamp: new Date()
        }
      ],
      updatedAt: new Date()
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false); // Close sidebar on mobile after new chat
    }
  };

  const switchSession = (id: string) => {
    setCurrentSessionId(id);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false); // Close sidebar on mobile after selection
    }
  };

  return (
    <div className={`app-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={clearChat}>
            <Plus size={18} />
            <span>New Chat</span>
          </button>
          <button className="mobile-close" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="history-section">
          <div className="section-label">
            <History size={14} />
            <span>Recent Activity</span>
          </div>
          <div className="history-list">
            {sessions.map(session => (
              <div 
                key={session.id} 
                className={`history-item ${session.id === currentSessionId ? 'active' : ''}`}
                onClick={() => switchSession(session.id)}
                style={{ cursor: 'pointer' }}
              >
                <MessageSquare size={16} />
                <span title={session.title}>{session.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">JD</div>
            <div className="user-info">
              <span className="user-name">John Doe</span>
              <span className="user-plan">Pro Plan</span>
            </div>
            <Settings size={18} className="settings-icon" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="main-header">
          <div className="header-left">
            <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu size={20} />
            </button>
            <div className="brand-badge">
              <Sparkles size={18} className="sparkle-icon" />
              <span>Dev-Ai</span>
            </div>
          </div>
          
          <div className="header-right">
            <div className="lang-selector">
              <button 
                className={`lang-option ${language === 'English' ? 'selected' : ''}`}
                onClick={() => setLanguage('English')}
              >
                EN
              </button>
              <button 
                className={`lang-option ${language === 'Hindi' ? 'selected' : ''}`}
                onClick={() => setLanguage('Hindi')}
              >
                हि
              </button>
              <button 
                className={`lang-option ${language === 'Marathi' ? 'selected' : ''}`}
                onClick={() => setLanguage('Marathi')}
              >
                मर
              </button>
            </div>
            <button className="icon-btn delete-chat" onClick={clearChat} title="Clear Chat">
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        <div className="chat-viewport">
          <div className="messages-container">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.sender}`}>
                <div className="message-content-wrapper">
                  <div className="message-avatar">
                    {msg.sender === 'user' ? <User size={18} /> : <Sparkles size={18} />}
                  </div>
                  <div className="message-body">
                    <div className="message-header">
                      {msg.sender === 'user' ? 'You' : 'Dev-Ai'}
                    </div>
                    <div className="message-text">
                      {msg.text}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-row bot">
                <div className="message-content-wrapper">
                  <div className="message-avatar">
                    <Sparkles size={18} />
                  </div>
                  <div className="message-body">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <footer className="input-area">
          <div className="input-container">
            <div className="input-box-wrapper">
              <textarea
                rows={1}
                placeholder={
                  language === 'English' ? 'Message Dev-Ai...' :
                  language === 'Hindi' ? 'Dev-Ai को संदेश भेजें...' :
                  'Dev-Ai ला संदेश पाठवा...'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button 
                className={`mic-trigger ${isListening ? 'listening' : ''}`} 
                onClick={toggleListening}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                <Mic size={18} />
              </button>
              <button 
                className="send-trigger" 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? <Loader2 size={18} className="spinning" /> : <Send size={18} />}
              </button>
            </div>
            <p className="input-footer">
              Powered by <span className="brand-highlight">devNectar Consultancy</span>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
