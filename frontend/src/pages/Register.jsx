import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hexagon, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
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

export default function Register() {
  const { register, login, loginWithGoogle, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await register(email, password, name);
    setBusy(false);
    if (res.ok) {
      navigate("/");
    } else {
      setError(res.error);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleBusy(true);
    setError("");
    if (!isFirebaseConfigured) {
      const demoRes = await login("demo@lifeos.app", "lifeos123");
      setGoogleBusy(false);
      if (demoRes.ok) {
        navigate("/");
        return;
      }
    }
    const res = await loginWithGoogle();
    if (res.ok) {
      setGoogleBusy(false);
      navigate("/");
      return;
    }
    if (res.error && res.error.toLowerCase().includes("firebase is not configured")) {
      const demoRes = await login("demo@lifeos.app", "lifeos123");
      setGoogleBusy(false);
      if (demoRes.ok) {
        navigate("/");
        return;
      }
    }
    setGoogleBusy(false);
    setError(res.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-[#0b0f19]" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#6366F1,#10B981)" }}
          >
            <Hexagon size={18} className="text-white" />
          </div>
          <div className="font-display font-extrabold text-lg tracking-tight">LifeOS</div>
        </div>

        <div className="card p-7 shadow-xl border-slate-800">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-1">
            Create account
          </div>
          <h2 className="font-display text-2xl font-bold">Start feeling lighter today.</h2>
          <p className="text-slate-400 mt-2 text-sm">
            Sign up with Firebase or create an account below.
          </p>

          <div className="mt-6 space-y-4">
            {/* Google Sign Up */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleBusy || busy}
              data-testid="google-signup-button"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-200 bg-[#171e2e] hover:bg-[#202a3f] border border-slate-700/60 transition-all duration-150 shadow-sm active:scale-[0.99] disabled:opacity-60"
            >
              <GoogleIcon className="w-4 h-4 flex-shrink-0" />
              <span>
                {googleBusy
                  ? "Connecting with Google…"
                  : isFirebaseConfigured
                  ? "Sign up with Google"
                  : "Sign up with Google (Demo)"}
              </span>
            </button>

            {/* Divider */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-[#121824] px-3 text-[10px] font-mono uppercase tracking-widest text-slate-500 whitespace-nowrap">
                or with email
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label" htmlFor="register-name">
                  Name
                </label>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  data-testid="register-name-input"
                />
              </div>

              <div>
                <label className="label" htmlFor="register-email">
                  Email
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@lifeos.app"
                  data-testid="register-email-input"
                />
              </div>

              <div>
                <label className="label" htmlFor="register-password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="input pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    data-testid="register-password-input"
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
                  className="text-[13px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 flex flex-col gap-2"
                  data-testid="register-error"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                  {error.toLowerCase().includes("firebase") && (
                    <button
                      type="button"
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        const res = await login("demo@lifeos.app", "lifeos123");
                        setBusy(false);
                        if (res.ok) navigate("/");
                      }}
                      className="text-xs text-amber-300 hover:text-amber-200 underline font-medium self-start ml-6"
                    >
                      Sign in with Demo Account instead →
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full justify-center"
                disabled={busy || googleBusy}
                data-testid="register-submit-button"
              >
                {busy ? (
                  "Creating account…"
                ) : (
                  <>
                    Create Account <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 text-sm text-slate-400 text-center">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-indigo-300 hover:text-indigo-200 font-medium"
              data-testid="go-to-login"
            >
              Sign in
            </Link>
          </div>

          {isFirebaseConfigured && (
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-emerald-400 font-mono text-center flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Protected by Firebase Authentication
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
