import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, User, Bot } from "lucide-react";
import api, { API } from "../lib/api";

const suggestions = [
  "What should I focus on today?",
  "Summarize my bills for next 7 days",
  "Give me a healthy weekly meal plan",
  "Help me prioritize my open tasks",
];

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/ai/messages"); setMessages(data); } catch {}
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const message = (text || input).trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);

    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: "user", content: message },
      { id: `a-${Date.now()}`, role: "assistant", content: "", streaming: true },
    ]);

    try {
      const token = localStorage.getItem("lifeos_token");
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(p.slice(6));
            if (ev.type === "delta" || ev.type === "error") {
              setMessages((m) => m.map((x, i) => i === m.length - 1 ? { ...x, content: x.content + (ev.content || "") } : x));
            }
          } catch {}
        }
      }
    } catch (e) {
      setMessages((m) => m.map((x, i) => i === m.length - 1 ? { ...x, content: "Assistant unavailable right now." } : x));
    } finally {
      setBusy(false);
      setMessages((m) => m.map((x, i) => i === m.length - 1 ? { ...x, streaming: false } : x));
    }
  };

  return (
    <div className="max-w-[900px] mx-auto p-5 md:p-8 flex flex-col h-[calc(100vh-80px)]" data-testid="assistant-page">
      <div className="mb-4">
        <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Assistant</div>
        <h1 className="font-display text-3xl font-bold mt-1">LifeOS · your quiet co-pilot.</h1>
        <p className="text-slate-400 mt-1 text-sm">Grounded in your actual tasks, bills, and calendar.</p>
      </div>

      <div className="flex-1 overflow-y-auto card p-5 space-y-6" data-testid="chat-log">
        {messages.length === 0 && (
          <div className="text-center max-w-md mx-auto py-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-300 mb-4">
              <Sparkles size={20} />
            </div>
            <div className="font-display font-bold text-lg">How can I help today?</div>
            <div className="text-sm text-slate-400 mt-1">Try one of these to get started.</div>
            <div className="mt-5 grid gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-lg border text-[13px] hover:border-indigo-500 hover:bg-indigo-500/5 transition-colors"
                  style={{ borderColor: "var(--border)" }}
                  data-testid="assistant-suggestion"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 rise ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.role === "assistant" ? "bg-indigo-500/15 text-indigo-300" : "bg-slate-500/20 text-slate-300"}`}>
              {m.role === "assistant" ? <Bot size={15} /> : <User size={15} />}
            </div>
            <div className={`max-w-[75%] ${m.role === "user" ? "text-right" : ""}`}>
              <div className={`inline-block text-[14px] leading-relaxed whitespace-pre-wrap px-4 py-3 rounded-2xl ${
                m.role === "assistant"
                  ? "bg-white/[0.03] text-slate-100 border"
                  : "bg-indigo-500/15 text-indigo-100 border border-indigo-500/30"
              }`} style={m.role === "assistant" ? { borderColor: "var(--border)" } : {}}>
                {m.content || (m.streaming && <span className="blink">▌</span>)}
                {m.streaming && m.content && <span className="blink">▌</span>}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-4 flex gap-2" data-testid="assistant-form">
        <input
          className="input flex-1"
          placeholder="Ask about your day, tasks, bills…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          data-testid="assistant-input"
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()} data-testid="assistant-send">
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}
