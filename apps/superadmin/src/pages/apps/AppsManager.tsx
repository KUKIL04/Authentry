import React, { useState, useEffect } from 'react';
import { SuperAdminAPI } from '../../api/superadmin.api';
import { 
  Server, Plus, Key, RefreshCw, Webhook, Layers, 
  CheckCircle2, Copy, ShieldAlert, Loader2, X, ChevronRight, Terminal, Trash2, ShieldCheck, Edit3 
} from 'lucide-react';

export default function AppsManager() {
  const [apps, setApps] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  
  const [modules, setModules] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]); 
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false); 
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modals
  const [showAppModal, setShowAppModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Form states
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppUrl, setNewAppUrl] = useState('');
  
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');

  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['*']);
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState<string | null>(null);

  // Template Form States
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', description: '' });
  const [templateBundles, setTemplateBundles] = useState<Record<string, string>>({});

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
    fetchTemplates(); // Global templates fetch on mount
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

  // ✅ NEW: Fetch Global Role Templates
  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const data = await SuperAdminAPI.RoleTemplates.list();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      notify('error', 'Failed to fetch system role templates.');
    } finally {
      setIsLoadingTemplates(false);
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

  // ==========================================
  // TEMPLATE HANDLERS
  // ==========================================
  const openCreateTemplate = () => {
    setEditingTemplateId(null);
    setTemplateForm({ name: '', description: '' });
    setTemplateBundles({});
    setShowTemplateModal(true);
  };

  const openEditTemplate = (tmpl: any) => {
    setEditingTemplateId(tmpl.id);
    setTemplateForm({ name: tmpl.name, description: tmpl.description });
    
    const bundles: Record<string, string> = {};
    (tmpl.bundles || []).forEach((b: any) => {
       const mId = b.moduleId || b.moduleid || b.module_id;
       const aLvl = b.accessLevel || b.accesslevel || b.access_level;
       if (mId && aLvl) bundles[mId] = aLvl;
    });
    
    setTemplateBundles(bundles);
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const bundleArray = Object.entries(templateBundles).map(([moduleId, accessLevel]) => ({ moduleId, accessLevel }));
      if (editingTemplateId) {
        await SuperAdminAPI.RoleTemplates.update(editingTemplateId, { ...templateForm, bundles: bundleArray });
        notify('success', 'System template updated successfully.');
      } else {
        await SuperAdminAPI.RoleTemplates.create({ ...templateForm, bundles: bundleArray });
        notify('success', 'System template published globally.');
      }
      setShowTemplateModal(false);
      fetchTemplates();
    } catch(err: any) {
      notify('error', err.response?.data?.error || 'Failed to save template.');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Delete this system template? Existing tenant roles cloned from this won't be affected, but future tenants won't receive it.")) return;
    try {
      await SuperAdminAPI.RoleTemplates.delete(id);
      notify('success', 'Template deleted globally.');
      fetchTemplates();
    } catch(err: any) {
      notify('error', err.response?.data?.error || 'Failed to delete template.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-white pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Software Suites (Apps)</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Manage physical enterprise applications, M2M OAuth clients, and granular sub-modules.
          </p>
        </div>
        
        <button
          onClick={() => setShowAppModal(true)}
          className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]"
        >
          <Plus className="w-4 h-4 mr-2" /> Register Suite
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-950/50 text-red-400 border border-red-900' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900'}`}>
          {message.text}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : apps.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-3xl text-center text-slate-500">
          No software suites registered. Click "Register Suite" to initialize your first app.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: List of Apps */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Registered Suites ({apps.length})</h2>
            <div className="space-y-3">
              {apps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedApp?.id === app.id 
                      ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg' 
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      <Server className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{app.name}</h3>
                      <p className="text-[10px] font-mono text-slate-500 truncate max-w-[160px]">{app.production_url}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${selectedApp?.id === app.id ? 'translate-x-1 text-indigo-400' : ''}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Selected App Deep Dive */}
          {selectedApp && (
            <div className="lg:col-span-8 space-y-6">
              
              {/* Suite Overview Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
                  <div>
                    <h2 className="text-2xl font-black text-white">{selectedApp.name}</h2>
                    <p className="text-xs text-slate-400 mt-1">{selectedApp.description || 'No description provided.'}</p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setRotateConfirmAppId(selectedApp.id)}
                      className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-2" /> Rotate Keys
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center">
                      <Layers className="w-5 h-5 mr-2 text-indigo-400" /> Sub-Features (Modules)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Granular feature entitlements bundled into this suite.</p>
                  </div>

                  <button
                    onClick={() => setShowModuleModal(true)}
                    className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center"
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
                  <div className="space-y-3">
                    {modules.map((mod) => (
                      <div key={mod.id} className="bg-slate-950 border border-slate-800/60 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">{mod.name}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{mod.description || 'No description'}</p>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-800">
                          ID: {mod.id.substring(0, 8)}...
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ✅ NEW: System Role Templates Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center">
                      <ShieldCheck className="w-5 h-5 mr-2 text-emerald-400" /> System Role Templates
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Pre-bundled access profiles granted automatically to new tenants.</p>
                  </div>
                  <button
                    onClick={openCreateTemplate}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Template
                  </button>
                </div>

                {isLoadingTemplates ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
                ) : templates.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-xs relative z-10">
                    No system role templates defined. New tenants will start with a blank slate.
                  </div>
                ) : (
                  <div className="space-y-3 relative z-10">
                    {templates.map(tmpl => {
                      // Filter bundles to only show ones relevant to the currently selected app
                      // (Though the template is global, we display it contextually here)
                      const appBundles = (tmpl.bundles || []).filter((b: any) => 
                        modules.some(m => m.id === (b.moduleId || b.moduleid))
                      );

                      if (appBundles.length === 0 && (tmpl.bundles || []).length > 0) return null; // Hide if it only applies to other apps

                      return (
                        <div key={tmpl.id} className="bg-slate-950 border border-slate-800/60 p-5 rounded-2xl flex items-center justify-between group">
                          <div className="flex-1">
                            <h4 className="font-bold text-white text-sm">{tmpl.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">{tmpl.description || 'No description provided'}</p>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {appBundles.length === 0 ? (
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">No modules bundled for this suite</span>
                              ) : (
                                appBundles.map((b:any) => {
                                  const modId = b.moduleId || b.moduleid;
                                  const modName = modules.find(m => m.id === modId)?.name || 'Unknown';
                                  const accessLvl = b.accessLevel || b.accesslevel;
                                  return (
                                    <span key={modId} className={`text-[9px] font-bold uppercase tracking-widest bg-slate-900 border px-2 py-0.5 rounded-md ${accessLvl === 'WRITE' ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-700 text-slate-400'}`}>
                                      {modName} : {accessLvl}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditTemplate(tmpl)} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-700"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteTemplate(tmpl.id)} className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors border border-transparent hover:border-red-900/50"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Webhooks Manager Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center">
                      <Webhook className="w-5 h-5 mr-2 text-amber-400" /> Webhook Endpoints
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time event streams delivered to your external systems.</p>
                  </div>
                  <button
                    onClick={() => setShowWebhookModal(true)}
                    className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center"
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
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2 h-2 rounded-full ${wh.is_active ? 'bg-emerald-500' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></span>
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

            </div>
          )}
        </div>
      )}

      {/* MODAL: SYSTEM ROLE TEMPLATE */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0 bg-slate-950/50">
              <div className="flex items-center">
                <ShieldCheck className="w-6 h-6 text-emerald-500 mr-3" />
                <div>
                  <h2 className="text-lg font-bold text-white">{editingTemplateId ? 'Edit Role Template' : 'Create Role Template'}</h2>
                  <p className="text-xs text-slate-400 mt-1">Pre-bundle modules for new workspace tenants.</p>
                </div>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6 neumorphic-scrollbar">
              <form id="templateForm" onSubmit={handleSaveTemplate} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Template Designation (Job Title)</label>
                    <input required type="text" value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="e.g. Logistics Coordinator" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Description</label>
                    <textarea value={templateForm.description} onChange={e => setTemplateForm({...templateForm, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 h-20 resize-none" placeholder="Describe the template's purpose..." />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Module Entitlements (For {selectedApp?.name})</label>
                  <div className="space-y-3">
                    {modules.length === 0 ? (
                      <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">No modules defined in this app yet.</p>
                      </div>
                    ) : modules.map(mod => {
                      const isChecked = !!templateBundles[mod.id];
                      return (
                        <div key={mod.id} className={`p-4 rounded-xl border transition-all flex items-center justify-between ${isChecked ? 'bg-emerald-500/10 border-emerald-500/30 shadow-inner' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                          <label className="flex items-center cursor-pointer flex-1 group">
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTemplateBundles(prev => ({ ...prev, [mod.id]: 'READ' }));
                                } else {
                                  const newB = { ...templateBundles };
                                  delete newB[mod.id];
                                  setTemplateBundles(newB);
                                }
                              }} 
                              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 cursor-pointer" 
                            />
                            <div className="ml-3">
                              <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{mod.name}</span>
                              <p className="text-[10px] text-slate-500 mt-0.5">{mod.description}</p>
                            </div>
                          </label>

                          {isChecked && (
                            <select 
                              value={templateBundles[mod.id]} 
                              onChange={e => setTemplateBundles(prev => ({...prev, [mod.id]: e.target.value}))} 
                              className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg text-xs font-bold tracking-widest uppercase py-1.5 px-2 outline-none focus:border-emerald-500 cursor-pointer shrink-0"
                            >
                              <option value="READ">Read Only</option>
                              <option value="WRITE">Read & Write</option>
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end space-x-3 shrink-0 bg-slate-950/50">
              <button type="button" onClick={() => setShowTemplateModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700 hover:bg-slate-800">Cancel</button>
              <button type="submit" form="templateForm" className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-emerald-950 bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">Compile Template</button>
            </div>
          </div>
        </div>
      )}

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