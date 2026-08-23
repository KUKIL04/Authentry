import React, { useState, useEffect } from 'react';
import { AdminAPI } from '../../api/admin.api';
import { LayoutGrid, Users, Loader2, ShieldMinus, Search, CheckSquare, AlertTriangle, X, Terminal } from 'lucide-react';

export default function ModuleManager() {
  const [apps, setApps] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [parentApp, setParentApp] = useState<any | null>(null);
  const [authorizedUsers, setAuthorizedUsers] = useState<any[]>([]);
  
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [unassignedUsers, setUnassignedUsers] = useState<any[]>([]);
  const [selectedToGrant, setSelectedToGrant] = useState<string[]>([]);

  const [revokeModal, setRevokeModal] = useState<{
    isOpen: boolean, userId: string | null, userName: string
  }>({ isOpen: false, userId: null, userName: '' });

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await AdminAPI.getApps();
        const data = Array.isArray(res) ? res : [];
        setApps(data);
        
        // Auto-select the first module of the first app
        if (data.length > 0 && data[0].modules?.length > 0) {
          handleSelectModule(data[0].modules[0], data[0]);
        }
      } catch (err) {
        notify('error', 'Failed to fetch workspace apps.');
      } finally {
        setIsLoadingModules(false);
      }
    };
    fetchApps();
  }, []);

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };
  
  const handleSelectModule = async (mod: any, app: any) => {
    setSelectedModule(mod);
    setParentApp(app);
    setIsLoadingUsers(true);
    setSearchQuery('');
    
    try {
      const users = await AdminAPI.getModuleUsers(mod.id).catch(() => []);
      const authUsers = Array.isArray(users) ? users : [];
      setAuthorizedUsers(authUsers);

      const allUsers = await AdminAPI.getUsers().catch(() => []);
      const authIds = authUsers.map(u => u.id);
      setUnassignedUsers(Array.isArray(allUsers) ? allUsers.filter(u => !authIds.includes(u.id)) : []);
    } catch (err) {
      notify('error', `Failed to fetch users for ${mod.name}`);
    } finally {
      setIsLoadingUsers(false);
    }
  };

 const executeRevokeAccess = async () => {
    if (!selectedModule || !revokeModal.userId) return;
    try {
      await AdminAPI.revokeModuleAccess(revokeModal.userId, selectedModule.id);
      notify('success', 'Access revoked successfully.');
      setAuthorizedUsers(prev => prev.filter(u => u.id !== revokeModal.userId));
      setRevokeModal({ isOpen: false, userId: null, userName: '' });
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to revoke access');
    }
  };

  const handleUpdateAccessLevel = async (userId: string, newLevel: string) => {
    if (!selectedModule) return;
    try {
      await AdminAPI.updateModuleAccessLevel(selectedModule.id, userId, newLevel as 'READ'|'WRITE');
      setAuthorizedUsers(prev => prev.map(u => u.id === userId ? { ...u, access_level: newLevel } : u));
      notify('success', `Access updated to ${newLevel}.`);
    } catch (err: any) {
      notify('error', 'Failed to update access level.');
    }
  };

  const handleConfirmGrant = async () => {
    if (selectedToGrant.length === 0 || !selectedModule) return;
    try {
      await AdminAPI.grantBulkModuleAccess(selectedModule.id, selectedToGrant);
      notify('success', `Access granted to ${selectedToGrant.length} personnel.`);
      setIsGrantModalOpen(false);
      setSelectedToGrant([]);
      handleSelectModule(selectedModule, parentApp);
    } catch (err: any) {
      notify('error', 'Failed to grant access.');
    }
  };

  const filteredUsers = authorizedUsers.filter(u => 
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUnassigned = unassignedUsers.filter(u => 
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(modalSearchQuery.toLowerCase())
  );

  return (
    <div className="w-full relative h-[calc(100vh)] flex flex-col bg-slate-50/50">
      
      {/* GLOBAL HEADER */}
      <div className="shrink-0 px-6 sm:px-10 py-5 bg-white border-b border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-40">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Feature Overrides</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Grant direct personnel access to specific Software Suite modules.</p>
        </div>
      </div>

      {message.text && (
        <div className="px-6 sm:px-10 pt-4 shrink-0 relative z-30">
          <div className={`px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{message.text}</div>
        </div>
      )}

      {/* MASTER-DETAIL LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-y-auto lg:overflow-hidden max-w-[1600px] mx-auto w-full transition-all duration-300 neumorphic-scrollbar">
        
        {/* LEFT PANE (Master List) */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden h-[400px] lg:h-full">
          <div className="p-5 border-b border-slate-100 shrink-0">
            <div className="flex items-center mb-2">
              <div className="p-2 bg-slate-50 rounded-lg mr-3 shadow-inner border border-slate-100 shrink-0">
                <Terminal className="w-5 h-5 text-gamboge-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Licensed Suites</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto neumorphic-scrollbar p-3 space-y-4 bg-slate-50/30">
            {isLoadingModules ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : apps.length === 0 ? (
              <div className="text-center p-8 text-slate-400 font-medium text-sm">No suites allocated.</div>
            ) : (
              apps.map(app => (
                <div key={app.app_id} className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2 px-2">
                    {app.app_name}
                  </h3>
                  
                  {app.modules?.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 opacity-70">
                      <h4 className="font-bold text-xs text-slate-500 truncate">{app.app_name} (Base Suite)</h4>
                      <p className="text-[10px] text-amber-600 font-bold mt-1 uppercase tracking-widest flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1 shrink-0" /> Requires Setup
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {app.modules.map((mod: any) => {
                        const isSelected = selectedModule?.id === mod.id;
                        return (
                          <div 
                            key={mod.id} 
                            onClick={() => handleSelectModule(mod, app)} 
                            className={`relative p-3 rounded-xl cursor-pointer transition-all duration-200 ${isSelected ? 'bg-slate-50 border-gamboge-400 shadow-sm ring-1 ring-gamboge-100' : 'bg-transparent border-transparent hover:bg-slate-100/70 border hover:border-slate-200/60'}`}
                          >
                            <h4 className={`font-extrabold text-sm truncate ${isSelected ? 'text-gamboge-700' : 'text-slate-700'}`}>{mod.name}</h4>
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5">{mod.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANE (Detail View) */}
        <div className="w-full shrink-0 lg:shrink flex flex-col bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden h-[550px] lg:h-full">
          {selectedModule ? (
            <>
              {/* Detail Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50/50 shrink-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{selectedModule.name}</h2>
                  <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest">{parentApp?.app_name}</span>
                </div>
                <p className="text-sm text-slate-500 font-medium max-w-2xl">{selectedModule.description}</p>
              </div>

              <div className="px-6 p-6 sm:px-4 sm:p-4 bg-white shrink-0">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400 shrink-0" />
                    <input type="text" placeholder="Filter authorized personnel..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="embossed-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 outline-none border border-slate-200 focus:border-gamboge-300 transition-colors" />
                  </div>
                  <button onClick={() => setIsGrantModalOpen(true)} className="shine-btn w-full sm:w-auto py-2.5 px-6 text-white font-bold rounded-xl text-xs tracking-widest uppercase shrink-0 text-center">Grant Override</button>
                </div>
              </div>  

              <div className="flex-1 overflow-y-auto neumorphic-scrollbar px-6 pb-6 sm:px-8 sm:pb-8 bg-white">
                {isLoadingUsers ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                    <Users className="w-12 h-12 mb-4 opacity-20" />
                    <span className="text-sm font-bold tracking-wide">{searchQuery ? 'No personnel match filter.' : 'No users currently have explicit overrides.'}</span>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest">
                          <th className="py-3 px-5 font-bold">Employee Name</th>
                          <th className="py-3 px-5 font-bold">Permission Level</th>
                          <th className="py-3 px-5 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map(user => (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="font-bold text-slate-700 text-sm flex items-center">
                                {user.first_name} {user.last_name}
                                {user.grant_source === 'ROLE_BUNDLE' && (
                                   <span className="ml-2 text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200 uppercase tracking-widest">via Role</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">{user.email}</div>
                            </td>
                            <td className="py-3.5 px-5">
                              <select 
                                value={user.final_access_level || user.access_level || 'READ'} 
                                onChange={(e) => handleUpdateAccessLevel(user.id, e.target.value)} 
                                disabled={user.grant_source === 'ROLE_BUNDLE'}
                                className="bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] sm:text-xs font-bold tracking-widest uppercase p-2 outline-none focus:border-gamboge-500 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <option value="READ">Read Only</option>
                                <option value="WRITE">Read / Write</option>
                              </select>
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              {user.grant_source === 'ROLE_BUNDLE' ? (
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inherited</span>
                              ) : (
                                <button onClick={() => setRevokeModal({ isOpen: true, userId: user.id, userName: `${user.first_name} ${user.last_name}` })} className="text-red-400 bg-red-50 hover:text-red-500 hover:bg-red-100 font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-widest transition-all">
                                  Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6"><LayoutGrid className="w-8 h-8 text-slate-300" /></div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Select a Feature Module</h3>
              <p className="text-slate-500 text-sm font-medium">Choose a granular module from the left to view and manage its authorized personnel.</p>
            </div>
          )}
        </div>
      </div>

      {/* ==============================================
          GRANT MODAL (Now perfectly centered aside the nav) 
      ============================================== */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:pl-32 lg:pl-140">
          <div className="bg-white p-6 sm:p-8 w-full max-w-md sm:max-w-lg rounded-3xl shadow-xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight flex items-center">
                  <CheckSquare className="w-5 h-5 mr-2 text-gamboge-600 shrink-0" /> Grant Access
                </h3>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 truncate max-w-[200px] sm:max-w-xs">
                  Assigning <span className="text-gamboge-700">{selectedModule?.name}</span>
                </p>
              </div>
              <button onClick={() => { setIsGrantModalOpen(false); setSelectedToGrant([]); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="relative mb-4 shrink-0">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400 shrink-0" />
              <input type="text" placeholder="Search unassigned personnel..." value={modalSearchQuery} onChange={(e) => setModalSearchQuery(e.target.value)} className="embossed-input w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 outline-none border border-slate-200 focus:border-gamboge-300 transition-colors" />
            </div>
            
            <div className="bg-slate-50 border border-slate-200/60 p-2 rounded-2xl flex-1 overflow-y-auto mb-6 neumorphic-scrollbar">
              {filteredUnassigned.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm font-medium">{modalSearchQuery ? 'No unassigned users match.' : 'All users already have access.'}</div>
              ) : (
                <div className="space-y-1">
                  {filteredUnassigned.map(user => (
                    <label key={user.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-slate-200/60 hover:shadow-sm">
                      <div className="overflow-hidden mr-3">
                        <div className="font-bold text-slate-700 text-xs sm:text-sm truncate">{user.first_name} {user.last_name}</div>
                        <div className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">{user.email}</div>
                      </div>
                      <input type="checkbox" checked={selectedToGrant.includes(user.id)} onChange={(e) => { if (e.target.checked) setSelectedToGrant(prev => [...prev, user.id]); else setSelectedToGrant(prev => prev.filter(id => id !== user.id)); }} className="w-4 h-4 sm:w-5 sm:h-5 rounded border-slate-300 text-gamboge-600 focus:ring-gamboge-500 accent-gamboge-600 shrink-0" />
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0">
              <button onClick={() => { setIsGrantModalOpen(false); setSelectedToGrant([]); }} className="w-full sm:flex-1 py-3 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm font-bold rounded-xl text-xs sm:text-sm tracking-widest uppercase transition-colors shrink-0">Cancel</button>
              <button onClick={handleConfirmGrant} disabled={selectedToGrant.length === 0} className="w-full sm:flex-1 shine-btn py-3 text-white font-bold rounded-xl text-xs sm:text-sm tracking-widest uppercase disabled:opacity-50 shrink-0">Grant ({selectedToGrant.length})</button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================
          REVOKE MODAL (Now perfectly centered aside the nav) 
      ============================================== */}
      {revokeModal.isOpen && revokeModal.userId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:pl-32 lg:pl-140">
          <div className="bg-white p-6 sm:p-8 w-full max-w-md rounded-3xl shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <div className="p-3 rounded-2xl mr-3 sm:mr-4 shadow-inner bg-red-100 text-red-600 shrink-0"><AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">Revoke Module Access</h3>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 truncate max-w-[200px]">Target: {revokeModal.userName}</p>
                </div>
              </div>
              <button onClick={() => setRevokeModal({ isOpen: false, userId: null, userName: '' })} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl mb-6 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
              This will <strong className="text-red-500">instantly revoke</strong> {revokeModal.userName}'s explicit override for <strong className="text-slate-800">{selectedModule?.name}</strong>.
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={() => setRevokeModal({ isOpen: false, userId: null, userName: '' })} className="w-full sm:flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm tracking-widest uppercase transition-colors shrink-0">Cancel</button>
              <button onClick={executeRevokeAccess} className="w-full sm:flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs sm:text-sm tracking-widest uppercase transition-colors shadow-sm shrink-0">Revoke Access</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}