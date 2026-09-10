import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CircleDollarSign,
  FileLock2,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  ScanLine,
  ShieldCheck,
  Activity,
  X,
  ExternalLink,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";

export const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard-link", active: true, path: "/workspace" },
  { label: "Tasks", icon: FolderKanban, testId: "nav-tasks-link", active: false, path: "/tasks" },
  { label: "Finances", icon: CircleDollarSign, testId: "nav-finances-link", active: false, path: "/money" },
  { label: "Calendar", icon: CalendarDays, testId: "nav-calendar-link", active: false, path: "/calendar" },
  { label: "Documents", icon: FileLock2, testId: "nav-documents-link", active: false, path: "/more" },
  { label: "AI assistant", icon: MessageSquareText, testId: "nav-ai-assistant-link", active: false, path: "/assistant" },
  { label: "Security status", icon: ShieldCheck, testId: "nav-security-status-link", active: false, path: "#security" },
];

export function SectionLabel({ children }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{children}</p>;
}

export function Sidebar({ onClose }) {
  const navigate = useNavigate();

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#101723] px-5 py-6">
      <div className="mb-12 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" data-testid="brand-mark" onClick={() => navigate("/workspace")}>
          <div className="grid size-9 place-items-center rounded-xl bg-emerald-400 text-[#07110f] shadow-[0_0_24px_rgba(16,185,129,0.28)]">
            <ScanLine className="size-5" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold tracking-tight text-slate-100">LifeOS</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-400">private workspace</p>
          </div>
        </div>
        {onClose ? (
          <button
            data-testid="mobile-sidebar-close-button"
            className="text-slate-400 md:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <SectionLabel>Workspace</SectionLabel>
      <nav className="mt-4 space-y-1" aria-label="Primary navigation">
        {navItems.map(({ label, icon: Icon, testId, active, path }) => (
          <a
            href={path}
            key={label}
            data-testid={testId}
            onClick={(event) => {
              event.preventDefault();
              if (path.startsWith("/")) {
                navigate(path);
              } else if (path === "#security") {
                const el = document.querySelector('[data-testid="arch-status-banner"]');
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }
              if (onClose) onClose();
            }}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-transform duration-150 hover:translate-x-0.5 ${
              active ? "bg-emerald-400/10 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            <Icon className={`size-4 ${active ? "text-emerald-300" : "text-slate-500 group-hover:text-slate-300"}`} />
            <span>{label}</span>
            {active ? <span className="ml-auto size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]" /> : null}
          </a>
        ))}
      </nav>

      <div className="mt-6 pt-4 border-t border-white/5">
        <button
          onClick={() => navigate("/")}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"
        >
          <span>Switch to Full LifeOS</span>
          <ExternalLink className="size-3.5 text-slate-500" />
        </button>
      </div>

      <div className="mt-auto rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4" data-testid="mocked-integrations-notice">
        <div className="mb-3 flex items-center gap-2 text-amber-300">
          <Activity className="size-4" />
          <SectionLabel>Preview mode</SectionLabel>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          Identity and assistant providers are extension points in this preview.
        </p>
        <Badge variant="outline" className="mt-3 border-amber-400/30 font-mono text-[9px] uppercase tracking-[0.16em] text-amber-300">
          MOCKED
        </Badge>
      </div>
    </aside>
  );
}

export default Sidebar;
