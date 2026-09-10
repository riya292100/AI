import { useNavigate } from "react-router-dom";
import { ArrowUpRight, LockKeyhole, ScanLine, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { SectionLabel } from "./Sidebar";

export function LoginScreen({ onLogin, isLoading }) {
  const navigate = useNavigate();

  return (
    <main className="relative flex min-h-svh items-center overflow-hidden bg-[#0b0f17] px-6 py-12 text-slate-100">
      <div className="pointer-events-none absolute -right-32 -top-32 size-[500px] rounded-full border border-emerald-400/10 bg-emerald-400/[0.03] blur-3xl" />
      <div className="mx-auto grid w-full max-w-5xl gap-14 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="relative z-10" data-testid="login-introduction">
          <div className="mb-7 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-[#07110f]">
              <ScanLine className="size-5" />
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">LifeOS / secure workspace</span>
          </div>
          <h1 className="max-w-xl font-heading text-5xl font-bold leading-[1.02] tracking-tight text-slate-50 sm:text-6xl">
            A calmer operating system for your life.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-slate-400">
            Tasks, money, time, habits, and important documents — organized with privacy and control at the center.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
              <LockKeyhole className="size-3.5 text-emerald-300" /> HttpOnly sessions
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
              <ShieldCheck className="size-3.5 text-emerald-300" /> User-scoped data
            </span>
          </div>
        </section>

        <Card className="relative z-10 border-white/10 bg-[#131b2a] shadow-2xl shadow-black/30" data-testid="login-card">
          <CardHeader className="p-7 pb-4">
            <SectionLabel>Access protocol</SectionLabel>
            <CardTitle className="mt-3 font-heading text-2xl text-slate-50" data-testid="login-card-title">
              Enter your workspace
            </CardTitle>
            <p className="text-sm leading-relaxed text-slate-400" data-testid="login-card-description">
              Use the controlled local fallback to explore the hardened dashboard.
            </p>
          </CardHeader>
          <CardContent className="p-7 pt-4">
            <Button
              data-testid="auth-demo-login-button"
              onClick={onLogin}
              disabled={isLoading}
              className="h-12 w-full bg-emerald-400 font-semibold text-[#07110f] hover:bg-emerald-300 hover:text-[#07110f]"
            >
              {isLoading ? "Opening secure session…" : "Continue to demo workspace"}
              <ArrowUpRight className="ml-2 size-4" />
            </Button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4"
              >
                Or sign in with password / Google account
              </button>
            </div>
            <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600" data-testid="login-mocked-label">
              MOCKED AUTH · NO LIVE CREDENTIALS
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default LoginScreen;
