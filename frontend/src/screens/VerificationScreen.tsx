import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../api';
import { MailCheck } from 'lucide-react';

export default function VerificationScreen({ user, onVerified }: { user: any, onVerified: (user: any) => void }) {
  const [otp, setOtp] = useState('');
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // If not logged in, or already verified, redirect away
    if (!user) {
        navigate('/');
    } else if (user.status === 'ACTIVE' || user.email_verified) {
        navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setIsLoading(true);
    setAlert(null);

    try {
      await API.auth.verifyAccount({ otp });
      // On success, res gives a new token and a success message
      // Update the user passed to onVerified so App.tsx re-renders with ACTIVE status
      const updatedUser = { ...user, status: 'ACTIVE', email_verified: true };
      onVerified(updatedUser);
      navigate('/dashboard');
    } catch (err: any) {
      setAlert({ type: 'error', text: err.message || 'Verification failed. Please check your OTP.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setAlert(null);
    try {
      await API.auth.resendOtp();
      setAlert({ type: 'success', text: 'A new verification code has been sent to your email.' });
    } catch (err: any) {
      setAlert({ type: 'error', text: err.message || 'Failed to resend verification code.' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full h-full flex bg-[#10121b] text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 blur-[130px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 w-full h-full z-0"></div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6">
        <div className="bg-[#1a1c29] border border-white/5 rounded-3xl p-10 flex flex-col items-center shadow-2xl max-w-md w-full text-center">

          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(102,126,234,0.4)]">
             <MailCheck size={40} className="text-primary" />
          </div>

          <h1 className="text-3xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-gray-400 mb-8 text-sm">
            We've sent a 6-digit verification code to <span className="text-white font-medium">{user?.email}</span>. <br/>Enter it below to activate your account and start working out!
          </p>

          {alert && (
            <div className={`w-full p-3 rounded-lg text-sm mb-6 border ${
              alert.type === 'error'
                ? 'bg-red-500/20 text-red-200 border-red-500/30'
                : 'bg-green-500/20 text-green-200 border-green-500/30'
            }`}>
              {alert.text}
            </div>
          )}

          <form onSubmit={handleVerify} className="w-full flex flex-col gap-4">
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              className="w-full bg-[#151722] border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-primary transition text-center text-2xl font-mono tracking-widest"
              required
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
            />

            <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="w-full mt-4 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition p-4 rounded-xl font-bold disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>

          <div className="mt-8 text-sm text-gray-500">
             Didn't receive the email?
             <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="ml-2 text-primary hover:text-white transition font-semibold disabled:opacity-50"
             >
                {isResending ? 'Sending...' : 'Click to resend'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
