import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hexagon, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await register(email, password, name);
    setBusy(false);
    if (res.ok) navigate("/");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366F1,#10B981)" }}>
            <Hexagon size={18} className="text-white" />
          </div>
          <div className="font-display font-extrabold text-lg tracking-tight">LifeOS</div>
        </div>

        <div className="card p-7">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-1">Create account</div>
          <h2 className="font-display text-2xl font-bold">Start feeling lighter today.</h2>
          <p className="text-slate-400 mt-2 text-sm">A private space for the things running through your head.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" data-testid="register-name-input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="register-email-input" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="register-password-input" />
            </div>
            {error && (
              <div className="text-[13px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2" data-testid="register-error">
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full justify-center" disabled={busy} data-testid="register-submit-button">
              {busy ? "Creating…" : (<>Create account <ArrowRight size={15} /></>)}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-400 text-center">
            Already have one?{" "}
            <Link to="/login" className="text-indigo-300 hover:text-indigo-200 font-medium" data-testid="go-to-login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
