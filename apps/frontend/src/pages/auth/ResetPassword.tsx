import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { InputField } from '../../components/ui/InputField';
import { AuthAPI } from '../../api/auth.api';
import { Loader2, Lock, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetEmail = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // OTP Verification States
  const [currentOtp, setCurrentOtp] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Timer & Resend States
  const [timeLeft, setTimeLeft] = useState(60); // Starts at 60s assuming OTP was just sent
  const [isResending, setIsResending] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!targetEmail) setError('No email provided. Return to forgot password.');
  }, [targetEmail]);

  // Handle the Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0 || isOtpVerified) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isOtpVerified]);

  const handleVerifyOtp = async () => {
    if (currentOtp.length < 4) return;
    setIsVerifying(true);
    setError('');
    try {
      const response = await AuthAPI.verifyOtp(targetEmail, 'EMAIL', currentOtp);
      if (response.success) {
        setIsOtpVerified(true);
        setTimeLeft(0); // Clear timer on success
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    try {
      await AuthAPI.sendOtp(targetEmail, 'EMAIL');
      setTimeLeft(60); // Reset timer to 60s
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!isOtpVerified) {
      setError('You must verify the code before resetting.');
      return;
    }
    setIsLoading(true);
    try {
      // Pass the verified OTP to the final reset call
      await AuthAPI.resetPassword(targetEmail, currentOtp, newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password has been successfully reset. Please sign in.' } });
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <div className="max-w-[540px] w-full mx-auto text-center">
          <div className="inner-depth p-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">Update Successful</h2>
            <p className="text-sm text-slate-500">Redirecting to authentication node...</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="max-w-[540px] w-full mx-auto">
        <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-slate-700">Update Credentials</h2>
            <p className="text-sm text-slate-500 mt-1.5">Enter the security code sent to <strong className="text-slate-700">{targetEmail}</strong></p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm text-center font-semibold">
            {error}
          </div>
        )}

        <div className="inner-depth p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Custom Verification Block with Timer */}
            <div className="p-5 border border-slate-300/50 rounded-2xl bg-lightgray/50 mb-6">
              {!isOtpVerified ? (
                <>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Verification Code</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <KeyRound className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        value={currentOtp}
                        onChange={(e) => setCurrentOtp(e.target.value.replace(/\D/g, ''))}
                        className="embossed-input w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={currentOtp.length < 4 || isVerifying}
                      className="shrink-0 bg-gamboge-600 hover:bg-gamboge-500 text-white font-bold py-3 px-8 rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
                    </button>
                  </div>
                  
                  {/* Resend Timer Logic */}
                  <div className="mt-3 pr-1 text-right">
                    {timeLeft > 0 ? (
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Resend in 00:{timeLeft.toString().padStart(2, '0')}
                      </span>
                    ) : (
                      <button 
                        type="button" 
                        onClick={handleResendOtp} 
                        disabled={isResending}
                        className="text-xs font-bold text-gamboge-600 hover:text-gamboge-700 uppercase tracking-widest transition-colors disabled:opacity-50"
                      >
                        {isResending ? 'Sending...' : 'Resend Code'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center text-sm font-bold text-green-600 bg-green-50 px-4 py-4 rounded-xl border border-green-200 uppercase tracking-widest">
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Identity Verified
                </div>
              )}
            </div>

            <InputField label="New Password" type="password" name="newPassword" placeholder={!isOtpVerified ? "Verify code to unlock" : "••••••••"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={!isOtpVerified} required icon={<Lock />} />
            <InputField label="Confirm New Password" type="password" name="confirmPassword" placeholder={!isOtpVerified ? "Verify code to unlock" : "••••••••"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={!isOtpVerified} required icon={<Lock />} />

            <button type="submit" disabled={isLoading || !isOtpVerified || !newPassword} className="shine-btn w-full flex items-center justify-center space-x-2 py-4 text-white font-bold rounded-2xl text-sm tracking-widest uppercase mt-6 disabled:opacity-75">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Confirm New Password</span>}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center">
          <Link to="/login" className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center w-full space-x-1.5 uppercase tracking-widest">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel & Return</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}