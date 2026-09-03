import React, { useState, useEffect } from 'react';
import { SuperAdminAPI } from '../../api/superadmin.api';
import { Layers, Plus, ShieldCheck, Edit3, Trash2, Loader2, X, CheckSquare, AlertTriangle } from 'lucide-react';

export default function SystemTemplatesManager() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [appsWithModules, setAppsWithModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [bundles, setBundles] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tmplRes, appsRes] = await Promise.all([
        SuperAdminAPI.RoleTemplates.list(),
        SuperAdminAPI.Apps.list()
      ]);
      setTemplates(Array.isArray(tmplRes) ? tmplRes : []);

      // Fetch modules for every single app to build the master matrix
      const appsData = Array.isArray(appsRes) ? appsRes : [];
      const enrichedApps = await Promise.all(
        appsData.map(async (app) => {
          const mods = await SuperAdminAPI.Modules.listByApp(app.id).catch(() => []);
          return { ...app, modules: Array.isArray(mods) ? mods : [] };
        })
      );
      setAppsWithModules(enrichedApps);
    } catch (err) {
      notify('error', 'Failed to fetch blueprint matrix.');
    } finally {
      setIsLoading(false);
    }
  };

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '' });
    setBundles({});
    setShowModal(true);
  };

  const openEdit = (tmpl: any) => {
    setEditingId(tmpl.id);
    setForm({ name: tmpl.name, description: tmpl.description });
    const b: Record<string, string> = {};
    (tmpl.bundles || []).forEach((x: any) => {
      const mId = x.moduleId || x.module_id;
      const aLvl = x.accessLevel || x.access_level;
      if (mId && aLvl) b[mId] = aLvl;
    });
    setBundles(b);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const bundleArray = Object.entries(bundles).map(([moduleId, accessLevel]) => ({ moduleId, accessLevel }));
      if (editingId) {
        await SuperAdminAPI.RoleTemplates.update(editingId, { ...form, bundles: bundleArray });
        notify('success', 'Blueprint updated.');
      } else {
        await SuperAdminAPI.RoleTemplates.create({ ...form, bundles: bundleArray });
        notify('success', 'Blueprint published globally.');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to save blueprint.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this global blueprint?")) return;
    try {
      await SuperAdminAPI.RoleTemplates.delete(id);
      notify('success', 'Blueprint deleted.');
      fetchData();
    } catch (err: any) {
      notify('error', 'Failed to delete blueprint.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-white pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Role Blueprints</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">Define cross-suite job designations that automatically provision to new tenants.</p>
        </div>
        <button onClick={openCreate} className="flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <Plus className="w-4 h-4 mr-2" /> Compile Blueprint
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-950/50 text-red-400 border border-red-900' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900'}`}>
          {message.text}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
      ) : templates.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-3xl text-center text-slate-500">No blueprints compiled yet.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-emerald-400" /> {tmpl.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{tmpl.description || 'No description'}</p>
                </div>
                <div className="flex space-x-2 shrink-0">
                  <button onClick={() => openEdit(tmpl)} className="p-2 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 rounded-xl"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(tmpl.id)} className="p-2 text-red-400 hover:text-red-300 bg-red-950/40 border border-red-900/50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-y-auto max-h-48 neumorphic-scrollbar">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Cross-Suite Entitlements</h4>
                <div className="flex flex-wrap gap-2">
                  {(tmpl.bundles || []).length === 0 ? (
                    <span className="text-xs text-slate-600">No features bundled.</span>
                  ) : (
                    (tmpl.bundles || []).map((b: any, i: number) => (
                      <div key={i} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs flex items-center">
                        <div className="mr-3">
                          <span className="text-[9px] text-emerald-500/70 uppercase block font-bold">{b.appName || 'Unknown App'}</span>
                          <span className="text-slate-300 font-bold">{b.moduleName || 'Unknown Module'}</span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase ${b.accessLevel === 'WRITE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          {b.accessLevel}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Blueprint' : 'Compile Blueprint'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6 neumorphic-scrollbar">
              <form id="blueprintForm" onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Job Designation</label>
                    <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Description</label>
                    <input required type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Global Software Matrix</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {appsWithModules.map(app => (
                      <div key={app.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-800"><h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest">{app.name}</h4></div>
                        <div className="p-3 space-y-2 max-h-48 overflow-y-auto neumorphic-scrollbar">
                          {app.modules.length === 0 ? <p className="text-xs text-slate-600 p-2">No modules defined.</p> : app.modules.map((mod: any) => {
                            const isChecked = !!bundles[mod.id];
                            return (
                              <div key={mod.id} className={`p-2 rounded-xl border flex items-center justify-between transition-colors ${isChecked ? 'bg-emerald-500/10 border-emerald-500/30' : 'border-transparent hover:bg-slate-900'}`}>
                                <label className="flex items-center cursor-pointer flex-1">
                                  <input type="checkbox" checked={isChecked} onChange={(e) => {
                                    if (e.target.checked) setBundles(prev => ({ ...prev, [mod.id]: 'READ' }));
                                    else { const b = {...bundles}; delete b[mod.id]; setBundles(b); }
                                  }} className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500" />
                                  <span className="ml-3 text-xs font-bold text-slate-300">{mod.name}</span>
                                </label>
                                {isChecked && (
                                  <select value={bundles[mod.id]} onChange={e => setBundles(prev => ({...prev, [mod.id]: e.target.value}))} className="bg-slate-900 border border-slate-700 text-slate-300 rounded-md text-[10px] uppercase font-bold py-1 px-1.5 outline-none">
                                    <option value="READ">Read</option>
                                    <option value="WRITE">Write</option>
                                  </select>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-800 flex justify-end bg-slate-950 space-x-3">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl font-bold text-xs uppercase bg-slate-800 text-white">Cancel</button>
              <button type="submit" form="blueprintForm" className="px-6 py-3 rounded-xl font-bold text-xs uppercase bg-emerald-600 text-white">Compile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}