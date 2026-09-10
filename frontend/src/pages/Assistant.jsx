import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, User, Bot } from "lucide-react";
import { toast } from "sonner";
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
      try {
        const { data } = await api.get("/ai/messages");
        setMessages(data || []);
      } catch (err) {
        console.error("Failed to load past chat messages:", err);
      }
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

      if (!res.ok) {
        throw new Error(`Chat request returned status ${res.status}`);
      }

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
              setMessages((m) =>
                m.map((x, i) =>
                  i === m.length - 1 ? { ...x, content: x.content + (ev.content || "") } : x
                )
              );
            }
          } catch (parseErr) {
            console.warn("Could not parse SSE payload chunk:", parseErr);
          }
        }
      }
    } catch (e) {
      console.error("Assistant chat error:", e);
      toast.error("Could not complete response with assistant");
      setMessages((m) =>
        m.map((x, i) =>
          i === m.length - 1
            ? { ...x, content: "The assistant is temporarily unavailable. Please try again." }
            : x
        )
      );
    } finally {
      setBusy(false);
      setMessages((m) =>
        m.map((x, i) => (i === m.length - 1 ? { ...x, streaming: false } : x))
      );
    }
  };

  return (
    <div
      className="max-w-[900px] mx-auto p-5 md:p-8 flex flex-col h-[calc(100vh-80px)]"
      data-testid="assistant-page"
    >
      <div className="mb-4">
        <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
          Assistant
        </div>
        <h1 className="font-display text-3xl font-bold mt-1">LifeOS · your quiet co-pilot.</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Grounded in your actual tasks, bills, and calendar.
        </p>
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
              {suggestions.map((s, idx) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  data-testid={`chat-suggestion-${idx}`}
                  className="text-left px-4 py-3 rounded-lg border text-[13px] hover:border-indigo-500 hover:bg-indigo-500/5 transition-colors"
                  style={{ borderColor: "var(--border)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role !== "user" && (
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
            )}
            <div
              className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.streaming && (
                <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-1 animate-pulse" />
              )}
            </div>
            {m.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-4 flex gap-2"
        data-testid="chat-form"
      >
        <input
          className="input flex-1"
          placeholder="Ask LifeOS anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          data-testid="chat-input"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !input.trim()}
          data-testid="chat-submit"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
