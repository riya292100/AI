import { useEffect, useState } from "react";
import "@/App.css";
import axios from "axios";
import { Activity, ArrowUp, Bot, Check, ChevronDown, Circle, ClipboardList, FileText, FolderKanban, Grid2X2, Hexagon, MessageSquare, MoreHorizontal, Paperclip, Plus, Search, Settings2, Sparkles, Target, Terminal, Zap } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const starterMessages = [{ id: "welcome", role: "assistant", content: "Good morning. I’m Nexus, your autonomous work agent. What should we move forward today?", created_at: new Date().toISOString() }];

const Home = () => {
  const [workspace, setWorkspace] = useState({ tasks: [], notes: [], messages: starterMessages, activity: [] });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeNav, setActiveNav] = useState("Mission control");

  useEffect(() => { axios.get(`${API}/workspace`).then(({ data }) => setWorkspace({ ...data, messages: data.messages.length ? data.messages : starterMessages })).catch(() => {}); }, []);

  const sendMessage = async (event) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending) return;
    setInput(""); setSending(true);
    setWorkspace((old) => ({ ...old, messages: [...old.messages, { id: `u-${Date.now()}`, role: "user", content: message }, { id: `a-${Date.now()}`, role: "assistant", content: "", streaming: true }] }));
    try {
      const response = await fetch(`${API}/chat/stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const chunks = buffer.split("\n\n"); buffer = chunks.pop(); chunks.forEach((chunk) => { if (!chunk.startsWith("data: ")) return; const data = JSON.parse(chunk.slice(6)); if (data.content) setWorkspace((old) => ({ ...old, messages: old.messages.map((item, index) => index === old.messages.length - 1 ? { ...item, content: item.content + data.content } : item) })); }); }
    } catch { setWorkspace((old) => ({ ...old, messages: old.messages.map((item, index) => index === old.messages.length - 1 ? { ...item, content: "I couldn’t reach the agent right now. Please try again." } : item) })); }
    setSending(false);
  };

  const addTask = async () => { const title = window.prompt("What should Nexus track?"); if (!title) return; const { data } = await axios.post(`${API}/tasks`, { title, priority: "medium" }); setWorkspace((old) => ({ ...old, tasks: [data, ...old.tasks] })); };
  const toggleTask = async (task) => { const status = task.status === "done" ? "queued" : "done"; await axios.patch(`${API}/tasks/${task.id}`, { status }); setWorkspace((old) => ({ ...old, tasks: old.tasks.map((item) => item.id === task.id ? { ...item, status } : item) })); };

  const navItems = [[Grid2X2, "Mission control"], [MessageSquare, "Conversations"], [FolderKanban, "Projects"], [ClipboardList, "Tasks"], [FileText, "Knowledge"]];
  return <div className="shell" data-testid="agent-workspace">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Hexagon size={19} /></div><span>NEXUS<span className="brand-dot">.</span>AI</span></div><div className="workspace-switcher" data-testid="workspace-switcher"><div className="workspace-avatar">W</div><div><strong>Wavelength</strong><small>Personal workspace</small></div><ChevronDown size={15} /></div><nav>{navItems.map(([Icon, label]) => <button data-testid={`nav-${label.toLowerCase().replaceAll(" ", "-")}`} className={activeNav === label ? "nav-item active" : "nav-item"} onClick={() => setActiveNav(label)} key={label}><Icon size={17} />{label}{label === "Tasks" && <span className="nav-count">{workspace.tasks.filter((task) => task.status !== "done").length || 3}</span>}</button>)}</nav><div className="sidebar-bottom"><button className="nav-item" data-testid="nav-settings"><Settings2 size={17} />Settings</button><div className="profile"><div className="profile-avatar">JD</div><div><strong>Jordan Davis</strong><small>Owner</small></div><MoreHorizontal size={16} /></div></div></aside>
    <main className="main-panel"><header className="topbar"><div><span className="eyebrow"><span className="live-dot" />LIVE WORKSPACE</span><h1>{activeNav}</h1></div><div className="top-actions"><button className="icon-button" data-testid="search-button"><Search size={18} /></button><button className="icon-button" data-testid="notifications-button"><Activity size={18} /></button><button className="primary-button" data-testid="new-task-button" onClick={addTask}><Plus size={16} />New task</button></div></header><section className="dashboard-grid"><div className="chat-column"><div className="section-heading"><div><span className="section-kicker">CONVERSATION</span><h2>Let’s make progress.</h2></div><button className="ghost-button" data-testid="model-selector"><Sparkles size={15} />Nexus / GPT-5.4 <ChevronDown size={13} /></button></div><div className="chat-feed" data-testid="chat-messages">{workspace.messages.map((message) => <div className={`message-row ${message.role}`} key={message.id}><div className="message-avatar">{message.role === "assistant" ? <Bot size={17} /> : "JD"}</div><div className="message-content"><div className="message-meta"><strong>{message.role === "assistant" ? "Nexus" : "You"}</strong><span>{message.role === "assistant" ? "Autonomous agent" : "Just now"}</span></div><p>{message.content}{message.streaming && sending && <span className="cursor" />}</p>{message.role === "assistant" && message.id !== "welcome" && message.content && <div className="message-tools"><button data-testid={`approve-message-${message.id}`}><Check size={14} />Looks good</button><button data-testid={`run-message-${message.id}`}><Zap size={14} />Run next step</button></div>}</div></div>)}</div><form className="composer" onSubmit={sendMessage} data-testid="chat-composer"><textarea data-testid="chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell Nexus what you want to accomplish..." rows="2" /><div className="composer-footer"><button type="button" className="icon-button subtle" data-testid="attach-button"><Paperclip size={17} /></button><span className="composer-hint">Nexus can plan, research, and organize work</span><button className="send-button" data-testid="send-message-button" disabled={sending || !input.trim()}><ArrowUp size={18} /></button></div></form></div>
    <aside className="inspector"><div className="inspector-head"><div><span className="section-kicker">ORCHESTRATION</span><h2>Today’s focus</h2></div><button className="icon-button" data-testid="inspector-menu"><MoreHorizontal size={18} /></button></div><div className="focus-card"><div className="focus-icon"><Target size={19} /></div><div><strong>Ship the Q2 launch plan</strong><p>3 steps · 68% complete</p></div><div className="progress-ring">68<span>%</span></div></div><div className="panel-section"><div className="panel-title"><span>UP NEXT</span><button data-testid="add-task-inline" onClick={addTask}><Plus size={15} /></button></div><div className="task-list">{workspace.tasks.slice(0, 4).map((task) => <button className={`task-row ${task.status === "done" ? "completed" : ""}`} key={task.id} onClick={() => toggleTask(task)} data-testid={`task-${task.id}`}><span className="task-check">{task.status === "done" && <Check size={12} />}</span><span className="task-title">{task.title}</span><span className={`priority ${task.priority}`}>{task.priority}</span></button>)}{!workspace.tasks.length && <div className="empty-state">No tasks yet — add one to start a plan.</div>}</div></div><div className="panel-section"><div className="panel-title"><span>LIVE SIGNALS</span><button data-testid="activity-filter"><Terminal size={14} /></button></div><div className="activity-list">{(workspace.activity.length ? workspace.activity : [{ label: "Workspace initialized", detail: "Ready for your first instruction", kind: "system" }]).slice(0, 4).map((item, index) => <div className="activity-row" key={item.id || index}><span className={`signal-icon ${item.kind}`}><Circle size={8} fill="currentColor" /></span><div><strong>{item.label}</strong><p>{item.detail}</p></div><time>{index === 0 ? "now" : `${index * 4}m`}</time></div>)}</div></div><div className="context-note" data-testid="context-note"><FileText size={16} /><div><strong>Context is ready</strong><p>Nexus has your workspace goals and recent activity in view.</p></div></div></aside></section></main>
  </div>;
};

function App() {
  return <Home />;
}

export default App;
