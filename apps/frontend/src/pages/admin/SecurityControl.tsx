import React, { useState, useEffect } from 'react';
import { AdminAPI } from '../../api/admin.api';
import { useAuth } from '../../hooks/useAuth';
import { ShieldAlert, Loader2, PowerOff, Clock } from 'lucide-react';
import { UAParser } from 'ua-parser-js';

export default function SecurityControl() {
  const { user: currentUser } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const data = await AdminAPI.getActiveSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      notify('error', 'Failed to fetch active network sessions.');
    } finally {
      setIsLoading(false);
    }
  };

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleRevoke = async (tokenId: string) => {
    try {
      await AdminAPI.revokeSession(tokenId);
      notify('success', 'Session forcibly terminated.');
      setSessions(prev => prev.filter(s => s.id !== tokenId));
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to terminate session');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="w-full pb-12 relative">
      <div className="sticky top-0 z-40 px-4 sm:px-8 lg:px-12 py-4 lg:py-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm supports-[backdrop-filter]:bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Active Sessions</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Monitor active devices and force-logout compromised accounts.</p>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-12 mt-8 max-w-6xl mx-auto space-y-8">
        {message.text && (
          <div className={`px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <div className="embossed-card p-4 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-slate-700 mb-6 flex items-center">
            <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner shrink-0">
              <ShieldAlert className="w-5 h-5 text-gamboge-600" />
            </div>
            Live Network Tokens
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 font-bold uppercase tracking-widest text-sm">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mr-3 shrink-0" /> Scanning Network...
            </div>
          ) : (
            <div className="inner-depth p-1 rounded-2xl sm:rounded-3xl overflow-x-auto max-h-[600px] overflow-y-auto relative bg-slate-50/50 w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 shadow-sm">
                  <tr className="text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                    <th className="py-3 sm:py-4 px-4 sm:px-6 font-bold border-b border-slate-300">User</th>
                    <th className="py-3 sm:py-4 px-4 sm:px-6 font-bold border-b border-slate-300">Network & Device</th>
                    <th className="py-3 sm:py-4 px-4 sm:px-6 font-bold border-b border-slate-300">Session Created</th>
                    <th className="py-3 sm:py-4 px-4 sm:px-6 font-bold border-b border-slate-300">Token Expiry</th>
                    <th className="py-3 sm:py-4 px-4 sm:px-6 font-bold border-b border-slate-300 text-right">Kill Switch</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500 font-medium text-sm">No active sessions found on the network.</td>
                    </tr>
                  ) : (
                    sessions.map(session => {
                      const isSelf = session.email === currentUser?.email;

                      const parser = session.user_agent ? new UAParser(session.user_agent) : null;
                      const browser = parser ? parser.getBrowser().name || 'Unknown Browser' : 'Unknown Browser';
                      const os = parser ? parser.getOS().name || 'Unknown OS' : 'Unknown OS';

                      return (
                      <tr key={session.id} className="border-b border-slate-300/50 hover:bg-slate-100 transition-colors">
                        <td className="py-4 sm:py-5 px-4 sm:px-6 whitespace-nowrap">
                          <div className="font-bold text-slate-700 text-sm flex items-center">
                            {session.first_name} {session.last_name}
                            {isSelf && <span className="ml-2 bg-gamboge-100 text-gamboge-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest border border-gamboge-200 shadow-inner">You</span>}
                          </div>
                          <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1">{session.email}</div>
                        </td>
                        <td className="py-4 sm:py-5 px-4 sm:px-6 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-slate-500 font-mono font-medium">
                            {session.ip_address || 'IP Not Logged'}
                          </div>
                          {session.user_agent && (
                            <div className="text-[14px] text-slate-500 mt-1 font-sans font-medium">
                              {browser} on {os}
                            </div>
                          )}
                        </td>
                        <td className="py-4 sm:py-5 px-4 sm:px-6 text-xs sm:text-sm text-slate-600 font-medium whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-slate-400 shrink-0" />
                            {formatDate(session.created_at)}
                          </div>
                        </td>
                        <td className="py-4 sm:py-5 px-4 sm:px-6 text-xs sm:text-sm text-gamboge-700 font-mono font-bold whitespace-nowrap">
                          {formatDate(session.expires_at)}
                        </td>
                        <td className="py-4 sm:py-5 px-4 sm:px-6 text-right">
                          {isSelf ? (
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest px-3">Current Session</span>
                          ) : (
                            <button 
                              onClick={() => handleRevoke(session.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-sm font-bold py-2 px-3 sm:px-4 rounded-xl text-[10px] sm:text-xs uppercase tracking-widest transition-all inline-flex items-center ml-auto shrink-0 whitespace-nowrap"
                            >
                              <PowerOff className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" /> Kill Session
                            </button>
                          )}
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}