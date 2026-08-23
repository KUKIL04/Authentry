// apps/superadmin/src/pages/users/GlobalUsers.tsx
import React, { useState, useEffect } from 'react';
import { SuperAdminAPI } from '../../api/superadmin.api';
import { Users, Search, ShieldAlert, ShieldCheck, Loader2, Power, AlertTriangle } from 'lucide-react';

export default function GlobalUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CLEAR' | 'BLACKLISTED' | 'ORG_SUSPENDED'>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await SuperAdminAPI.Users.list();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch global users", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBlacklist = async (user: any) => {
    const isCurrentlyBlacklisted = user.is_blacklisted;
    
    let confirmMsg = isCurrentlyBlacklisted
      ? `Are you sure you want to RESTORE platform access for ${user.email}?`
      : `WARNING: Blacklisting ${user.email} will instantly terminate ALL active sessions across ALL tenants.`;

    if (user.has_local_suspensions && isCurrentlyBlacklisted) {
      confirmMsg += `\n\nNote: This user has local suspensions in specific organizations. Lifting the global blacklist will NOT un-suspend them from those tenants.`;
    }

    if (!window.confirm(confirmMsg)) return;

    setProcessingId(user.id);
    try {
      await SuperAdminAPI.Users.blacklist(user.id, !isCurrentlyBlacklisted);
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, is_blacklisted: !isCurrentlyBlacklisted } : u
      ));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to execute blacklist toggle');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'CLEAR') return matchesSearch && !u.is_blacklisted;
    if (activeFilter === 'BLACKLISTED') return matchesSearch && u.is_blacklisted;
    if (activeFilter === 'ORG_SUSPENDED') return matchesSearch && u.has_local_suspensions;
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Global Identity Matrix</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Manage global human identities, API usage, and platform-wide blacklists.
          </p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-1">
        {[
          { key: 'ALL', label: 'All Identities' },
          { key: 'CLEAR', label: 'Clear' },
          { key: 'BLACKLISTED', label: 'Global Blacklisted' },
          { key: 'ORG_SUSPENDED', label: 'Org Suspended' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as any)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${
              activeFilter === tab.key 
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
            <p className="text-xs font-bold uppercase tracking-widest">Scanning Identities...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 text-xs uppercase tracking-widest">
                  <th className="py-5 px-6 font-bold w-1/3">Identity</th>
                  <th className="py-5 px-6 font-bold">API Requests</th>
                  <th className="py-5 px-6 font-bold">Workspaces</th>
                  <th className="py-5 px-6 font-bold">Global Status</th>
                  <th className="py-5 px-6 font-bold text-right">Kill Switch</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-sm font-medium">
                      No identities match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mr-4 shrink-0">
                            <Users className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{user.first_name} {user.last_name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-mono text-xs font-bold text-slate-300">
                          {user.total_api_calls ? user.total_api_calls.toLocaleString() : 0} reqs
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            {user.workspace_count || 1} Workspace(s)
                          </span>
                          {user.has_local_suspensions && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950/60 text-amber-400 border border-amber-900/50" title="Suspended by an Organization Admin">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Org Suspended
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {!user.is_blacklisted ? (
                          <div className="flex items-center text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            <ShieldCheck className="w-4 h-4 mr-1.5" /> Clear
                          </div>
                        ) : (
                          <div className="flex items-center text-xs font-bold text-red-400 uppercase tracking-wider">
                            <ShieldAlert className="w-4 h-4 mr-1.5" /> Blacklisted
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={() => handleToggleBlacklist(user)}
                          disabled={processingId === user.id}
                          className={`p-2 rounded-xl border text-white font-bold transition-all disabled:opacity-50 ${
                            user.is_blacklisted 
                              ? 'bg-slate-800 border-slate-700 hover:bg-emerald-600' 
                              : 'bg-slate-950 border-slate-800 hover:bg-red-600'
                          }`}
                          title={user.is_blacklisted ? "Lift Blacklist" : "Execute Blacklist"}
                        >
                          {processingId === user.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Power className="w-5 h-5" />}
                        </button>
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