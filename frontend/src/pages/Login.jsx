import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hexagon, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@lifeos.app");
  const [password, setPassword] = useState("lifeos123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) navigate("/");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" data-testid="login-page">
      <div className="relative hidden md:flex flex-col justify-between p-12 border-r overflow-hidden"
        style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
        <div
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(closest-side, #6366F1, transparent)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(closest-side, #10B981, transparent)" }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366F1,#10B981)" }}>
            <Hexagon size={18} className="text-white" />
          </div>
          <div className="font-display font-extrabold text-lg tracking-tight">LifeOS</div>
        </div>
        <div className="relative max-w-md">
          <div className="chip chip-primary mb-6">
            <Sparkles size={12} /> Your calm command center
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-[1.05]">
            The quiet operating system for a busy life.
          </h1>
          <p className="text-slate-400 mt-5 leading-relaxed text-[15px]">
            Tasks, bills, expenses, appointments, habits, and documents — unified in a single
            calm dashboard, with an AI assistant who actually knows your context.
          </p>
        </div>
        <div className="relative text-xs text-slate-500 font-mono tracking-wide">
          — Built for people who deserve a lighter mental load.
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 md:px-16 py-12">
        <div className="max-w-md w-full mx-auto">
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366F1,#10B981)" }}>
              <Hexagon size={18} className="text-white" />
            </div>
            <div className="font-display font-extrabold text-lg">LifeOS</div>
          </div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-2">Welcome back</div>
          <h2 className="font-display text-3xl font-bold">Sign in to continue.</h2>
          <p className="text-slate-400 mt-2 text-sm">A gentle nudge, then straight to what matters today.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                placeholder="you@lifeos.app"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-[13px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2" data-testid="login-error">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full justify-center" disabled={busy} data-testid="login-submit-button">
              {busy ? "Signing in…" : (<>Continue <ArrowRight size={15} /></>)}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-400">
            New here?{" "}
            <Link to="/register" className="text-indigo-300 hover:text-indigo-200 font-medium" data-testid="go-to-register">
              Create an account
            </Link>
          </div>

          <div className="mt-8 text-[11px] text-slate-500 font-mono tracking-wide">
            Demo: demo@lifeos.app / lifeos123
          </div>
        </div>
      </div>
    </div>
  );
}
