import { useState, useRef, useEffect, useCallback } from "react";

const THEMES = {
  dark: {
    bg: "#050a05",
    surface: "#0d1a0d",
    surface2: "#1a2e1a",
    border: "#1b331b",
    accent: "#00ff41",
    accent2: "#fcd116",
    accent3: "#3a75c4",
    text: "#e0e0e0",
    muted: "#457a59",
    inputBg: "#020502"
  },
  light: {
    bg: "#ffffff",
    surface: "#f0f4f0",
    surface2: "#e8f5e9",
    border: "#dddddd",
    accent: "#009e60",
    accent2: "#d9ae00",
    accent3: "#3a75c4",
    text: "#1a1a1a",
    muted: "#5c8c70",
    inputBg: "#f8faf9"
  }
};

const SYSTEM_PROMPT = `Tu es NOVA AI, un assistant étudiant gabonais intelligent et chill, construit par OCTALABS et NEXUSVERSE.
Tu as été conçu pour aider les étudiants dans leurs devoirs, fournir des explications claires, aider aux recherches et donner des conseils d'orientation scolaire.
Tu réponds TOUJOURS en français de manière précise et encourageante, sauf si l'utilisateur te demande explicitement une traduction.
Ton ton est adapté à un étudiant de 20 ans. n'hésite pas à mentionner que tu es une création d'OCTALABS et NEXUSVERSE si on te demande qui t'a conçu.`;

const THINK_STEPS = [
  "Analyse de la question...",
  "Recherche d'explications claires...",
  "Structuration de la réponse...",
  "Adaptation au niveau étudiant...",
  "Vérification des éléments pédagogiques...",
  "Synthèse de la réponse...",
];

const QUICK = ["Aide pour un devoir", "Explique un concept", "Méthodologie de travail", "Conseils d'orientation", "Exercices supplémentaires"];

function detectLang(text) {
  const fr = (text.match(/[àâäéèêëîïôùûüçœæ]/gi) || []).length;
  const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const zh = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
  const es = (text.match(/[áéíóúüñ¿¡]/gi) || []).length;
  if (ar > 0) return "Arabic";
  if (zh > 0) return "Chinese";
  if (fr > 0) return "French";
  if (es > 0) return "Spanish";
  if (/^[a-zA-Z\s\d.,!?'"-]+$/.test(text)) return "English";
  return "the same language as the user message";
}

function AdinkraSVG({ color, size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="12" stroke={color} strokeWidth="1.2" fill="none" />
      <circle cx="14" cy="14" r="6" stroke={color} strokeWidth="0.8" fill="none" />
      <circle cx="14" cy="14" r="2.5" fill={color} />
      <line x1="14" y1="2" x2="14" y2="8" stroke={color} strokeWidth="1.2" />
      <line x1="14" y1="20" x2="14" y2="26" stroke={color} strokeWidth="1.2" />
      <line x1="2" y1="14" x2="8" y2="14" stroke={color} strokeWidth="1.2" />
      <line x1="20" y1="14" x2="26" y2="14" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  let html = code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, m => `<span style="color:#7dba6a">${m}</span>`)
    .replace(/(#.*$|\/\/.*$)/gm, m => `<span style="color:#6b7a5a;font-style:italic">${m}</span>`)
    .replace(/\b(def|class|import|from|return|if|else|elif|for|while|in|not|and|or|True|False|None|async|await|try|except|const|let|var|function|new|this)\b/g, m => `<span style="color:var(--accent2);font-weight:600">${m}</span>`)
    .replace(/\b(\d+\.?\d*)\b/g, m => `<span style="color:var(--accent)">${m}</span>`);
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, margin: "10px 0", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.15em" }}>{lang || "code"}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 8px", color: copied ? "var(--accent3)" : "var(--muted)", cursor: "pointer", fontSize: 10, fontFamily: "var(--font-mono)", transition: "all 0.2s" }}>
          {copied ? "✓ COPIÉ" : "COPIER"}
        </button>
      </div>
      <pre style={{ padding: "12px 14px", overflowX: "auto", fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.7, color: "var(--text)" }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function MessageBubble({ msg, themeColors }) {
  const isGeo = msg.role === "geo";
  // Content extraction logic...
  const content = msg.content;
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let match;
  let lastIndex = 0;
  const msgParts = [];

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      msgParts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    msgParts.push({ type: "code", lang: match[1], content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    msgParts.push({ type: "text", content: content.slice(lastIndex) });
  }

  const fmt = txt => txt
    .replace(/\*\*([^*]+)\*\*/g, `<strong style="color:var(--accent2)">$1</strong>`)
    .replace(/`([^`]+)`/g, `<code style="font-family:var(--font-mono);font-size:11px;background:var(--surface2);padding:2px 5px;border-radius:3px;color:var(--accent)">$1</code>`)
    .replace(/\n/g, "<br/>");

  return (
    <div className={`message-bubble ${isGeo ? 'geo' : 'user'}`}>
      <div className="avatar">
        {isGeo ? <AdinkraSVG color="var(--accent)" size={20} /> : <span style={{ fontFamily: "var(--font-main)", fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>YOU</span>}
      </div>
      <div className="message-content">
        <div className="message-info">
          <span className="author-name">{isGeo ? "NOVA AI" : "VOUS"}</span>
          <span className="message-time">{msg.time}</span>
        </div>
        <div className="bubble-body" style={{ backgroundColor: isGeo ? themeColors.surface : themeColors.surface2, color: themeColors.text }}>
          {msgParts.map((p, i) => p.type === "code" ? <CodeBlock key={i} code={p.content} lang={p.lang} /> : <span key={i} dangerouslySetInnerHTML={{ __html: fmt(p.content) }} />)}
          {msg.isStreaming && <span className="cursor">█</span>}
        </div>
      </div>
    </div>
  );
}


function Sidebar({ conversations, activeId, onSelect, onNew, onLogout, onClose, isMobile }) {
  return (
    <div className={`sidebar ${isMobile ? (activeId ? '' : 'open') : 'open'}`}>
      <div className="sidebar-header">
        <div className="logo">
          <AdinkraSVG color="var(--accent)" size={24} />
          <span>NOVA <span className="logo-accent">AI</span></span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", marginTop: 4 }}>
          ASSISTANT ÉTUDIANT
        </div>
        <button onClick={onNew} className="new-chat-btn">
          + NOUVELLE CONVERSATION
        </button>
      </div>
      <div className="conv-list">
        {conversations.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", fontSize: 11, color: "var(--muted)" }}>Aucune conversation</div>
        ) : conversations.map(c => (
          <div key={c.id} onClick={() => { onSelect(c); if (isMobile) onClose(); }}
            className={`conv-item ${activeId === c.id ? 'active' : ''}`}>
            <div className="conv-title">{c.title}</div>
            <div className="conv-date">{new Date(c.updated_at).toLocaleDateString("fr-FR")}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "1.5rem", borderTop: "1px solid var(--border)" }}>
        <button onClick={onLogout} className="new-chat-btn" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          EFFACER L'HISTORIQUE
        </button>
      </div>
    </div>
  );
}

export default function NovaAI() {
  const [theme, setTheme] = useState("dark");
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfContext, setPdfContext] = useState(null);
  const [thinkMode, setThinkMode] = useState(true);
  const fileInputRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const chatRef = useRef(null);
  const apiHistory = useRef([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('nova_convs') || '[]');
    setConversations(saved);
    if (saved.length > 0) {
      selectConv(saved[0]);
    } else {
      newConversation();
    }
  }, []);

  const loadMessages = (convId) => {
    const saved = JSON.parse(localStorage.getItem(`nova_msgs_${convId}`) || '[]');
    setMessages(saved);
    apiHistory.current = saved.map(m => ({ role: m.role === "geo" || m.role === "assistant" ? "assistant" : m.role, content: m.content }));
  };

  const selectConv = (conv) => { 
    setActiveConv(conv); 
    loadMessages(conv.id); 
  };

  const newConversation = () => {
    if (activeConv && activeConv.title === "Nouvelle conversation" && messages.length === 0) return;
    const id = Date.now().toString();
    const newConv = { id, title: "Nouvelle conversation", updated_at: new Date().toISOString() };
    setConversations(prev => {
      const next = [newConv, ...prev];
      localStorage.setItem('nova_convs', JSON.stringify(next));
      return next;
    });
    setActiveConv(newConv);
    setMessages([]);
    apiHistory.current = [];
  };

  const logout = () => {
    if (window.confirm("Voulez-vous vraiment effacer tout l'historique ?")) {
      localStorage.clear();
      setConversations([]); setMessages([]); setActiveConv(null); apiHistory.current = [];
      newConversation();
    }
  };

  useEffect(() => {
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 50);
  }, [messages]);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const getTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, name: file.name }),
      });
      const data = await res.json();
      if (data.text) {
        setPdfContext({ name: file.name, text: data.text });
      } else {
        alert("Erreur PDF: " + data.error);
      }
    } catch (err) {
      alert("Erreur lors de la lecture du PDF !");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    let currentConv = activeConv;
    let convId = currentConv?.id;
    if (!convId) {
      convId = Date.now().toString();
      currentConv = { id: convId, title: text.slice(0, 30) + "...", updated_at: new Date().toISOString() };
      setActiveConv(currentConv);
      setConversations(prev => {
        const next = [currentConv, ...prev];
        localStorage.setItem('nova_convs', JSON.stringify(next));
        return next;
      });
    } else if (currentConv.title === "Nouvelle conversation") {
      const updatedConv = { ...currentConv, title: text.slice(0, 30) + "...", updated_at: new Date().toISOString() };
      currentConv = updatedConv;
      setActiveConv(updatedConv);
      setConversations(prev => {
        const next = prev.map(c => c.id === convId ? updatedConv : c);
        localStorage.setItem('nova_convs', JSON.stringify(next));
        return next;
      });
    }

    setInput(""); setLoading(true);
    const userMsg = { role: "user", content: text, time: getTime() };

    let finalPrompt = text;
    if (pdfContext) {
      finalPrompt = `[Document : ${pdfContext.name}]\n${pdfContext.text}\n\nQuestion de l'utilisateur : ${text}`;
    }
    
    setMessages(prev => {
      const nextMsgsUser = [...prev, userMsg];
      localStorage.setItem(`nova_msgs_${convId}`, JSON.stringify(nextMsgsUser));
      return nextMsgsUser;
    });

    apiHistory.current.push({ role: "user", content: finalPrompt });

    const replyMsg = { role: "geo", content: "", time: getTime(), isStreaming: true };
    setMessages(prev => [...prev, replyMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiHistory.current })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep partial line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullReply += delta;
                setMessages(prev => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last && last.role === "geo") {
                    last.content = fullReply;
                  }
                  return next;
                });
              }
            } catch (e) {
              console.warn("JSON Parse Error on line:", trimmed, e);
            }
          }
        }
      }

      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last) last.isStreaming = false;
        localStorage.setItem(`nova_msgs_${convId}`, JSON.stringify(next));
        return next;
      });

      apiHistory.current.push({ role: "assistant", content: fullReply });
      
      setConversations(prev => {
        const nextConvs = prev.map(c => c.id === convId ? { ...c, updated_at: new Date().toISOString() } : c);
        localStorage.setItem('nova_convs', JSON.stringify(nextConvs));
        return nextConvs;
      });

    } catch (e) {
      console.error("Détail de l'erreur :", e);
      setMessages(prev => [...prev, { role: "geo", content: `⚠️ Erreur: \`${e.message}\``, time: getTime() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeConv, pdfContext]);

  const onKey = e => { 
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      send(); 
    } 
  };

  return (
    <div className="app-container">
      {isMobile && sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {sidebarOpen && (
        <Sidebar conversations={conversations} activeId={activeConv?.id}
          onSelect={selectConv} onNew={newConversation} onLogout={logout}
          onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
      )}

      <div className="main-content">
        <nav className="navbar">
          <div className="nav-left">
            <button className="burger-menu" onClick={() => setSidebarOpen(v => !v)}>
              ☰
            </button>
            <div className="chat-title">
              {activeConv ? activeConv.title : "NOUVELLE CONVERSATION"}
            </div>
          </div>
          <div className="nav-right">
            {!isMobile && (
              <div className="act-indicator">
                <div className="pulse-dot" />ACTIF
              </div>
            )}
            <div onClick={() => setThinkMode(v => !v)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
              <div style={{ width: 28, height: 15, borderRadius: 8, background: thinkMode ? "var(--accent)" : "var(--border)", position: "relative", border: "1px solid var(--border)" }}>
                <div style={{ position: "absolute", top: 2, left: thinkMode ? 13 : 2, width: 9, height: 9, background: "#fff", borderRadius: "50%", transition: "left 0.25s" }} />
              </div>
            </div>
            <button onClick={() => setTheme(v => v === "dark" ? "light" : "dark")}
              style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </nav>


        <div ref={chatRef} className="chat-container">
          {messages.length === 0 ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, opacity: 0.35 }}>
              <AdinkraSVG color="var(--accent)" size={48} />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.25em", textAlign: "center", lineHeight: 2 }}>
                NOVA AI INITIALISÉ<br />PRÊT À T'AIDER DANS TES ÉTUDES
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => <MessageBubble key={i} msg={m} themeColors={THEMES[theme]} />)}
            </>
          )}
        </div>

        <div className="kente-divider" />

        <div className="input-section">
          <div className="quick-actions">
            {QUICK.map((q, i) => (
              <button key={i} className="quick-btn" onClick={() => setInput(q)}>
                {q}
              </button>
            ))}
          </div>

          {pdfContext && (
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10, background: "var(--surface2)", padding: "6px 12px", borderRadius: 4, width: "max-content", border: "1px solid var(--accent)" }}>
              📎 {pdfContext.name}
              <button onClick={() => setPdfContext(null)} style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontWeight: 700 }}>✕</button>
            </div>
          )}

          <div className="input-container-wrapper">
            <input type="file" ref={fileInputRef} hidden accept="application/pdf" onChange={handleFileUpload} />
            <button className="attach-btn" onClick={() => fileInputRef.current?.click()}>
              📎
            </button>
            <div className="input-box">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                placeholder="Pose ta question à NOVA AI..." maxLength={2000} rows={1} />
              <div className="input-footer">
                <span>{input.length}/2000</span>
                {!isMobile && <span>SHIFT+ENTRÉE = nouvelle ligne</span>}
              </div>
            </div>
            <button className="send-btn" onClick={send} disabled={loading || !input.trim()}>
              {isMobile ? "↑" : "ENVOYER →"}
            </button>
          </div>
          {!isMobile && (
            <div style={{ textAlign: "center", marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.15em" }}>
              ASSISTANT ÉTUDIANT GABONAIS © 2025
            </div>
          )}
        </div>
      </div>
    </div>
  );
}