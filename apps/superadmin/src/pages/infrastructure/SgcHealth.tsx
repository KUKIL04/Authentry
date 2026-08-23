import React, { useState, useEffect } from 'react';
import { SuperAdminAPI } from '../../api/superadmin.api';
import { 
  Activity, AlertTriangle, CheckCircle2, RefreshCw, 
  ServerCrash, Webhook, Zap, Clock, ShieldCheck, Terminal
} from 'lucide-react';

export default function SgcHealth() {
  const [syncData, setSyncData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchStatus = async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const data = await SuperAdminAPI.Infrastructure.getSyncStatus();
      setSyncData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch SGC status");
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  // Live Polling every 10 seconds!
  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(() => fetchStatus(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleTriggerSGC = async () => {
    setIsTriggering(true);
    try {
      const res = await SuperAdminAPI.Infrastructure.triggerGlobalSGC();
      notify('success', res.message || 'Mass sync dispatched to SGC Queue.');
      fetchStatus(false);
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'SGC Sync triggered too recently or failed.');
    } finally {
      setIsTriggering(false);
    }
  };

  if (isLoading && !syncData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Querying Global Matrix...</p>
      </div>
    );
  }

  const isWarning = syncData?.infrastructureWarning;

  // Group the flat dead letters array cleanly by App Name
  const groupedFailures = (syncData?.failedDeliveries || []).reduce((acc: any, curr: any) => {
    if (!acc[curr.app_name]) acc[curr.app_name] = [];
    acc[curr.app_name].push(curr);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-white">
      
      {/* HEADER & LIVE RADAR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Zap className="w-8 h-8 mr-3 text-indigo-500" /> SGC Health Pulse
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Monitor real-time webhook deliveries, dead-letter queues, and client infrastructure health.
          </p>
        </div>
        
        <div className="flex flex-col items-end">
          <div className={`flex items-center text-xs font-bold tracking-widest uppercase mb-2 ${isWarning ? 'text-red-400' : 'text-emerald-400'}`}>
            <span className="relative flex h-3 w-3 mr-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWarning ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isWarning ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
            </span>
            {isWarning ? 'System Degraded: Failures Detected' : 'All Client Systems Operational'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Last Pulse: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-950/50 text-red-400 border border-red-900' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900'}`}>
          {message.text}
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <Activity className="w-6 h-6 text-indigo-400 mb-4" />
          <h3 className="text-3xl font-black text-white">{syncData?.count || 0}</h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total System Discrepancies</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
          <ServerCrash className="w-6 h-6 text-red-400 mb-4" />
          <h3 className="text-3xl font-black text-white">{syncData?.details?.deadLetters || 0}</h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Dead-Letter Events (Webhooks)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-center">
          <button 
            onClick={handleTriggerSGC}
            disabled={isTriggering || syncData?.count === 0}
            className={`w-full py-4 rounded-2xl font-extrabold text-xs uppercase tracking-widest flex items-center justify-center transition-all ${
              syncData?.count === 0 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]'
            }`}
          >
            {isTriggering ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {isTriggering ? 'Executing...' : 'Force Mass Sync'}
          </button>
        </div>
      </div>

      {/* APP-WISE FAILURE BREAKDOWN */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center">
          <Webhook className="w-5 h-5 mr-3 text-indigo-400" /> App-Wise Dead-Letter Queue
        </h3>

        {Object.keys(groupedFailures).length === 0 ? (
          <div className="p-12 border border-dashed border-slate-800 rounded-3xl text-center text-slate-500 flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mb-3" />
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400/80">SGC Queue is Empty</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedFailures).map(appName => (
              <div key={appName} className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden">
                <div className="bg-slate-900/50 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center">
                    <Terminal className="w-4 h-4 text-indigo-400 mr-2" />
                    <h4 className="font-extrabold text-sm text-white uppercase tracking-widest">{appName}</h4>
                  </div>
                  <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    {groupedFailures[appName].length} Blocked
                  </span>
                </div>
                
                <div className="divide-y divide-slate-800/50">
                  {groupedFailures[appName].map((log: any) => (
                    <div key={log.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/30 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {log.status === 'FAILED' ? (
                            <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Dead Letter (Max Retries)
                            </span>
                          ) : (
                            <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              <Clock className="w-3 h-3 mr-1" /> Client Down (Retrying: {log.attempts}/3)
                            </span>
                          )}
                          <span className="text-xs font-mono text-indigo-400">{log.event_type}</span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 truncate mb-1">{log.endpoint_url}</p>
                        <p className="text-[9px] text-slate-600 font-mono">Occurred: {new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}