// apps/superadmin/src/pages/tenants/TenantList.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SuperAdminAPI } from '../../api/superadmin.api';
import type { TenantStatus } from '@idp/shared';
import { 
  Building2, Search, Activity, ShieldAlert, 
  CheckCircle2, ChevronRight, Loader2, Clock, Database 
} from 'lucide-react';

export default function TenantList() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | TenantStatus>('ALL');

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const data = await SuperAdminAPI.Tenants.list();
        setTenants(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch tenants", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTenants();
  }, []);

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.company_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.custom_domain && t.custom_domain.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'ALL') return matchesSearch;
    return matchesSearch && t.status === activeTab;
  });

  const getStatusBadge = (status: TenantStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center text-xs font-bold text-emerald-400 uppercase tracking-wider"><CheckCircle2 className="w-4 h-4 mr-1.5" /> Active</span>;
      case 'FROZEN':
        return <span className="inline-flex items-center text-xs font-bold text-red-400 uppercase tracking-wider"><ShieldAlert className="w-4 h-4 mr-1.5" /> Frozen</span>;
      case 'PENDING_APPROVAL':
        return <span className="inline-flex items-center text-xs font-bold text-amber-400 uppercase tracking-wider"><Clock className="w-4 h-4 mr-1.5" /> Pending</span>;
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Tenant Fleet</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Manage corporate workspaces, billing tiers, and operational statuses.
          </p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search organizations or domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-1">
        {(['ALL', 'ACTIVE', 'FROZEN', 'PENDING_APPROVAL'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${
              activeTab === tab 
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
            <p className="text-xs font-bold uppercase tracking-widest">Querying Matrix...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 text-xs uppercase tracking-widest">
                  <th className="py-5 px-6 font-bold w-1/3">Organization</th>
                  <th className="py-5 px-6 font-bold">Plan Tier</th>
                  <th className="py-5 px-6 font-bold">Metrics (MAU / API)</th>
                  <th className="py-5 px-6 font-bold">Status</th>
                  <th className="py-5 px-6 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-sm font-medium">
                      No workspaces found.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mr-4 shrink-0">
                            <Building2 className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{tenant.company_name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{tenant.custom_domain || 'No custom domain'}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-slate-800 text-slate-300 border border-slate-700">
                          {tenant.plan_tier?.replace('_', ' ') || 'FREE TIER'}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-col space-y-1">
                          <div className="text-xs font-medium text-slate-400" title="Monthly Active Users">
                            <Activity className="w-3.5 h-3.5 inline mr-1 text-blue-400" />
                            {tenant.mau_count || 0} MAU
                          </div>
                          <div className="text-xs font-medium text-slate-400" title="Current Billing Cycle API Calls">
                            <Activity className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
                            {tenant.current_cycle_api_calls || 0} Calls (Cycle)
                          </div>
                          <div className="text-[10px] font-medium text-slate-500" title="Lifetime API Calls">
                            <Database className="w-3 h-3 inline mr-1 text-slate-500" />
                            {tenant.lifetime_api_calls || 0} Calls (Lifetime)
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {getStatusBadge(tenant.status)}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Link 
                          to={`/tenants/${tenant.id}`} 
                          state={{ tenant }}
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-indigo-600 transition-all"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
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