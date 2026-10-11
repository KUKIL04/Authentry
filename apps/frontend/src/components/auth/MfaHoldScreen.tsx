import React, { useState, useEffect } from 'react';
import { AuthAPI } from '../../api/auth.api';
import { Smartphone, Mail, ArrowLeft, Loader2, ShieldCheck, Clock, RefreshCw } from 'lucide-react';

interface MfaHoldScreenProps {
  attemptId: string;
  challengeCode: string;
  initialExpiresIn?: number;
  onApproved: (response: any) => void;
  onDenied: (errorMessage: string) => void;
  onCancel: () => void;
}

export const MfaHoldScreen: React.FC<MfaHoldScreenProps> = ({
  attemptId,
  challengeCode,
  initialExpiresIn = 180,
  onApproved,
  onDenied,
  onCancel
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialExpiresIn);
  const [mode, setMode] = useState<'NUMBER_MATCH' | 'EMAIL_OTP'>('NUMBER_MATCH');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [fallbackError, setFallbackError] = useState('');

  // Keep latest callbacks in refs to prevent interval teardown on parent re-render
  const callbacksRef = React.useRef({ onApproved, onDenied, onCancel });
  useEffect(() => {
    callbacksRef.current = { onApproved, onDenied, onCancel };
  }, [onApproved, onDenied, onCancel]);

  // 1. Countdown Timer
  useEffect(() => {
    if (secondsLeft <= 0) {
      callbacksRef.current.onCancel();
      return;
    }
    const timer = setInterval(() => setSecondsLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  // 2. 2-Second Polling Loop for Push Approval / Denial
  useEffect(() => {
    if (mode !== 'NUMBER_MATCH') return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await AuthAPI.getMfaStatus(attemptId);
        if (res.user || res.requiresTenantSelection || res.redirectUrl) {
          clearInterval(pollInterval);
          callbacksRef.current.onApproved(res);
        }
      } catch (err: any) {
        const status = err.response?.status;
        const data = err.response?.data;

        if (status === 403 && data?.status === 'DENIED') {
          clearInterval(pollInterval);
          callbacksRef.current.onDenied(data.error || 'Login attempt was denied from your registered device.');
        } else if (status === 404) {
          clearInterval(pollInterval);
          callbacksRef.current.onCancel();
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [attemptId, mode]);

  const handleSwitchToEmailOtp = async () => {
    setFallbackError('');
    setIsSendingOtp(true);
    setMode('EMAIL_OTP'); // Stop polling immediately before network wait
    try {
      await AuthAPI.sendMfaEmailFallback(attemptId);
    } catch (err: any) {
      setFallbackError(err.response?.data?.error || 'Failed to dispatch fallback code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleBackToNumberMatch = async () => {
    setFallbackError('');
    try {
      await AuthAPI.resendMfaPush(attemptId);
    } catch {
      // Ignore error if push fails
    }
    setMode('NUMBER_MATCH');
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFallbackError('');
    setIsVerifyingOtp(true);
    try {
      // Immediately trigger status check to finalize cookies & session
      const finalRes = await AuthAPI.verifyMfaEmailFallback(attemptId, otp);
      onApproved(finalRes);
    } catch (err: any) {
      setFallbackError(err.response?.data?.error || 'Invalid verification code.');
      setIsVerifyingOtp(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 text-center py-4">
      {mode === 'NUMBER_MATCH' ? (
        <>
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold uppercase tracking-widest mb-6">
            <Smartphone className="w-3.5 h-3.5 animate-bounce" />
            <span>Check Your Registered Device</span>
          </div>

          {/* Glowing 2-Digit Number Circle */}
          <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
            <div 
              className="absolute inset-0 rounded-full animate-ping opacity-15" 
              style={{ backgroundColor: 'var(--theme-500, #e49b0f)' }}
            />
            <div className="w-full h-full rounded-full inner-depth bg-white border-4 border-slate-100 shadow-xl flex items-center justify-center relative z-10">
              <span 
                className="text-5xl font-black tracking-tighter font-mono"
                style={{ color: 'var(--theme-500, #e49b0f)' }}
              >
                {challengeCode}
              </span>
            </div>
          </div>

          <h3 className="text-lg font-extrabold text-slate-800 mb-2">
            Tap <span className="font-mono underline">{challengeCode}</span> on your device
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-sm mx-auto mb-6">
            We sent a push notification to your registered workspace devices. Tap the matching number to approve this sign-in.
          </p>

          {/* Timer & Polling Status */}
          <div className="flex items-center justify-center space-x-4 text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
            <span className="flex items-center">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-gamboge-500" />
              Awaiting Response
            </span>
            <span>•</span>
            <span className="flex items-center font-mono text-slate-600">
              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {formatTime(secondsLeft)}
            </span>
          </div>

          {fallbackError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold">
              {fallbackError}
            </div>
          )}

          <div className="space-y-3 pt-4 border-t border-slate-200/60">
            <button
              type="button"
              onClick={handleSwitchToEmailOtp}
              disabled={isSendingOtp}
              className="w-full py-3.5 px-4 bg-lightgray hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 shadow-inner border border-slate-200/60"
            >
              {isSendingOtp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4 text-gamboge-600" />
                  <span>Can't access device? Use Email Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-3 text-slate-400 hover:text-slate-700 font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel & Return to Login</span>
            </button>
          </div>
        </>
      ) : (
        /* EMAIL OTP FALLBACK VIEW */
        <form onSubmit={handleVerifyEmailOtp} className="space-y-5 text-left animate-in slide-in-from-right-4 duration-300">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-gamboge-600" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800">Email Verification</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Enter the 6-digit security code sent to your corporate email.
            </p>
          </div>

          {fallbackError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold text-center">
              {fallbackError}
            </div>
          )}

          <div>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="embossed-input w-full py-4 text-center text-2xl font-mono font-black tracking-[0.5em] text-slate-800 rounded-2xl outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isVerifyingOtp || otp.length < 6}
            className="shine-btn w-full py-4 text-white font-bold rounded-2xl text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center"
          >
            {isVerifyingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Authenticate'}
          </button>

          <button
            type="button"
            onClick={handleBackToNumberMatch}
            className="w-full py-2 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Number Match</span>
          </button>
        </form>
      )}
    </div>
  );
};