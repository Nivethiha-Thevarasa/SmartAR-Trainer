import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../api';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginScreen({ onLogin }: { onLogin: (data: any) => void }) {
  const savedAuth = (() => {
    try {
      return JSON.parse(localStorage.getItem("auth") || "null");
    } catch {
      return null;
    }
  })();

  const [isLogin, setIsLogin] = useState(!savedAuth);
  const [email, setEmail] = useState(savedAuth?.email || '');
  const [password, setPassword] = useState(savedAuth?.password || '');
  const [name, setName] = useState(savedAuth?.name || '');
  const [confirmPassword, setConfirmPassword] = useState(savedAuth?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        const res = await API.auth.login({ email, password }) as any;
        onLogin(res.user);
        navigate('/dashboard');
      } else {
        if (password.length < 8) {
            setError("Password must be at least 8 characters long."); return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match"); return;
        }

        // Verify email uniqueness before continuing
        await API.auth.checkEmail({ email });

        // Store temporarily in LocalStorage so the Fitness Profile Form can access it
        // DO NOT call onLogin here, because the DB user has not actually been created yet.
        // Incomplete signups must not reach the dashboard.
        localStorage.setItem("auth", JSON.stringify({ email, name, password }));
        navigate('/fitness-form');
      }
    } catch (err: any) {
      // Backend returns a 400 with "Email already exists." if it matches
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="w-full h-full flex">
      {/* Background diagonal split */}
      <div className="absolute inset-0 bg-white w-[45%] h-full z-0 clip-diagonal shadow-2xl"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary w-full h-full z-[-1]"></div>

      {/* Content wrapper */}
      <div className="relative z-10 w-full h-full flex">
        {/* Left Side: Branding */}
        <div className="w-[45%] h-full flex flex-col items-center justify-center p-10">
          <div className="text-primary text-5xl font-bold mb-4 drop-shadow-lg">SmartAR Trainer</div>
          <div className="text-secondary text-xl font-semibold opacity-80">Your AI-Powered Fitness Coach</div>
          <img src="/logo.png" alt="Logo" className="mt-12 w-64 h-64 mix-blend-multiply opacity-90" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-[55%] h-full flex flex-col items-center justify-center p-20 text-white">
          <form className="glass-panel w-full max-w-md p-10 flex flex-col gap-6" onSubmit={handleAuth}>
            <div className="text-center mb-4">
              <h1 className="text-4xl font-bold mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
              <p className="text-textHint">{isLogin ? 'Login to your account' : 'Start your fitness journey'}</p>
            </div>

            {error && <div className="bg-red-500/20 text-red-200 p-3 rounded-lg text-sm text-center border border-red-500/30">{error}</div>}

            {!isLogin && (
              <input type="text" placeholder="Name" className="input-field" required value={name} onChange={e => setName(e.target.value)} />
            )}

            <input type="email" placeholder="Email Address" className="input-field" required value={email} onChange={e => setEmail(e.target.value)} />

            <div className="relative w-full flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="input-field pr-12 w-full"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-gray-400 hover:text-white transition cursor-pointer p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {!isLogin && (
              <div className="relative w-full flex items-center">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  className="input-field pr-12 w-full"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 text-gray-400 hover:text-white transition cursor-pointer p-1"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}

            <button type="submit" className="btn-outline mt-2 w-full">
              {isLogin ? 'SIGN IN' : 'CONTINUE'}
            </button>

            <div className="mt-4 flex flex-col items-center gap-2">
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-textHint hover:text-white underline text-sm transition-colors">
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .clip-diagonal { clip-path: polygon(0 0, 100% 0, 75% 100%, 0 100%); }
      `}</style>
    </div>
  );
}
