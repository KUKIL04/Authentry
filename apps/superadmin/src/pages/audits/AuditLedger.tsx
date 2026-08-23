import React, { useState, useEffect } from 'react';
import { SuperAdminAPI } from '../../api/superadmin.api';
import { ShieldAlert, Server, Activity, Loader2, Key, Globe, Search } from 'lucide-react';

export default function AuditLedger() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await SuperAdminAPI.Telemetry.getAuditLogs();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch audit logs", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getActionIcon = (action: string) => {
    if (action.includes('FROZEN') || action.includes('BLACKLIST_APPLIED')) return <ShieldAlert className="w-4 h-4 text-red-500" />;
    if (action.includes('LOGIN')) return <Key className="w-4 h-4 text-blue-500" />;
    return <Activity className="w-4 h-4 text-emerald-500" />;
  };

  const formatActionName = (action: string) => {
    return action.replace(/_/g, ' ');
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (log.actor_email && log.actor_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Immutable Ledger</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Cryptographically secure record of all platform-level actions.
          </p>
        </div>
        
        <div className="relative w-full md:w-96">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Search className="w-5 h-5 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search events or actors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm placeholder:text-slate-600 font-mono"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
            <p className="text-xs font-bold uppercase tracking-widest">Decrypting Ledger...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-500 text-xs uppercase tracking-widest">
                  <th className="py-4 px-6 font-bold w-1/4">Timestamp (UTC)</th>
                  <th className="py-4 px-6 font-bold w-1/4">Actor</th>
                  <th className="py-4 px-6 font-bold w-1/3">Action & Target</th>
                  <th className="py-4 px-6 font-bold text-right">Network IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500 font-medium font-sans">
                      No records found in the ledger.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors group">
                      
                      {/* Timestamp */}
                      <td className="py-4 px-6 text-slate-400">
                        {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short', day: '2-digit', 
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </td>
                      
                      {/* Actor */}
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3 animate-pulse opacity-50"></div>
                          <div>
                            <div className="font-bold text-slate-400">{log.first_name} {log.last_name}</div>
                            <div className="text-[10px] text-slate-500">{log.actor_email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="mr-3 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                            {getActionIcon(log.action)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-300 tracking-tight">
                              {formatActionName(log.action)}
                            </span>
                            {log.target_tenant_id && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                TARGET: {log.target_tenant_id}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center text-slate-500 text-xs bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800/50">
                          <Globe className="w-3 h-3 mr-1.5 opacity-50" />
                          {log.ip_address}
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}