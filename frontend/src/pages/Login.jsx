import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hexagon, Sparkles, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

function GoogleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function Login() {
  const { login, loginWithGoogle, resetPassword, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@lifeos.app");
  const [password, setPassword] = useState("lifeos123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Forgot password state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState({ sent: false, error: "", loading: false });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) {
      navigate("/");
    } else {
      setError(res.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleBusy(true);
    setError("");
    const res = await loginWithGoogle();
    setGoogleBusy(false);
    if (res.ok) {
      navigate("/");
    } else {
      setError(res.error);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetStatus({ sent: false, error: "", loading: true });
    const res = await resetPassword(resetEmail);
    if (res.ok) {
      setResetStatus({ sent: true, error: "", loading: false });
    } else {
      setResetStatus({ sent: false, error: res.error, loading: false });
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" data-testid="login-page">
      {/* Left hero banner */}
      <div
        className="relative hidden md:flex flex-col justify-between p-12 border-r overflow-hidden"
        style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
      >
        <div
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(closest-side, #6366F1, transparent)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(closest-side, #10B981, transparent)" }}
        />
        <div className="relative flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#6366F1,#10B981)" }}
          >
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
            calm dashboard, authenticated securely via Firebase.
          </p>
        </div>
        <div className="relative text-xs text-slate-500 font-mono tracking-wide">
          — Built for people who deserve a lighter mental load.
        </div>
      </div>

      {/* Right sign in form */}
      <div className="flex flex-col justify-center px-6 md:px-16 py-12 bg-[#0b0f19]">
        <div className="max-w-md w-full mx-auto">
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#6366F1,#10B981)" }}
            >
              <Hexagon size={18} className="text-white" />
            </div>
            <div className="font-display font-extrabold text-lg">LifeOS</div>
          </div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-2">
            Welcome back
          </div>
          <h2 className="font-display text-3xl font-bold">Sign in to continue.</h2>
          <p className="text-slate-400 mt-2 text-sm">
            Authenticate securely with Firebase or your preferred account.
          </p>

          <div className="mt-8 space-y-4">
            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleBusy || busy}
              data-testid="google-signin-button"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-200 bg-[#171e2e] hover:bg-[#202a3f] border border-slate-700/60 transition-all duration-150 shadow-sm active:scale-[0.99] disabled:opacity-60"
            >
              <GoogleIcon className="w-4 h-4 flex-shrink-0" />
              <span>{googleBusy ? "Connecting with Google…" : "Continue with Google"}</span>
            </button>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-[#0b0f19] px-3 text-[10px] font-mono uppercase tracking-widest text-slate-500 whitespace-nowrap">
                or with email
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="login-email-input"
                  placeholder="you@lifeos.app"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0" htmlFor="login-password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setShowResetModal(true);
                      setResetStatus({ sent: false, error: "", loading: false });
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="input pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="login-password-input"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="text-[13px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 flex items-start gap-2"
                  data-testid="login-error"
                >
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full justify-center"
                disabled={busy || googleBusy}
                data-testid="login-submit-button"
              >
                {busy ? (
                  "Signing in…"
                ) : (
                  <>
                    Sign In <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 text-sm text-slate-400">
            New here?{" "}
            <Link
              to="/register"
              className="text-indigo-300 hover:text-indigo-200 font-medium"
              data-testid="go-to-register"
            >
              Create an account
            </Link>
          </div>

          <div className="mt-8 text-[11px] text-slate-500 font-mono tracking-wide flex items-center justify-between">
            <span>Demo: demo@lifeos.app / lifeos123</span>
            {isFirebaseConfigured ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Firebase Active
              </span>
            ) : (
              <span className="text-slate-500" title="Add REACT_APP_FIREBASE_API_KEY in frontend/.env to activate live Firebase">
                Demo Auth Mode
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card max-w-sm w-full p-6 space-y-4 border-slate-700/80 shadow-2xl">
            <h3 className="font-display text-lg font-bold">Reset Password</h3>
            <p className="text-xs text-slate-400">
              Enter your email address and we'll send a Firebase password reset link.
            </p>

            {resetStatus.sent ? (
              <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Password reset link sent! Check your inbox.</span>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="input text-sm"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
                {resetStatus.error && (
                  <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                    {resetStatus.error}
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="btn btn-secondary text-xs px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetStatus.loading}
                    className="btn btn-primary text-xs px-3 py-1.5"
                  >
                    {resetStatus.loading ? "Sending…" : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}

            {resetStatus.sent && (
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="btn btn-secondary w-full text-xs"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
