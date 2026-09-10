import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, ListChecks, Wallet, CalendarDays, Sparkles, Menu, LogOut, Search, Plus, Hexagon, ScanLine } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import QuickAdd from "./QuickAdd";
import GlobalSearch from "./GlobalSearch";

const nav = [
  { to: "/", label: "Home", icon: LayoutDashboard, testid: "nav-home" },
  { to: "/workspace", label: "Workspace", icon: ScanLine, testid: "nav-workspace", badge: "HARDENED" },
  { to: "/tasks", label: "Tasks", icon: ListChecks, testid: "nav-tasks" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, testid: "nav-calendar" },
  { to: "/money", label: "Money", icon: Wallet, testid: "nav-money" },
  { to: "/assistant", label: "Assistant", icon: Sparkles, testid: "nav-assistant" },
  { to: "/more", label: "More", icon: Menu, testid: "nav-more" },
];

const Sidebar = ({ user, onLogout }) => (
  <aside
    className="hidden md:flex flex-col w-[240px] shrink-0 border-r"
    style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
    data-testid="sidebar"
  >
    <div className="px-6 pt-7 pb-6 flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366F1,#10B981)" }}>
        <Hexagon size={16} className="text-white" />
      </div>
      <div className="font-display font-extrabold text-[17px] tracking-tight">LifeOS</div>
    </div>

    <nav className="px-3 flex flex-col gap-1">
      {nav.map(({ to, label, icon: Icon, testid, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          data-testid={testid}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-[rgba(99,102,241,0.15)] text-white border border-[rgba(99,102,241,0.35)]"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`
          }
        >
          <Icon size={16} />
          <span className="flex-1 truncate">{label}</span>
          {badge && (
            <span className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
              {badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>

    <div className="mt-auto p-4 border-t" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-3 px-2 py-2">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.name || "User"}
            className="w-9 h-9 rounded-full object-cover border border-slate-700"
          />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm" style={{ background: "#293449" }}>
            {user?.name?.[0] || user?.email?.[0] || "U"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold truncate">{user?.name || "LifeOS User"}</div>
          <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
        </div>
        <button
          onClick={onLogout}
          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
          title="Sign out"
          data-testid="logout-button"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  </aside>
);

const BottomNav = () => (
  <nav
    className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t"
    style={{ background: "rgba(14,19,31,0.95)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
    data-testid="bottom-nav"
  >
    <div className="grid grid-cols-7">
      {nav.map(({ to, label, icon: Icon, testid }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          data-testid={`${testid}-mobile`}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-2 text-[9px] font-medium transition-colors ${
              isActive ? "text-indigo-300" : "text-slate-500"
            }`
          }
        >
          <Icon size={16} />
          <span className="truncate max-w-[48px]">{label}</span>
        </NavLink>
      ))}
    </div>
  </nav>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [quickOpen, setQuickOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      <Sidebar user={user} onLogout={async () => { await logout(); navigate("/login"); }} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="sticky top-0 z-30 border-b flex items-center justify-between px-5 md:px-8 py-4"
          style={{ background: "rgba(11,15,23,0.85)", borderColor: "var(--border)", backdropFilter: "blur(10px)" }}
        >
          <div className="md:hidden flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366F1,#10B981)" }}>
              <Hexagon size={15} className="text-white" />
            </div>
            <div className="font-display font-extrabold text-[16px]">LifeOS</div>
          </div>

          <button
            className="hidden md:flex items-center gap-2 flex-1 max-w-md text-[13px] text-slate-400 border rounded-lg px-4 py-2 hover:text-white hover:border-slate-600 transition-colors"
            style={{ borderColor: "var(--border)", background: "rgba(18,24,36,0.5)" }}
            onClick={() => setSearchOpen(true)}
            data-testid="open-search-button"
          >
            <Search size={15} />
            <span>Search anything…</span>
            <kbd className="ml-auto font-mono text-[10px] px-1.5 py-0.5 border rounded" style={{ borderColor: "var(--border)" }}>⌘K</kbd>
          </button>

          <div className="flex items-center gap-2">
            <button
              className="md:hidden btn btn-ghost !p-2"
              onClick={() => setSearchOpen(true)}
              data-testid="open-search-button-mobile"
            >
              <Search size={17} />
            </button>
            <button
              className="btn btn-primary !py-2 !px-3 md:!px-4"
              onClick={() => setQuickOpen(true)}
              data-testid="quick-add-button"
            >
              <Plus size={15} />
              <span className="hidden md:inline">Quick add</span>
            </button>
          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
