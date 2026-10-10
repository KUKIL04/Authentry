import React, { useState, useEffect } from 'react';
import { AdminAPI } from '../../api/admin.api';
import { Activity, Loader2, Search } from 'lucide-react';
import { UAParser } from 'ua-parser-js';

export default function SystemAudits() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await AdminAPI.getAuditLogs();
        setLogs(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch audit logs", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  // Omni-Search Engine for Audits
  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    
    if (log.event_type?.toLowerCase().includes(query)) return true;
    if (log.actor_email?.toLowerCase().includes(query)) return true;
    if (log.ip_address?.toLowerCase().includes(query)) return true;
    
    // Deep search inside the metadata JSON
    if (log.metadata) {
      return JSON.stringify(log.metadata).toLowerCase().includes(query);
    }
    
    return false;
  });

  return (
    <div className="w-full pb-12 relative">
      <div className="sticky top-0 z-40 px-4 sm:px-8 lg:px-12 py-4 lg:py-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm supports-[backdrop-filter]:bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">System Audits</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Immutable security logs and administrative actions.</p>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-12 mt-8 max-w-6xl mx-auto space-y-8">
        <div className="embossed-card p-4 sm:p-8 w-full">
          {/* DATA GRID TOOLBAR */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-700 flex items-center shrink-0">
              <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner shrink-0">
                <Activity className="w-5 h-5 text-gamboge-600" />
              </div>
              Recent Activity (Last 50 Events)
            </h2>
            
            {/* Omni-Search Input */}
            <div className="relative flex-1 w-full xl:max-w-md shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 shrink-0" />
              <input 
                type="text"
                placeholder="Search events, IPs, or metadata..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-gamboge-500 rounded-xl text-sm font-bold text-slate-700 outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 font-bold uppercase tracking-widest text-sm">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mr-3 shrink-0" /> Fetching Logs...
            </div>
          ) : (
            <div className="inner-depth p-1 rounded-2xl sm:rounded-3xl overflow-x-auto max-h-[600px] overflow-y-auto relative bg-slate-50/50 w-full">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 shadow-sm">
                  <tr className="text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                    <th className="py-3 sm:py-4 px-4 sm:px-6 font-bold border-b border-slate-300">Timestamp</th>
                    <th className="py-3 sm:py-4 px-4 sm:px-6 font-bold border-b border-slate-300">Event Type</th>
                    <th className="py-3 sm:py-4 px-4 sm:px-6 font-bold border-b border-slate-300">Actor</th>
                    <th className="py-3 sm:py-4 px-4 sm:px-6 font-bold border-b border-slate-300">Network & Device</th>
                    <th className="py-3 sm:py-4 px-4 sm:px-6 font-bold border-b border-slate-300">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 font-medium text-sm">No audit events match your search.</td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="border-b border-slate-300/50 hover:bg-slate-100 transition-colors">
                        <td className="py-4 sm:py-5 px-4 sm:px-6 text-[10px] sm:text-xs text-slate-500 font-bold whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-4 sm:py-5 px-4 sm:px-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-widest uppercase bg-lightgray text-gamboge-700 shadow-inner shrink-0">
                            {log.event_type}
                          </span>
                        </td>
                        <td className="py-4 sm:py-5 px-4 sm:px-6 text-xs sm:text-sm text-slate-700 font-bold whitespace-nowrap">
                          {log.actor_email || 'SYSTEM'}
                        </td>
                        <td className="py-4 sm:py-5 px-4 sm:px-6 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-slate-500 font-mono font-medium">
                            {log.ip_address || 'N/A'}
                          </div>
                          {log.user_agent && (
                            <div className="text-[12px] text-slate-500 mt-1 font-sans font-medium">
                              {(() => {
                                const parser = new UAParser(log.user_agent);
                                const browser = parser.getBrowser().name;
                                const os = parser.getOS().name;
                                if (!browser && !os) {
                                  return <span className="text-gamboge-600 font-bold">{log.user_agent}</span>;
                                }
                                
                                return `${browser || 'Unknown'} on ${os || 'Unknown'}`;
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="py-4 sm:py-5 px-4 sm:px-6">
                          <pre className="text-[9px] sm:text-[10px] text-slate-500 bg-slate-200/50 p-2 sm:p-3 rounded-lg overflow-x-auto max-w-[200px] sm:max-w-xs lg:max-w-sm font-mono border border-slate-300 shadow-inner block">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
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
    </div>
  );
}