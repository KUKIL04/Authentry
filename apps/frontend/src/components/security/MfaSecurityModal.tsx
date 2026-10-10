import React, { useState, useEffect } from 'react';
import { AuthAPI } from '../../api/auth.api';
import { ShieldAlert, MapPin, Monitor, Globe, Ban, Loader2, CheckCircle2 } from 'lucide-react';

interface ActiveChallenge {
  attemptId: string;
  options: string[];
  device: string;
  location: string;
  ip: string;
}

export const MfaSecurityModal: React.FC = () => {
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<'APPROVED' | 'DENIED' | null>(null);

  // 1. Check for any pending challenge on mount (e.g. when user clicks notification body)
  useEffect(() => {
    AuthAPI.getActiveMfaChallenge()
      .then((res) => {
        if (res.activeChallenge) {
          setChallenge(res.activeChallenge);
          setFeedback(null);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Listen for Real-Time Service Worker Broadcasts (Instant popup & instant ghost-dismiss)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'MFA_CHALLENGE_RECEIVED' && data.challenge) {
        setChallenge(data.challenge);
        setFeedback(null);
      } else if (data.type === 'MFA_RESOLVED') {
        // Another device resolved it -> vanish immediately!
        setChallenge(null);
        setFeedback(null);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, []);

  if (!challenge) return null;

  const handleDecision = async (selectedCode?: string, decision: 'NUMBER_PICK' | 'DENY' = 'NUMBER_PICK') => {
    setIsSubmitting(true);
    try {
      const res = await AuthAPI.resolveMfaChallenge(challenge.attemptId, selectedCode, decision);
      setFeedback(res.status === 'APPROVED' ? 'APPROVED' : 'DENIED');
      setTimeout(() => {
        setChallenge(null);
        setFeedback(null);
      }, 1200);
    } catch (err) {
      setChallenge(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 relative">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-red-500 to-amber-500" />

        <div className="p-6 sm:p-8">
          {feedback ? (
            <div className="text-center py-8 animate-in zoom-in-95 duration-200">
              {feedback === 'APPROVED' ? (
                <>
                  <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-lg font-extrabold text-slate-800">Sign-In Approved</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">New device session authorized.</p>
                </>
              ) : (
                <>
                  <Ban className="w-14 h-14 text-red-500 mx-auto mb-3" />
                  <h3 className="text-lg font-extrabold text-slate-800">Sign-In Blocked</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">The unauthorized login attempt was terminated.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-3 mb-5">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-600 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">New Sign-In Attempt</h2>
                  <p className="text-xs font-semibold text-slate-500">Is this you trying to sign in right now?</p>
                </div>
              </div>

              {/* Telemetry Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 mb-6 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Monitor className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Device
                  </span>
                  <span className="font-bold text-slate-700">{challenge.device}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Location
                  </span>
                  <span className="font-bold text-slate-700">{challenge.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Globe className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> IP Address
                  </span>
                  <span className="font-mono font-bold text-slate-600">{challenge.ip}</span>
                </div>
              </div>

              {/* 4-Option Number Match Grid */}
              <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider text-center mb-3">
                Tap the number shown on your new login screen:
              </p>

              <div className="grid grid-cols-4 gap-3 mb-6">
                {challenge.options.map((num) => (
                  <button
                    key={num}
                    disabled={isSubmitting}
                    onClick={() => handleDecision(num, 'NUMBER_PICK')}
                    className="py-4 rounded-2xl bg-lightgray hover:bg-amber-500 hover:text-white text-slate-800 font-mono text-2xl font-black border border-slate-200/80 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Explicit Deny Kill-Switch */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision(undefined, 'DENY')}
                className="w-full py-3.5 px-4 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>No, It's Not Me — Deny Login</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};