import React, { useState, useEffect } from 'react';
import { SuperAdminAPI } from '../../api/superadmin.api';
import { 
  Server, Plus, RefreshCw, Webhook, Layers, 
  Copy, ShieldAlert, Loader2, X, ChevronRight, Trash2 
} from 'lucide-react';

export default function AppsManager() {
  const [apps, setApps] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  
  const [modules, setModules] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false); 
  
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modals
  const [showAppModal, setShowAppModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);

  // Form states
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppUrl, setNewAppUrl] = useState('');
  
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');

  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['*']);
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState<string | null>(null);

  const AVAILABLE_EVENTS = [
    '*', 'user.access.granted', 'user.status.updated', 'user.role.granted', 
    'user.role.revoked', 'user.module.granted', 'user.module.revoked', 
    'user.session.revoked', 'user.password_reset.forced',
    'tenant.app.revoked', 'identity.sync.forced'
  ];
  
  const [revealedSecret, setRevealedSecret] = useState<{ clientId: string, clientSecret: string } | null>(null);
  const [rotateConfirmAppId, setRotateConfirmAppId] = useState<string | null>(null);

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      fetchModules(selectedApp.id);
      fetchWebhooks(selectedApp.id);
    }
  }, [selectedApp]);

  const fetchApps = async () => {
    setIsLoading(true);
    try {
      const data = await SuperAdminAPI.Apps.list();
      setApps(Array.isArray(data) ? data : []);
      if (data.length > 0 && !selectedApp) {
        setSelectedApp(data[0]);
      }
    } catch (err) {
      notify('error', 'Failed to fetch software suites.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModules = async (appId: string) => {
    setIsLoadingModules(true);
    try {
      const data = await SuperAdminAPI.Modules.listByApp(appId);
      setModules(Array.isArray(data) ? data : []);
    } catch (err) {
      notify('error', 'Failed to fetch app sub-modules.');
    } finally {
      setIsLoadingModules(false);
    }
  };

  const fetchWebhooks = async (appId: string) => {
    setIsLoadingWebhooks(true);
    try {
      const data = await SuperAdminAPI.Apps.getWebhooks(appId);
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (err) {
      notify('error', 'Failed to fetch webhook endpoints.');
    } finally {
      setIsLoadingWebhooks(false);
    }
  };

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleRegisterApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await SuperAdminAPI.Apps.register({
        name: newAppName,
        description: newAppDesc,
        productionUrl: newAppUrl
      });
      
      notify('success', 'Enterprise suite registered successfully.');
      setShowAppModal(false);
      setNewAppName('');
      setNewAppDesc('');
      setNewAppUrl('');
      fetchApps();

      if (res.clientSecret) {
        setRevealedSecret({ clientId: res.module?.client_id || res.app?.client_id, clientSecret: res.clientSecret });
        setShowCredsModal(true);
      }
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to register app.');
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      await SuperAdminAPI.Modules.create(selectedApp.id, {
        name: newModuleName,
        description: newModuleDesc
      });
      notify('success', 'Sub-feature module added successfully.');
      setShowModuleModal(false);
      setNewModuleName('');
      setNewModuleDesc('');
      fetchModules(selectedApp.id);
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to create module.');
    }
  };

  const executeRotateCreds = async () => {
    if (!rotateConfirmAppId) return;
    try {
      const res = await SuperAdminAPI.Apps.rotateCredentials(rotateConfirmAppId);
      setRotateConfirmAppId(null);
      setRevealedSecret({ clientId: res.clientId, clientSecret: res.clientSecret });
      setShowCredsModal(true);
      notify('success', 'M2M credentials rotated securely.');
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to rotate credentials.');
    }
  };

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (newWebhookEvents.length === 0) return notify('error', 'Select at least one event.');
    
    try {
      const res = await SuperAdminAPI.Apps.registerWebhook({
        appId: selectedApp.id,
        url: newWebhookUrl,
        events: newWebhookEvents.includes('*') ? ['*'] : newWebhookEvents
      });
      notify('success', 'Webhook registered successfully.');
      setShowWebhookModal(false);
      setNewWebhookUrl('');
      setNewWebhookEvents(['*']);
      fetchWebhooks(selectedApp.id);
      
      if (res.signingSecret) {
        setRevealedWebhookSecret(res.signingSecret);
      }
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to register webhook.');
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this webhook endpoint?")) return;
    try {
      await SuperAdminAPI.Apps.deleteWebhook(webhookId);
      notify('success', 'Webhook endpoint removed.');
      setWebhooks(prev => prev.filter(wh => wh.id !== webhookId));
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to delete webhook.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in duration-500 text-white">
      
      {/* Header - Fixed at Top */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Software Suites (Apps)</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Manage physical enterprise applications, M2M OAuth clients, and granular sub-modules.
          </p>
        </div>
        
        <button
          onClick={() => setShowAppModal(true)}
          className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" /> Register Suite
        </button>
      </div>

      {message.text && (
        <div className={`shrink-0 p-4 mb-6 rounded-xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-950/50 text-red-400 border border-red-900' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900'}`}>
          {message.text}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : apps.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-12 border border-dashed border-slate-800 rounded-3xl text-slate-500">
          No software suites registered. Click "Register Suite" to initialize your first app.
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden pb-4">
          
          {/* Left Column (Master): Fixed Width, Independent Scroll */}
          <div className="w-full lg:w-[400px] flex flex-col shrink-0 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl h-full">
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 shrink-0">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                <Server className="w-4 h-4 mr-2 text-indigo-400" /> Registered Suites ({apps.length})
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 neumorphic-scrollbar">
              {apps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedApp?.id === app.id 
                      ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg ring-1 ring-indigo-500/20' 
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-sm truncate">{app.name}</h3>
                      <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{app.production_url}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${selectedApp?.id === app.id ? 'translate-x-1 text-indigo-400' : ''}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (Detail): Flex-1, Independent Scroll */}
          <div className="flex-1 flex flex-col overflow-y-auto neumorphic-scrollbar pr-2 h-full space-y-6">
            {selectedApp ? (
              <>
                {/* Suite Overview Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
                    <div className="min-w-0 pr-4">
                      <h2 className="text-2xl font-black text-white truncate">{selectedApp.name}</h2>
                      <p className="text-xs text-slate-400 mt-1">{selectedApp.description || 'No description provided.'}</p>
                    </div>
                    
                    <button
                      onClick={() => setRotateConfirmAppId(selectedApp.id)}
                      className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-2" /> Rotate Keys
                    </button>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group transition-all hover:border-slate-700">
                      <div className="min-w-0 pr-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Production Endpoint</span>
                        <span className="font-mono text-xs text-indigo-400 truncate block">{selectedApp.production_url}</span>
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(selectedApp.production_url); notify('success', 'Endpoint URL copied'); }}
                        className="p-2 bg-slate-900 border border-slate-700 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 hover:text-white hover:bg-slate-800 transition-all shrink-0"
                        title="Copy URL"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group transition-all hover:border-slate-700">
                      <div className="min-w-0 pr-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">OAuth Client ID</span>
                        <span className="font-mono text-xs text-slate-300 truncate block">{selectedApp.client_id}</span>
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(selectedApp.client_id); notify('success', 'Client ID copied'); }}
                        className="p-2 bg-slate-900 border border-slate-700 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 hover:text-white hover:bg-slate-800 transition-all shrink-0"
                        title="Copy Client ID"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Granular Sub-Modules Manager */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center">
                        <Layers className="w-5 h-5 mr-2 text-indigo-400" /> Sub-Features (Modules)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Granular feature entitlements bundled into this suite.</p>
                    </div>

                    <button
                      onClick={() => setShowModuleModal(true)}
                      className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Module
                    </button>
                  </div>

                  {isLoadingModules ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                  ) : modules.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
                      No sub-modules defined. Tenant roles cannot target specific features until modules are added.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modules.map((mod) => (
                        <div key={mod.id} className="bg-slate-950 border border-slate-800/60 p-4 rounded-2xl flex items-center justify-between">
                          <div className="min-w-0 pr-3">
                            <h4 className="font-bold text-white text-sm truncate">{mod.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{mod.description || 'No description'}</p>
                          </div>
                          <span className="text-[9px] font-mono bg-slate-900 text-slate-500 px-2 py-1 rounded-md border border-slate-800 shrink-0 uppercase tracking-widest">
                            {mod.id.substring(0, 8)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Webhooks Manager Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center">
                        <Webhook className="w-5 h-5 mr-2 text-amber-400" /> Webhook Endpoints
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Real-time event streams delivered to your external systems.</p>
                    </div>
                    <button
                      onClick={() => setShowWebhookModal(true)}
                      className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Endpoint
                    </button>
                  </div>

                  {isLoadingWebhooks ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                  ) : webhooks.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
                      No webhook endpoints configured for this suite.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {webhooks.map((wh) => (
                        <div key={wh.id} className="bg-slate-950 border border-slate-800/60 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${wh.is_active ? 'bg-emerald-500' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></span>
                              <h4 className="font-bold text-white text-sm font-mono truncate">{wh.url}</h4>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5">
                              {(() => {
                                const events = typeof wh.subscribed_events === 'string' ? JSON.parse(wh.subscribed_events) : wh.subscribed_events;
                                return (events || []).map((ev: string) => (
                                  <span key={ev} className="text-[9px] font-bold uppercase tracking-widest bg-slate-900 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-md">
                                    {ev}
                                  </span>
                                ));
                              })()}
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteWebhook(wh.id)}
                            className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors border border-transparent hover:border-red-900/50 shrink-0"
                            title="Delete Webhook"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-3xl">
                <Server className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium text-sm">Select an application from the side panel to manage its configurations.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* MODAL 1: REGISTER APP */}
      {showAppModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Register Software Suite</h2>
              <button onClick={() => setShowAppModal(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleRegisterApp} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Suite Name (e.g. Enterprise ERP)</label>
                <input required type="text" value={newAppName} onChange={e => setNewAppName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="ERP Suite" />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Production URL</label>
                <input required type="url" value={newAppUrl} onChange={e => setNewAppUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="https://erp.manavsutra.com" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Description</label>
                <textarea value={newAppDesc} onChange={e => setNewAppDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 h-24" placeholder="Core financial and resource planning suite..." />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAppModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-500">Register Suite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD MODULE */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Add Sub-Feature Module</h2>
              <button onClick={() => setShowModuleModal(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleCreateModule} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Module Name (e.g. Payroll Engine)</label>
                <input required type="text" value={newModuleName} onChange={e => setNewModuleName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Payroll" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Description</label>
                <textarea value={newModuleDesc} onChange={e => setNewModuleDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 h-24" placeholder="Handles employee salary calculations and tax deductions..." />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowModuleModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-500">Create Module</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REVEAL SECRETS */}
      {showCredsModal && revealedSecret && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-200">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 bg-emerald-500/10 flex items-center">
              <ShieldAlert className="w-6 h-6 text-emerald-500 mr-3 shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight m-0">Save M2M Credentials</h2>
                <p className="text-xs text-emerald-600/90 font-bold mt-0.5 m-0">This secret will never be shown again</p>
              </div>
            </div>
            
            <div className="p-8 space-y-6 font-mono bg-slate-900/50">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Client ID</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-black p-4 rounded-xl border border-slate-700 text-sm text-slate-200 select-all overflow-x-auto whitespace-nowrap scrollbar-hide">
                    {revealedSecret.clientId}
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(revealedSecret.clientId); notify('success', 'Client ID copied!'); }}
                    className="p-4  text-slate-300 hover:text-slate-50 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all shrink-0"
                    title="Copy Client ID"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Client Secret</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-black p-4 rounded-xl border border-emerald-500/50 text-sm text-emerald-400 font-bold select-all break-all shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                    {revealedSecret.clientSecret}
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(revealedSecret.clientSecret); notify('success', 'Client Secret copied!'); }}
                    className="p-4 bg-emerald-950 hover:bg-emerald-900 text-emerald-500 hover:text-emerald-300 rounded-xl border border-emerald-500/40 transition-all shrink-0"
                    title="Copy Client Secret"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end bg-slate-900">
              <button 
                onClick={() => { setShowCredsModal(false); setRevealedSecret(null); }} 
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                I Have Saved These Keys
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: WEBHOOK */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Attach System Webhook</h2>
              <button onClick={() => setShowWebhookModal(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleRegisterWebhook} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Webhook Endpoint URL</label>
                <input required type="url" value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500" placeholder="https://api.app.com/webhooks" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Subscribed Events</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_EVENTS.map(ev => {
                    const isSelected = newWebhookEvents.includes(ev);
                    return (
                      <button
                        key={ev}
                        type="button"
                        onClick={() => {
                          if (ev === '*') {
                            setNewWebhookEvents(['*']); // Reset to All
                          } else {
                            const withoutStar = newWebhookEvents.filter(e => e !== '*');
                            if (isSelected) {
                              setNewWebhookEvents(withoutStar.filter(e => e !== ev));
                            } else {
                              setNewWebhookEvents([...withoutStar, ev]);
                            }
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                          isSelected 
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-700 shadow-inner' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {ev === '*' ? 'All Events (*)' : ev}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowWebhookModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-amber-950 bg-amber-500 hover:bg-amber-400">Attach Endpoint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: REVEAL WEBHOOK SECRET */}
      {revealedWebhookSecret && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 bg-amber-900/10 flex items-center">
              <ShieldAlert className="w-6 h-6 text-amber-600 mr-3 shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight m-0">Save Webhook Secret</h2>
                <p className="text-xs text-amber-700/90 font-bold mt-0.5 m-0">This signing secret will never be shown again</p>
              </div>
            </div>
            
            <div className="p-8 space-y-4 font-mono bg-slate-900/50">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  HMAC Signing Secret (Used to verify payloads)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-black p-4 rounded-xl border border-amber-500/50 text-sm text-amber-400 font-bold select-all break-all shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]">
                    {revealedWebhookSecret}
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(revealedWebhookSecret); notify('success', 'Webhook Secret copied!'); }}
                    className="p-4 bg-amber-950 hover:bg-amber-900 text-amber-500 hover:text-amber-300 rounded-xl border border-amber-500/40 transition-all shrink-0"
                    title="Copy Webhook Secret"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end bg-slate-900">
              <button 
                onClick={() => setRevealedWebhookSecret(null)} 
                className="w-full sm:w-auto px-8 py-3.5 bg-amber-600 hover:bg-amber-500 text-amber-950 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              >
                I Have Saved This Secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: ROTATE CREDENTIALS CONFIRMATION */}
      {rotateConfirmAppId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 bg-amber-500/10 flex justify-between items-start">
              <div className="flex items-center">
                <ShieldAlert className="w-6 h-6 text-amber-600 mr-3 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight m-0">Rotate Credentials</h2>
                  <p className="text-xs text-amber-700 font-bold mt-1 m-0">Warning: Destructive Action</p>
                </div>
              </div>
              <button onClick={() => setRotateConfirmAppId(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-8 text-sm font-medium text-slate-300 leading-relaxed bg-slate-900/50">
              Rotating credentials will <strong className="text-amber-600">instantly invalidate</strong> all existing M2M tokens for this suite. Systems relying on the old secret will fail to authenticate until updated.
            </div>
            
            <div className="p-6 border-t border-slate-800 flex flex-col sm:flex-row gap-3 bg-slate-900">
              <button onClick={() => setRotateConfirmAppId(null)} className="w-full sm:flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all">
                Cancel
              </button>
              <button onClick={executeRotateCreds} className="w-full sm:flex-1 py-3.5 bg-amber-600 hover:bg-amber-500 text-amber-950 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                Rotate Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}