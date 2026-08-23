import React, { useState, useEffect } from 'react';
import { SuperAdminAPI } from '../../api/superadmin.api';
import { 
  Building2, Users, Activity, RefreshCw, 
  Server, ShieldCheck, Database, Zap, MailWarning
} from 'lucide-react';

interface PlatformStats {
  active_tenants: string | number;
  total_global_users: string | number;
  total_api_requests: string | number;
  telemetry?: {
    live_api_calls: number;
    live_errors: number;
    auth_latency_ms: number;
    email_provider_errors: number;
    db_query_count: number;
    db_last_latency_ms: number;
    db_slow_query_count: number;
  };
}

export default function PlatformOverview() {
  const [stats, setStats] = useState<PlatformStats>({ 
    active_tenants: 0, 
    total_global_users: 0, 
    total_api_requests: 0 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStats = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await SuperAdminAPI.Telemetry.getStats();
      setStats(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError('Failed to establish connection with telemetry server.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh telemetry every 10 seconds for real-time feel
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: string | number | undefined) => {
    if (num === undefined) return '0';
    const n = typeof num === 'string' ? parseInt(num, 10) : num;
    if (isNaN(n)) return '0';
    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(n);
  };

  const t = stats.telemetry;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Platform Overview</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Live telemetry and global resource consumption.
          </p>
        </div>
        
        <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <span className="relative flex h-2 w-2 mr-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          System Operational
        </div>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/50 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Primary Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Active Tenants */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors"></div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-4xl font-black text-white tracking-tight mb-1">
              {isLoading && !stats.active_tenants ? <span className="animate-pulse text-slate-700">--</span> : formatNumber(stats.active_tenants)}
            </h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Workspaces</p>
          </div>
        </div>

        {/* Global Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-4xl font-black text-white tracking-tight mb-1">
               {isLoading && !stats.total_global_users ? <span className="animate-pulse text-slate-700">--</span> : formatNumber(stats.total_global_users)}
            </h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Users</p>
          </div>
        </div>

        {/* API Requests */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors"></div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-4xl font-black text-white tracking-tight mb-1">
               {isLoading && !stats.total_api_requests ? <span className="animate-pulse text-slate-700">--</span> : formatNumber(stats.total_api_requests)}
            </h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cumulative API Calls</p>
          </div>
        </div>
      </div>

      {/* Live Infrastructure Health */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mt-8 relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Live Infrastructure Health</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Core services status and telemetry data.</p>
          </div>
          <button 
            onClick={fetchStats}
            disabled={isLoading}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white disabled:opacity-50"
            title="Force Sync"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* API Gateway */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/50 flex items-center">
             <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 mr-4 shrink-0">
               <Server className={`w-4 h-4 ${t?.live_errors && t.live_errors > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">API Gateway</p>
               <p className="text-sm font-bold text-white mt-0.5">
                 {t?.live_api_calls || 0} reqs / {t?.live_errors || 0} errs
               </p>
             </div>
          </div>

          {/* Database Health */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/50 flex items-center">
             <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 mr-4 shrink-0">
               <Database className={`w-4 h-4 ${t?.db_last_latency_ms && t.db_last_latency_ms > 100 ? 'text-amber-500' : 'text-emerald-500'}`} />
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Primary DB</p>
               <p className="text-sm font-bold text-white mt-0.5">
                 Latency: {t?.db_last_latency_ms || 0}ms
               </p>
             </div>
          </div>

          {/* Auth Engine (Crypto) */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/50 flex items-center">
             <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 mr-4 shrink-0">
               <ShieldCheck className={`w-4 h-4 ${t?.auth_latency_ms && t.auth_latency_ms > 200 ? 'text-red-500' : 'text-emerald-500'}`} />
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auth Engine</p>
               <p className="text-sm font-bold text-white mt-0.5">Hash Time: {t?.auth_latency_ms || 0}ms</p>
             </div>
          </div>

          {/* Email Provider */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/50 flex items-center">
             <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 mr-4 shrink-0">
               <MailWarning className={`w-4 h-4 ${t?.email_provider_errors && t.email_provider_errors > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SMTP Provider</p>
               <p className="text-sm font-bold text-white mt-0.5">
                 {t?.email_provider_errors || 0} Failed Dispatches
               </p>
             </div>
          </div>

        </div>
        
        {/* Warning Banner for Slow Queries */}
        {t?.db_slow_query_count && t.db_slow_query_count > 0 ? (
          <div className="mt-6 flex items-center bg-amber-950/60 border border-amber-900/50 rounded-xl p-3 px-4">
            <span className="flex h-2 w-2 relative mr-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <p className="text-xs font-bold text-amber-400 tracking-wide">
              {t.db_slow_query_count} queries have exceeded the 100ms execution threshold. Check DB streams.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end">
          <p className="text-[10px] font-mono text-slate-500 uppercase">
             Last synced: {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}