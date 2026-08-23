import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Send, KeyRound, AlertCircle } from 'lucide-react';

interface OtpActionInputProps {
  label: string;
  targetValue: string;
  onSendOtp: (target: string) => Promise<void>;
  onVerifyOtp: (target: string, otp: string) => Promise<boolean>;
  required?: boolean;
}

export function OtpActionInput({ label, targetValue, onSendOtp, onVerifyOtp }: OtpActionInputProps) {
  const [step, setStep] = useState<'IDLE' | 'SENT' | 'VERIFIED'>('IDLE');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSend = async () => {
    if (!targetValue) return;
    setIsLoading(true);
    setError('');
    try {
      await onSendOtp(targetValue);
      setStep('SENT');
      setTimeLeft(60);
    } catch (err) {
      setError('Failed to dispatch OTP. Check connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length < 4) return;
    setIsLoading(true);
    setError('');
    try {
      const success = await onVerifyOtp(targetValue, otp);
      if (success) {
        setStep('VERIFIED');
        setTimeLeft(0);
      } else {
        setError('Invalid or expired OTP code.');
      }
    } catch (err) {
      setError('Invalid or expired OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'VERIFIED') {
    return (
      <div className="flex items-center text-sm font-bold text-green-600 bg-green-50 px-4 py-3 rounded-xl border border-green-200 uppercase tracking-widest">
        <CheckCircle2 className="w-5 h-5 mr-2" /> Verified
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full">
        {step === 'IDLE' ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={!targetValue || isLoading}
            className="flex-1 shrink-0 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send OTP
          </button>
        ) : (
          <>
            <div className="relative flex-1 min-w-0">
              <KeyRound className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                maxLength={6}
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="embossed-input w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleVerify}
              disabled={otp.length < 4 || isLoading}
              className="shrink-0 bg-gamboge-600 hover:bg-gamboge-500 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Verify'}
            </button>
          </>
        )}
      </div>
      
      {/* INLINE ERROR MESSAGE */}
      {error && (
        <div className="mt-2 flex items-center text-[10px] font-bold text-red-500 uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-3 h-3 mr-1" /> {error}
        </div>
      )}

      {/* Resend Timer Logic */}
      {step === 'SENT' && (
        <div className="mt-3 text-right">
          {timeLeft > 0 ? (
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Resend in 00:{timeLeft.toString().padStart(2, '0')}
            </span>
          ) : (
            <button 
              type="button" 
              onClick={handleSend} 
              disabled={isLoading}
              className="text-xs font-bold text-gamboge-600 hover:text-gamboge-700 uppercase tracking-widest transition-colors"
            >
              Resend Code
            </button>
          )}
        </div>
      )}
    </div>
  );
}