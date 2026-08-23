// apps/superadmin/src/pages/tenants/TenantDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SuperAdminAPI } from '../../api/superadmin.api';
import { 
  ArrowLeft, Building2, ShieldAlert, Power, 
  Loader2, Users, TrendingUp, Layers, CheckCircle2, XCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, BarChart, Bar 
} from 'recharts';

export default function TenantDetails() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  
  const [tenant, setTenant] = useState<any>(null);
  const [globalApps, setGlobalApps] = useState<any[]>([]);
  const [allocatedAppIds, setAllocatedAppIds] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'allocations' | 'settings'>('telemetry');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTenantData = async () => {
      console.log(`[Diagnostic] 1. fetchTenantData triggered. tenantId from URL:`, tenantId);
      
      if (!tenantId) {
        console.error('[Diagnostic] ❌ No tenantId present in URL parameters!');
        setError('No Workspace ID provided in URL.');
        setIsLoading(false); // Fixes the infinite loading trap!
        return;
      }

      try {
        console.log(`[Diagnostic] 2. Firing Promise.all for Tenant Data and Apps...`);
        const [tenantData, appsData] = await Promise.all([
          SuperAdminAPI.Tenants.get(tenantId),
          SuperAdminAPI.Apps.list()
        ]);
        
        console.log(`[Diagnostic] 3. Promise.all RESOLVED!`);
        console.log(`[Diagnostic] 4. Tenant Data received:`, tenantData);
        console.log(`[Diagnostic] 5. Global Apps Data received:`, appsData);
        
        setTenant(tenantData);
        setGlobalApps(Array.isArray(appsData) ? appsData : []);
        setAllocatedAppIds(tenantData.allocated_app_ids || []);
        
      } catch (err: any) {
        console.error('[Diagnostic] ❌ ERROR caught in fetchTenantData:', err);
        console.error('[Diagnostic] Error Response Data:', err.response?.data);
        setError(err.response?.data?.error || 'Failed to fetch workspace telemetry.');
        
        if (err.response?.status === 404) {
          console.warn('[Diagnostic] 404 Received. Redirecting to /tenants');
          navigate('/tenants');
        }
      } finally {
        console.log(`[Diagnostic] 6. Entering FINALLY block. Setting isLoading to false.`);
        setIsLoading(false);
      }
    };
    
    fetchTenantData();
  }, [tenantId, navigate]);

  const handleToggleStatus = async () => {
    if (!tenant) return;
    const newStatus = tenant.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    setIsUpdating(true);
    try {
      const res = await SuperAdminAPI.Tenants.updateStatus(tenant.id, newStatus);
      setTenant({ ...tenant, status: res.tenant.status });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update tenant status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAllocateApp = async (appId: string) => {
    if (!tenant) return;
    try {
      await SuperAdminAPI.Tenants.allocateApp(tenant.id, appId);
      setAllocatedAppIds(prev => [...prev, appId]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to allocate suite.');
    }
  };

  const handleRevokeApp = async (appId: string) => {
    if (!tenant) return;
    if (!window.confirm("Revoking this suite will permanently destroy all internal role assignments and overrides for this company. Proceed?")) return;
    try {
      await SuperAdminAPI.Tenants.revokeApp(tenant.id, appId);
      setAllocatedAppIds(prev => prev.filter(id => id !== appId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to revoke suite.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Telemetry...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Workspace Access Denied</h2>
        <p className="text-slate-400 text-sm max-w-md">
          {error || 'Could not load workspace data. Check your developer console (F12).'}
        </p>
        <Link to="/tenants" className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all">
          Return to Fleet
        </Link>
      </div>
    );
  }

  const isFrozen = tenant.status === 'FROZEN';

  const usageHistory = [
    { time: '00:00', apiCalls: Math.floor((tenant.current_cycle_api_calls || 100) * 0.1), mau: Math.floor((tenant.mau_count || 10) * 0.4) },
    { time: '04:00', apiCalls: Math.floor((tenant.current_cycle_api_calls || 100) * 0.25), mau: Math.floor((tenant.mau_count || 10) * 0.6) },
    { time: '08:00', apiCalls: Math.floor((tenant.current_cycle_api_calls || 100) * 0.6), mau: Math.floor((tenant.mau_count || 10) * 0.8) },
    { time: '12:00', apiCalls: Math.floor((tenant.current_cycle_api_calls || 100) * 0.95), mau: tenant.mau_count || 10 },
    { time: '16:00', apiCalls: Math.floor((tenant.current_cycle_api_calls || 100) * 0.8), mau: tenant.mau_count || 10 },
    { time: '20:00', apiCalls: Math.floor((tenant.current_cycle_api_calls || 100) * 0.4), mau: Math.floor((tenant.mau_count || 10) * 0.7) },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <Link to="/tenants" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Fleet
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="flex items-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mr-5 shrink-0 border ${isFrozen ? 'bg-red-950 border-red-900/50' : 'bg-slate-900 border-slate-800'}`}>
              <Building2 className={`w-8 h-8 ${isFrozen ? 'text-red-500' : 'text-indigo-500'}`} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{tenant.company_name}</h1>
              <div className="flex items-center mt-2 space-x-4">
                <span className="text-sm font-mono text-slate-500">{tenant.id}</span>
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border ${isFrozen ? 'bg-red-950/50 text-red-400 border-red-900' : 'bg-emerald-950/80 text-emerald-400 border-emerald-900'}`}>
                  {tenant.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-indigo-950/30 text-indigo-600 border border-indigo-500">
                  {tenant.plan_tier?.replace('_', ' ') || 'FREE TIER'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`pb-3 px-4 font-bold text-xs uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'telemetry' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Usage Telemetry
        </button>
        <button
          onClick={() => setActiveTab('allocations')}
          className={`pb-3 px-4 font-bold text-xs uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'allocations' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Suite Allocations & Licensing
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-4 font-bold text-xs uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'settings' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Control Plane & Locks
        </button>
      </div>

      {/* Tab 1: Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center text-emerald-400">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">API Call Rate</h3>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Cycle: {tenant.current_cycle_api_calls || 0} / {tenant.max_api_requests || 'Unlimited'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1">
                    Lifetime Total: {tenant.lifetime_api_calls || 0}
                  </span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usageHistory}>
                    <defs>
                      <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#475569" fontSize={11} />
                    <YAxis stroke="#475569" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="apiCalls" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorApi)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center text-blue-400">
                  <Users className="w-5 h-5 mr-2" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">MAU Growth Trend</h3>
                </div>
                <span className="text-xs font-mono text-slate-500">Cap: {tenant.max_mau || 100}</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageHistory}>
                    <XAxis dataKey="time" stroke="#475569" fontSize={11} />
                    <YAxis stroke="#475569" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Bar dataKey="mau" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Entitlement Allocations */}
      {activeTab === 'allocations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Licensed Software Suites</h3>
              <p className="text-xs text-slate-500 mt-1">Manage which enterprise apps this workspace has access to.</p>
            </div>
            <div className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center">
              <Layers className="w-3.5 h-3.5 mr-2" />
              {allocatedAppIds.length} Suites Allocated
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalApps.map((app) => {
              const isAllocated = allocatedAppIds.includes(app.id);

              return (
                <div 
                  key={app.id} 
                  className={`border p-5 rounded-2xl transition-all ${
                    isAllocated 
                      ? 'bg-emerald-950/10 border-emerald-900/50 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">{app.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono max-w-[150px] truncate">
                        {app.production_url}
                      </p>
                    </div>
                    {isAllocated ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-600 shrink-0" />
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-400 mb-6 line-clamp-2 h-8">
                    {app.description || 'No description provided for this software suite.'}
                  </p>

                  {isAllocated ? (
                    <button
                      onClick={() => handleRevokeApp(app.id)}
                      className="w-full py-2 bg-slate-900 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-900/50 rounded-lg font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      Revoke License
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAllocateApp(app.id)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg transition-all"
                    >
                      Allocate App
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Control Settings */}
      {activeTab === 'settings' && (
        <div className="bg-slate-950 border border-red-900/30 rounded-3xl p-8">
          <h3 className="text-base font-bold text-white mb-2">Tenant Status Override</h3>
          <p className="text-sm text-slate-500 mb-6">
            Freezing a tenant writes an immediate blockade rule across all auth gateways.
          </p>
          <button
            onClick={handleToggleStatus}
            disabled={isUpdating}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center transition-all ${
              isFrozen ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Power className="w-4 h-4 mr-2" />}
            {isFrozen ? 'Activate Tenant' : 'Execute Freeze'}
          </button>
        </div>
      )}
    </div>
  );
}