import React, { useState, useEffect } from 'react';
import { SuperAdminAPI } from '../../api/superadmin.api';
import { Terminal, Trash2, AlertTriangle, Loader2, Database, Clock } from 'lucide-react';

export default function SystemTelemetry() {
  const [slowQueries, setSlowQueries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlushing, setIsFlushing] = useState(false);

  const fetchTelemetry = async () => {
    try {
      const data = await SuperAdminAPI.Telemetry.getSystemLogs();
      setSlowQueries(data.slowQueries || []);
    } catch (err) {
      console.error("Failed to fetch telemetry", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleFlush = async () => {
    if (!window.confirm("Are you sure you want to flush the slow query buffer? This action cannot be undone.")) return;
    
    setIsFlushing(true);
    try {
      await SuperAdminAPI.Telemetry.flushBuffer();
      setSlowQueries([]);
    } catch (err) {
      alert("Failed to flush telemetry cache.");
    } finally {
      setIsFlushing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Telemetry</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Live database query profiling and Redis stream inspection.
          </p>
        </div>
        
        <button 
          onClick={handleFlush}
          disabled={isFlushing}
          className="flex items-center text-xs font-bold text-red-600 hover:text-white uppercase tracking-widest bg-red-800/30 hover:bg-red-900 border border-red-900/50 hover:border-red-500 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
        >
          {isFlushing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
          Flush Buffer
        </button>
      </div>

      {/* Terminal View for Slow Queries */}
      <div className="bg-[#cfb384] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center">
          <Terminal className="w-4 h-4 text-slate-500 mr-2" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">telemetry:db:slow_queries (Buffer Limit: 50)</span>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
            <p className="text-xs font-bold uppercase tracking-widest">Tailing Redis Streams...</p>
          </div>
        ) : slowQueries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono">
            <Database className="w-8 h-8 mb-4 opacity-50" />
            <p className="text-sm">No slow queries detected in the current buffer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            <div className="space-y-3">
              {slowQueries.map((log, index) => (
                <div key={index} className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 font-mono text-sm relative group">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 break-all text-black leading-relaxed">
                      {log.query}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className="flex items-center text-amber-200 bg-amber-950/30 border border-amber-900/50 px-2.5 py-1 rounded-md text-xs font-bold">
                        <Clock className="w-3 h-3 mr-1.5" />
                        {log.durationMs}ms
                      </div>
                      <div className="text-[11px] text-slate-700">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}