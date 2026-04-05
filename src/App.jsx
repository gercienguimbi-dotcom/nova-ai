import { useState, useRef, useEffect, useCallback } from "react";
// Supabase removed

const THEMES = {
  dark: {
    bg: "#05110a", surface: "#0a1c10", surface2: "#0f2b18",
    border: "#184426", accent: "#009e60", accent2: "#fcd116",
    accent3: "#3a75c4", text: "#ecf4f0", muted: "#457a59",
    inputBg: "#0a1c10"
  },
  light: {
    bg: "#f2f8f5", surface: "#e6f2eb", surface2: "#d2e8db",
    border: "#b8d9c6", accent: "#009e60", accent2: "#d9ae00",
    accent3: "#3a75c4", text: "#081c0f", muted: "#5c8c70",
    inputBg: "#e6f2eb"
  }
};

const SYSTEM_PROMPT = `Tu es NOVA AI, l'Assistant Étudiant Gabonais.
Tu as été conçu pour aider les étudiants dans leurs devoirs, fournir des explications claires, aider aux recherches et donner des conseils d'orientation scolaire.
ABSOLUTE RULE: Detect the language of the user's message and ALWAYS respond in that EXACT language. No exceptions.
Ton style: Pédagogique, encourageant, clair, et toujours prêt à aider à la réussite scolaire de l'étudiant.`;

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

function KenteDivider({ t }) {
  return <div style={{ height: 3, background: `repeating-linear-gradient(90deg,${t.accent} 0,${t.accent} 20px,${t.accent2} 20px,${t.accent2} 40px,${t.accent3} 40px,${t.accent3} 60px,${t.bg} 60px,${t.bg} 80px)`, opacity: 0.7, flexShrink: 0 }} />;
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

function CodeBlock({ code, lang, t }) {
  const [copied, setCopied] = useState(false);
  let html = code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, m => `<span style="color:#7dba6a">${m}</span>`)
    .replace(/(#.*$|\/\/.*$)/gm, m => `<span style="color:#6b7a5a;font-style:italic">${m}</span>`)
    .replace(/\b(def|class|import|from|return|if|else|elif|for|while|in|not|and|or|True|False|None|async|await|try|except|const|let|var|function|new|this)\b/g, m => `<span style="color:${t.accent2};font-weight:600">${m}</span>`)
    .replace(/\b(\d+\.?\d*)\b/g, m => `<span style="color:${t.accent}">${m}</span>`);
  return (
    <div style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 6, margin: "10px 0", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderBottom: `1px solid ${t.border}`, background: t.surface }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.accent, letterSpacing: "0.15em" }}>{lang || "code"}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 8px", color: copied ? t.accent3 : t.muted, cursor: "pointer", fontSize: 10, fontFamily: "'DM Mono',monospace", transition: "all 0.2s" }}>
          {copied ? "✓ COPIÉ" : "COPIER"}
        </button>
      </div>
      <pre style={{ padding: "12px 14px", overflowX: "auto", fontFamily: "'DM Mono',monospace", fontSize: 12, lineHeight: 1.7, color: t.text }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function MessageBubble({ msg, t }) {
  const isGeo = msg.role === "geo";
  const parts = [];
  const codeRx = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = codeRx.exec(msg.content)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: msg.content.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1], content: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < msg.content.length) parts.push({ type: "text", content: msg.content.slice(last) });
  const fmt = txt => txt
    .replace(/\*\*([^*]+)\*\*/g, `<strong style="color:${t.accent2}">$1</strong>`)
    .replace(/`([^`]+)`/g, `<code style="font-family:'DM Mono',monospace;font-size:11px;background:${t.surface2};padding:2px 5px;border-radius:3px;color:${t.accent}">\$1</code>`)
    .replace(/\n/g, "<br/>");
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 24, flexDirection: isGeo ? "row" : "row-reverse" }}>
      <div style={{ width: 36, height: 36, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isGeo ? t.surface2 : t.surface, border: `1px solid ${t.border}` }}>
        {isGeo ? <AdinkraSVG color={t.accent} size={20} /> : <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700, color: t.muted }}>YOU</span>}
      </div>
      <div style={{ maxWidth: "78%", minWidth: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexDirection: isGeo ? "row" : "row-reverse" }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: isGeo ? t.accent : t.accent3, letterSpacing: "0.15em" }}>{isGeo ? "NOVA AI" : "VOUS"}</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.muted }}>{msg.time}</span>
        </div>
        <div style={{ padding: "12px 16px", background: isGeo ? t.surface : t.surface2, border: `1px solid ${t.border}`, borderLeft: isGeo ? `3px solid ${t.accent}` : `1px solid ${t.border}`, borderRight: isGeo ? `1px solid ${t.border}` : `3px solid ${t.accent3}`, borderRadius: 4, fontSize: 14, lineHeight: 1.8, color: t.text, fontFamily: "'DM Mono',monospace" }}>
          {parts.map((p, i) => p.type === "code" ? <CodeBlock key={i} code={p.content} lang={p.lang} t={t} /> : <span key={i} dangerouslySetInnerHTML={{ __html: fmt(p.content) }} />)}
        </div>
      </div>
    </div>
  );
}

function TypingBubble({ t }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 22 }}>
      <div style={{ width: 36, height: 36, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: t.surface2, border: `1px solid ${t.border}` }}>
        <AdinkraSVG color={t.accent} size={20} />
      </div>
      <div style={{ padding: "12px 16px", background: t.surface, border: `1px solid ${t.border}`, borderLeft: `3px solid ${t.accent}`, borderRadius: 4, display: "flex", alignItems: "center", gap: 5 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent, animation: `tdot 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
      </div>
    </div>
  );
}

function ThinkPanel({ steps, active, t }) {
  if (!active && steps.length === 0) return null;
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderLeft: `3px solid ${t.accent2}`, borderRadius: 4, padding: "12px 16px", marginBottom: 12, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.accent2, letterSpacing: "0.2em" }}>
        {active && <div style={{ width: 8, height: 8, border: `1.5px solid ${t.accent2}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
        RÉFLEXION — NOVA AI
      </div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, lineHeight: 1.9 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, color: i === steps.length - 1 && active ? t.accent : t.muted }}>
            <span>{i === steps.length - 1 && active ? "▶" : "✓"}</span><span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// AuthScreen removed

function Sidebar({ t, conversations, activeId, onSelect, onNew, onLogout, user, onClose, isMobile }) {
  return (
    <div style={{
      width: 240, background: t.surface, borderRight: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column", flexShrink: 0,
      position: isMobile ? "fixed" : "relative",
      top: isMobile ? 0 : "auto", left: isMobile ? 0 : "auto",
      height: isMobile ? "100dvh" : "auto",
      zIndex: isMobile ? 100 : "auto",
      boxShadow: isMobile ? `4px 0 20px rgba(0,0,0,0.5)` : "none"
    }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AdinkraSVG color={t.accent} size={20} />
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: t.text }}>NOVA <span style={{ color: t.accent }}>AI</span></span>
          </div>
          {isMobile && (
            <button onClick={onClose} style={{ background: "none", border: "none", color: t.muted, cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
          )}
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.muted, letterSpacing: "0.1em", marginBottom: 10 }}>Étudiant</div>
        <button onClick={onNew}
          style={{ width: "100%", padding: "8px", background: "none", border: `1px solid ${t.accent}`, color: t.accent, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s" }}>
          + NOUVELLE CONVERSATION
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {conversations.length === 0 ? (
          <div style={{ padding: "16px", fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.muted, textAlign: "center" }}>Aucune conversation</div>
        ) : conversations.map(c => (
          <div key={c.id} onClick={() => { onSelect(c); if (isMobile) onClose(); }}
            style={{ padding: "10px 16px", cursor: "pointer", background: activeId === c.id ? t.surface2 : "none", borderLeft: activeId === c.id ? `3px solid ${t.accent}` : "3px solid transparent", transition: "all 0.2s" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: activeId === c.id ? t.text : t.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.muted, marginTop: 3 }}>{new Date(c.updated_at).toLocaleDateString("fr-FR")}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${t.border}` }}>
        <button onClick={onLogout}
          style={{ width: "100%", padding: "8px", background: "none", border: `1px solid ${t.border}`, color: t.muted, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.1em", cursor: "pointer", transition: "all 0.2s" }}>
          EFFACER L'HISTORIQUE
        </button>
      </div>
    </div>
  );
}

export default function NovaAI() {
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState({ id: "local" });
  const [authLoading, setAuthLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfContext, setPdfContext] = useState(null);
  const [thinkMode, setThinkMode] = useState(true);
  const fileInputRef = useRef(null);
  const [thinkSteps, setThinkSteps] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const chatRef = useRef(null);
  const apiHistory = useRef([]);
  const t = THEMES[theme];

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

  const selectConv = (conv) => { setActiveConv(conv); loadMessages(conv.id); };

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
  }, [messages, thinkSteps, thinking]);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const getTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:3001/api/upload-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) {
        setPdfContext({ name: file.name, text: data.text });
      } else {
        alert("Erreur PDF: " + data.error);
      }
    } catch (err) {
      alert("Erreur serveur lors de la lecture du PDF !");
    }
    setLoading(false);
    e.target.value = "";
  };

  const runThinking = async () => {
    setThinking(true); setThinkSteps([]);
    for (const step of THINK_STEPS) { await sleep(200); setThinkSteps(prev => [...prev, step]); }
    await sleep(200); setThinking(false);
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
      setPdfContext(null);
    }
    
    setMessages(prev => {
      const nextMsgsUser = [...prev, userMsg];
      localStorage.setItem(`nova_msgs_${convId}`, JSON.stringify(nextMsgsUser));
      return nextMsgsUser;
    });

    apiHistory.current.push({ role: "user", content: finalPrompt });

    if (thinkMode) await runThinking();
    setThinkSteps([]);

    const lang = detectLang(text);
    const dynamicPrompt = SYSTEM_PROMPT + `\n\nThe user's message language is: ${lang}. You MUST respond in ${lang} only.`;

    try {
      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "system", content: dynamicPrompt }, ...apiHistory.current] })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Erreur de réponse.";
      apiHistory.current.push({ role: "assistant", content: reply });
      
      const replyMsg = { role: "geo", content: reply, time: getTime() };
      setMessages(prev => {
        const nextMsgsSys = [...prev, replyMsg];
        localStorage.setItem(`nova_msgs_${convId}`, JSON.stringify(nextMsgsSys));
        return nextMsgsSys;
      });

      setConversations(prev => {
        const nextConvs = prev.map(c => c.id === convId ? { ...c, updated_at: new Date().toISOString() } : c);
        localStorage.setItem('nova_convs', JSON.stringify(nextConvs));
        return nextConvs;
      });
    } catch (e) {
      setMessages(prev => [...prev, { role: "geo", content: `⚠️ Erreur: \`${e.message}\``, time: getTime() }]);
    }
    setLoading(false);
  }, [input, loading, thinkMode, activeConv, user]);

  const onKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  if (authLoading) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: t.bg, color: t.text, fontFamily: "'Syne',sans-serif", display: "flex", flexDirection: "row", transition: "background 0.4s, color 0.4s", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes tdot { 0%,60%,100%{transform:translateY(0);opacity:.3} 30%{transform:translateY(-4px);opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:${t.border};border-radius:2px}
        textarea { font-family: 'DM Mono', monospace !important; }
        .qbtn:hover { border-color: ${t.accent} !important; color: ${t.accent} !important; }
        .sbtn:hover { background: ${t.accent} !important; color: ${t.bg} !important; }
        .sbtn:disabled { opacity: 0.3; cursor: not-allowed; }
        img { max-width: 100%; height: auto; border-radius: 4px; }
      `}</style>

      {/* Overlay mobile */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar t={t} conversations={conversations} activeId={activeConv?.id}
          onSelect={selectConv} onNew={newConversation} onLogout={logout}
          user={user} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <nav style={{ padding: "0.9rem 1rem", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: t.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Burger button */}
            <button onClick={() => setSidebarOpen(v => !v)}
              style={{ background: "none", border: `1px solid ${t.border}`, color: t.muted, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, flexShrink: 0 }}>
              ☰
            </button>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.muted, letterSpacing: "0.15em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 140 : 300 }}>
              {activeConv ? activeConv.title : "NOUVELLE CONVERSATION"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.accent3 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent3, animation: "blink 2s infinite" }} />ACTIF
              </div>
            )}
            <div onClick={() => setThinkMode(v => !v)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", userSelect: "none" }}>
              <div style={{ width: 28, height: 15, borderRadius: 8, background: thinkMode ? t.accent : t.border, position: "relative", transition: "background 0.25s", border: `1px solid ${t.border}` }}>
                <div style={{ position: "absolute", top: 2, left: thinkMode ? 13 : 2, width: 9, height: 9, background: "#fff", borderRadius: "50%", transition: "left 0.25s" }} />
              </div>
              {!isMobile && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: thinkMode ? t.accent : t.muted, letterSpacing: "0.1em" }}>THINKING</span>}
            </div>
            <button onClick={() => setTheme(v => v === "dark" ? "light" : "dark")}
              style={{ background: "none", border: `1px solid ${t.border}`, color: t.muted, width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </nav>

        <KenteDivider t={t} />

        {(thinking || thinkSteps.length > 0) && (
          <div style={{ padding: "0 1rem" }}><div style={{ paddingTop: 10 }}><ThinkPanel steps={thinkSteps} active={thinking} t={t} /></div></div>
        )}

        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "1rem", minHeight: 0 }}>
          {messages.length === 0 ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, opacity: 0.35 }}>
              <AdinkraSVG color={t.accent} size={48} />
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.muted, letterSpacing: "0.25em", textAlign: "center", lineHeight: 2 }}>
                NOVA AI INITIALISÉ<br />PRÊT À T'AIDER DANS TES ÉTUDES
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => <MessageBubble key={i} msg={m} t={t} />)}
              {loading && !thinking && <TypingBubble t={t} />}
            </>
          )}
        </div>

        <KenteDivider t={t} />

        <div style={{ padding: "0.8rem 1rem", flexShrink: 0, background: t.bg }}>
          <div style={{ display: "flex", flexWrap: isMobile ? "nowrap" : "wrap", overflowX: isMobile ? "auto" : "visible", gap: 6, marginBottom: 10, paddingBottom: isMobile ? 8 : 0 }}>
            {QUICK.map((q, i) => (
              <button key={i} className="qbtn" onClick={() => setInput(q)}
                style={{ flexShrink: 0, background: "none", border: `1px solid ${t.border}`, borderRadius: 0, padding: isMobile ? "8px 16px" : "4px 12px", fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.muted, cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.05em" }}>
                {q}
              </button>
            ))}
          </div>
          {pdfContext && (
            <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Mono',monospace", fontSize: 10, background: t.surface2, padding: "4px 8px", borderRadius: 4, width: "max-content", border: `1px solid ${t.accent}` }}>
              📎 {pdfContext.name}
              <button onClick={() => setPdfContext(null)} style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", padding: "0 4px" }}>✕</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <input type="file" ref={fileInputRef} hidden accept="application/pdf" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()}
              style={{ width: 52, height: 52, background: t.surface2, border: `1px solid ${t.border}`, color: t.accent, cursor: "pointer", transition: "all 0.2s", borderRadius: 0, fontSize: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              📎
            </button>
            <div style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.border}`, borderLeft: `3px solid ${t.accent}`, padding: "10px 14px" }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                placeholder="Pose ta question à NOVA AI..." maxLength={2000} rows={1}
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: t.text, fontSize: 13, resize: "none", lineHeight: 1.6, maxHeight: 100, overflowY: "auto" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.muted }}>{input.length}/2000</span>
                {!isMobile && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.muted }}>SHIFT+ENTRÉE = nouvelle ligne</span>}
              </div>
            </div>
            <button className="sbtn" onClick={send} disabled={loading || !input.trim()}
              style={{ padding: "0 16px", height: 52, background: "none", border: `1px solid ${t.accent}`, color: t.accent, fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 18 : 11, letterSpacing: "0.15em", cursor: "pointer", transition: "all 0.2s", borderRadius: 0 }}>
              {isMobile ? "↑" : "ENVOYER →"}
            </button>
          </div>
          {!isMobile && (
            <div style={{ textAlign: "center", marginTop: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: t.muted, letterSpacing: "0.15em" }}>
              POWERED BY <span style={{ color: t.accent }}>NOVA AI</span> — ASSISTANT ÉTUDIANT GABONAIS © 2025
            </div>
          )}
        </div>
      </div>
    </div>
  );
}