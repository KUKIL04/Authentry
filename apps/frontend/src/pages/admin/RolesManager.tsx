import React, { useState, useEffect } from 'react';
import { AdminAPI } from '../../api/admin.api';
import { ShieldCheck, Users, Loader2, ShieldMinus, Search, Plus, Key, X, CheckSquare, AlertTriangle, Layers, Rocket, Edit3, Trash2, Fingerprint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeatureLockBanner } from '../../components/ui/FeatureLockBanner';

export default function RolesManager() {
  const navigate = useNavigate();
  const [isRbacLocked, setIsRbacLocked] = useState(false);

  const [roles, setRoles] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]); 
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // --- UI Layout States ---
  const [sidebarTab, setSidebarTab] = useState<'CUSTOM' | 'SYSTEM'>('CUSTOM');
  const [detailTab, setDetailTab] = useState<'USERS' | 'PERMISSIONS'>('USERS');

  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [unassignedUsers, setUnassignedUsers] = useState<any[]>([]);
  const [selectedToGrant, setSelectedToGrant] = useState<string[]>([]);

  // --- Role Composer Modal State ---
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  
  // 🚨 FIX 1: We separated "Mode" from "Loading State"
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null); // If null, we are Creating/Cloning!
  
  const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '' });
  const [roleBundles, setRoleBundles] = useState<Record<string, string>>({}); 
  const [initialForm, setInitialForm] = useState({ name: '', description: '' });
  const [initialBundles, setInitialBundles] = useState<Record<string, string>>({});

  // --- Action Modals ---
  const [revokeModal, setRevokeModal] = useState<{ isOpen: boolean, userId: string | null, userName: string }>({ isOpen: false, userId: null, userName: '' });
  const [deleteRoleModal, setDeleteRoleModal] = useState<{ isOpen: boolean, roleId: string | null, roleName: string }>({ isOpen: false, roleId: null, roleName: '' });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [rolesRes, appsRes, billingRes] = await Promise.all([
          AdminAPI.getRoles(),
          AdminAPI.getApps().catch(() => []),
          AdminAPI.getBillingStatus().catch(() => null)
        ]);
        
        if (billingRes && billingRes.subscription.tier_rank < 10) setIsRbacLocked(true);
        
        const rolesData = Array.isArray(rolesRes) ? rolesRes : [];
        setRoles(rolesData);
        setApps(Array.isArray(appsRes) ? appsRes : []);
        
        // 🚨 FIX 2: Default to the first Custom Role, fallback to Blueprint
        if (rolesData.length > 0) {
          const defaultRole = rolesData.find((r: any) => !r.is_system_template) || rolesData[0];
          setSidebarTab(defaultRole.is_system_template ? 'SYSTEM' : 'CUSTOM');
          handleSelectRole(defaultRole);
        }
      } catch (err) { 
        notify('error', 'Failed to fetch access roles.'); 
      } finally { 
        setIsLoadingRoles(false); 
      }
    };
    fetchInitialData();
  }, []);

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSelectRole = async (role: any) => {
    setSelectedRole(role); 
    setIsLoadingUsers(true); 
    setSearchQuery('');
    try {
      const assigned = await AdminAPI.getRoleUsers(role.id).catch(() => []);
      const authUsers = Array.isArray(assigned) ? assigned : [];
      setAssignedUsers(authUsers);
      
      const allUsers = await AdminAPI.getUsers().catch(() => []);
      const assignedIds = authUsers.map((u: any) => u.id);
      setUnassignedUsers(Array.isArray(allUsers) ? allUsers.filter((u: any) => !assignedIds.includes(u.id)) : []);
    } catch (err) { notify('error', `Failed to fetch users for ${role.name}`); } 
    finally { setIsLoadingUsers(false); }
  };

  // --- HELPER: ROBUST BUNDLE PARSER ---
  const getParsedBundles = (role: any) => {
    let parsed = role?.bundles || [];
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch(e) { parsed = []; }
    }
    const safeBundles: any[] = [];
    if (Array.isArray(parsed)) {
      parsed.forEach((b: any) => { 
        const mId = b.moduleId || b.moduleid || b.module_id;
        const aLvl = b.accessLevel || b.accesslevel || b.access_level;
        if (mId && aLvl) safeBundles.push({ moduleId: mId, accessLevel: aLvl }); 
      });
    }
    return safeBundles;
  };

  const getModuleInfo = (moduleId: string) => {
    for (const app of apps) {
      const mod = app.modules?.find((m: any) => m.id === moduleId);
      if (mod) return { appName: app.app_name, moduleName: mod.name };
    }
    return { appName: 'Unknown', moduleName: 'Unknown Module' };
  };

  // --- COMPOSER HANDLERS ---
  const openCreateComposer = () => {
    setEditingRoleId(null); // Create Mode
    setNewRoleForm({ name: '', description: '' });
    setRoleBundles({});
    setInitialForm({ name: '', description: '' });
    setInitialBundles({});
    setIsComposerOpen(true);
  };

  const openEditComposer = (role: any) => {
    setEditingRoleId(role.id); // Edit Mode
    const form = { name: role.name, description: role.description };
    
    const parsed = getParsedBundles(role);
    const bundles: Record<string, string> = {};
    parsed.forEach(b => bundles[b.moduleId] = b.accessLevel);
    
    setNewRoleForm(form);
    setRoleBundles(bundles);
    setInitialForm(form);
    setInitialBundles(bundles);
    setIsComposerOpen(true);
  };

  const openCloneComposer = (role: any) => {
    setEditingRoleId(null); // Create Mode (Will POST a new role)
    const form = { name: `${role.name} (Custom)`, description: role.description };
    
    const parsed = getParsedBundles(role);
    const bundles: Record<string, string> = {};
    parsed.forEach(b => bundles[b.moduleId] = b.accessLevel);
    
    setNewRoleForm(form);
    setRoleBundles(bundles);
    setInitialForm(form);
    setInitialBundles(bundles);
    setIsComposerOpen(true);
  };

  const isComposerDirty = () => {
    if (newRoleForm.name !== initialForm.name || newRoleForm.description !== initialForm.description) return true;
    const currentKeys = Object.keys(roleBundles);
    const initialKeys = Object.keys(initialBundles);
    if (currentKeys.length !== initialKeys.length) return true;
    return currentKeys.some(key => roleBundles[key] !== initialBundles[key]);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); // 🚨 Fix: Correctly track loading state!
    try {
      const bundleArray = Object.entries(roleBundles).map(([moduleId, accessLevel]) => ({ moduleId, accessLevel }));
      
      let updatedRole;
      if (editingRoleId) {
        updatedRole = await AdminAPI.updateRole(editingRoleId, { name: newRoleForm.name, description: newRoleForm.description, bundles: bundleArray });
        notify('success', 'Custom Job Title updated successfully.');
      } else {
        updatedRole = await AdminAPI.createRole({ name: newRoleForm.name, description: newRoleForm.description, bundles: bundleArray });
        notify('success', 'Custom Job Title configured successfully.');
      }

      setIsComposerOpen(false);
      
      const updatedRoles = await AdminAPI.getRoles();
      setRoles(updatedRoles);
      
      const freshRole = updatedRoles.find((r: any) => r.id === (editingRoleId || updatedRole?.role?.id));
      if (freshRole) {
        setSidebarTab('CUSTOM');
        handleSelectRole(freshRole);
      }

    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to save role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACCESS HANDLERS ---
  const executeRevokeRole = async () => {
    if (!selectedRole || !revokeModal.userId) return;
    try {
      await AdminAPI.revokeRoleAccess(revokeModal.userId, selectedRole.id); 
      notify('success', 'Role revoked successfully.');
      setAssignedUsers(prev => prev.filter(u => u.id !== revokeModal.userId));
      setRevokeModal({ isOpen: false, userId: null, userName: '' });
    } catch (err: any) { notify('error', err.response?.data?.error || 'Failed to revoke role'); }
  };

  const handleConfirmGrant = async () => {
    if (selectedToGrant.length === 0 || !selectedRole) return;
    try {
      await AdminAPI.grantBulkRoleAccess(selectedRole.id, selectedToGrant);
      notify('success', `Role granted to ${selectedToGrant.length} personnel.`);
      setIsGrantModalOpen(false); setSelectedToGrant([]);
      handleSelectRole(selectedRole);
    } catch (err: any) { notify('error', 'Failed to grant roles.'); }
  };

  const executeDeleteRole = async () => {
    if (!deleteRoleModal.roleId) return;
    try {
      await AdminAPI.deleteRole(deleteRoleModal.roleId);
      notify('success', 'Role permanently deleted.');
      setDeleteRoleModal({ isOpen: false, roleId: null, roleName: '' });
      
      const updatedRoles = await AdminAPI.getRoles();
      setRoles(updatedRoles);
      if (updatedRoles.length > 0) {
        const defaultRole = updatedRoles.find((r: any) => !r.is_system_template) || updatedRoles[0];
        setSidebarTab(defaultRole.is_system_template ? 'SYSTEM' : 'CUSTOM');
        handleSelectRole(defaultRole);
      } else {
        setSelectedRole(null);
        setAssignedUsers([]);
      }
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to delete role.');
    }
  };

  const filteredUsers = assignedUsers.filter(u => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUnassigned = unassignedUsers.filter(u => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(modalSearchQuery.toLowerCase()));
  const activeRolesList = roles.filter(r => sidebarTab === 'CUSTOM' ? !r.is_system_template : r.is_system_template);

  return (
    <div className="w-full relative h-[calc(100vh)] flex flex-col bg-slate-50/50">
      
      {/* GLOBAL HEADER */}
      <div className="shrink-0 px-6 sm:px-10 py-5 bg-white border-b border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-40">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Access Control (RBAC)</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage job titles, map permissions, and audit personnel.</p>
        </div>
      </div>

      {isRbacLocked && (
        <div className="px-6 sm:px-10 pt-6 shrink-0 relative z-30">
          <FeatureLockBanner title="Advanced RBAC is Locked" description="Upgrade your workspace to define custom roles and enforce strict access controls." requiredTier="Premium" onUpgrade={() => navigate('/admin/billing')} />
        </div>
      )}

      {message.text && (
        <div className="px-6 sm:px-10 pt-4 shrink-0 relative z-30">
          <div className={`px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{message.text}</div>
        </div>
      )}

      {/* 🚨 MASTER-DETAIL LAYOUT */}
      <div className={`flex-1 flex flex-col lg:flex-row gap-6 p-6 sm:p-10 overflow-hidden max-w-[1600px] mx-auto w-full transition-all duration-300 ${isRbacLocked ? 'opacity-40 pointer-events-none grayscale-[50%]' : ''}`}>
        
        {/* LEFT PANE (Master List) */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden h-[400px] lg:h-full">
          
          <div className="p-5 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center">
                <div className="p-2 bg-slate-50 rounded-lg mr-3 shadow-inner border border-slate-100 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-gamboge-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Roles Directory</h2>
              </div>
              <button onClick={openCreateComposer} disabled={isRbacLocked} title="Create Custom Role" className="p-2 bg-gamboge-50 text-gamboge-600 hover:bg-gamboge-100 rounded-xl transition-colors border border-gamboge-100 shadow-sm disabled:opacity-50">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-slate-100/70 p-1.5 rounded-xl border border-slate-200/50">
              <button onClick={() => setSidebarTab('CUSTOM')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${sidebarTab === 'CUSTOM' ? 'bg-white shadow-sm text-slate-800 border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>
                Custom Roles
              </button>
              <button onClick={() => setSidebarTab('SYSTEM')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${sidebarTab === 'SYSTEM' ? 'bg-white shadow-sm text-slate-800 border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>
                Blueprints
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto neumorphic-scrollbar p-3 space-y-2 bg-slate-50/30">
            {isLoadingRoles ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : activeRolesList.length === 0 ? (
              <div className="text-center p-8 text-slate-400 font-medium text-sm">No {sidebarTab.toLowerCase()} roles found.</div>
            ) : (
              activeRolesList.map(role => (
                <div 
                  key={role.id} 
                  onClick={() => handleSelectRole(role)} 
                  className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-200 ${selectedRole?.id === role.id ? 'bg-white border-gamboge-400 shadow-sm ring-1 ring-gamboge-100' : 'bg-transparent border-transparent hover:bg-slate-100/70 border hover:border-slate-200/60'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-extrabold text-sm sm:text-base truncate pr-2 ${selectedRole?.id === role.id ? 'text-gamboge-700' : 'text-slate-700'}`}>{role.name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">{role.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANE (Detail View) */}
        <div className="flex-1 flex flex-col bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden h-[600px] lg:h-full">
          {selectedRole ? (
            <>
              {/* Detail Header */}
              <div className="p-6 sm:p-8 border-b border-slate-200 bg-slate-50/50 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{selectedRole.name}</h2>
                      {selectedRole.is_system_template && <span className="bg-gamboge-100 text-gamboge-700 border border-gamboge-200 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest">Blueprint</span>}
                    </div>
                    <p className="text-sm text-slate-500 font-medium max-w-2xl">{selectedRole.description}</p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {selectedRole.is_system_template ? (
                      <button onClick={() => openCloneComposer(selectedRole)} className="py-2 px-4 bg-white border border-slate-200 shadow-sm hover:border-gamboge-300 hover:text-gamboge-600 text-slate-700 font-bold rounded-xl text-xs tracking-widest uppercase transition-colors flex items-center">
                        <Layers className="w-4 h-4 mr-2" /> Clone Blueprint
                      </button>
                    ) : (
                      <>
                        <button onClick={() => openEditComposer(selectedRole)} className="py-2 px-4 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs tracking-widest uppercase transition-colors flex items-center">
                          <Edit3 className="w-4 h-4 mr-2" /> Edit
                        </button>
                        <button onClick={() => setDeleteRoleModal({ isOpen: true, roleId: selectedRole.id, roleName: selectedRole.name })} className="py-2 px-4 bg-white border border-slate-200 shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-500 font-bold rounded-xl text-xs tracking-widest uppercase transition-colors flex items-center">
                          <Trash2 className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="flex px-6 sm:px-8 border-b border-slate-200 shrink-0">
                <button onClick={() => setDetailTab('USERS')} className={`px-4 py-4 text-xs font-bold uppercase tracking-widest transition-all ${detailTab === 'USERS' ? 'text-gamboge-600 border-b-2 border-gamboge-500' : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'}`}>
                  Personnel ({assignedUsers.length})
                </button>
                <button onClick={() => setDetailTab('PERMISSIONS')} className={`px-4 py-4 text-xs font-bold uppercase tracking-widest transition-all ${detailTab === 'PERMISSIONS' ? 'text-gamboge-600 border-b-2 border-gamboge-500' : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'}`}>
                  Entitlements & Scope
                </button>
              </div>

              {/* Detail Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto neumorphic-scrollbar p-6 sm:p-8 bg-white">
                
                {/* CONTENT: USERS */}
                {detailTab === 'USERS' && (
                  <div className="flex flex-col h-full">
                    <div className="flex flex-col sm:flex-row gap-3 mb-6 shrink-0">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400 shrink-0" />
                        <input type="text" placeholder="Filter personnel..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="embossed-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 outline-none" />
                      </div>
                      <button onClick={() => setIsGrantModalOpen(true)} className="shine-btn py-2.5 px-6 text-white font-bold rounded-xl text-xs tracking-widest uppercase shrink-0">Grant Role</button>
                    </div>

                    {isLoadingUsers ? (
                      <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                        <Users className="w-12 h-12 mb-4 opacity-20" />
                        <span className="text-sm font-bold tracking-wide">{searchQuery ? 'No personnel match filter.' : 'No active assignments for this role.'}</span>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest">
                              <th className="py-3 px-5 font-bold">Employee Name</th>
                              <th className="py-3 px-5 font-bold hidden sm:table-cell">Contact Identity</th>
                              <th className="py-3 px-5 font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(user => (
                              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-5">
                                  <div className="font-bold text-slate-700 text-sm">{user.first_name} {user.last_name}</div>
                                  <div className="text-[11px] text-slate-500 font-medium sm:hidden mt-0.5">{user.email}</div>
                                </td>
                                <td className="py-3.5 px-5 text-sm text-slate-500 font-medium hidden sm:table-cell">{user.email}</td>
                                <td className="py-3.5 px-5 text-right">
                                  <button onClick={() => setRevokeModal({ isOpen: true, userId: user.id, userName: `${user.first_name} ${user.last_name}` })} className="text-slate-400 hover:text-red-500 hover:bg-red-50 font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-widest transition-all">
                                    Revoke
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* CONTENT: PERMISSIONS (READ-ONLY VIEW) */}
                {detailTab === 'PERMISSIONS' && (() => {
                  const parsedBundles = getParsedBundles(selectedRole);

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {parsedBundles.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400">
                          <Fingerprint className="w-12 h-12 mb-4 opacity-20" />
                          <span className="text-sm font-bold tracking-wide">This role has no specific module access defined.</span>
                        </div>
                      ) : (
                        parsedBundles.map((bundle, idx) => {
                          const appName = bundle.appName || getModuleInfo(bundle.moduleId).appName;
                          const moduleName = bundle.moduleName || getModuleInfo(bundle.moduleId).moduleName;
                          
                          // Check if the tenant actually has this app assigned
                          // 'apps' is the array of apps licensed to THIS specific tenant
                          const isLicensed = apps.some(a => a.name === appName || a.id === bundle.appId);

                          return (
                            <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border shadow-sm transition-all ${isLicensed ? 'bg-slate-50 border-slate-200/60' : 'bg-slate-100/50 border-slate-200 border-dashed opacity-50 grayscale'}`}>
                              <div className="flex items-center overflow-hidden mr-3">
                                {isLicensed ? (
                                  <CheckSquare className="w-5 h-5 text-gamboge-500 mr-3 shrink-0" />
                                ) : (
                                  <ShieldMinus className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                                )}
                                
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold uppercase tracking-widest truncate flex items-center">
                                    <span className={isLicensed ? 'text-slate-400' : 'text-slate-500'}>{appName}</span>
                                    {!isLicensed && <span className="ml-2 text-[8px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Unlicensed</span>}
                                  </div>
                                  <div className={`text-sm font-bold truncate ${isLicensed ? 'text-slate-700' : 'text-slate-500'}`}>{moduleName}</div>
                                </div>
                              </div>
                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded border tracking-widest shrink-0 ${!isLicensed ? 'bg-slate-200 text-slate-400 border-slate-300' : bundle.accessLevel === 'WRITE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                                {bundle.accessLevel}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()}

              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6"><Key className="w-8 h-8 text-slate-300" /></div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No Role Selected</h3>
              <p className="text-slate-500 text-sm font-medium">Select a role from the directory to view or manage its configuration.</p>
            </div>
          )}
        </div>
      </div>

      {/* ==============================================
          ROLE COMPOSER MODAL (CREATE / EDIT / CLONE) 
      ============================================== */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 md:pl-32 lg:pl-140 overflow-hidden">
          <div className="bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl w-full max-w-3xl lg:max-w-5xl flex flex-col max-h-full animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-5 sm:p-6 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl sm:rounded-t-[2rem] shrink-0">
              <div className="min-w-0 pr-4">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center truncate">
                  <Layers className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-gamboge-600 shrink-0" /> 
                  <span className="truncate">{editingRoleId ? 'Edit Role Details' : 'Role Composer'}</span>
                </h3>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 sm:mt-1.5 truncate">
                  {editingRoleId ? 'Modify access rights for this Job Title.' : 'Define a custom Job Title and configure its precise access rights.'}
                </p>
              </div>
              <button onClick={() => setIsComposerOpen(false)} className="p-2 sm:p-2.5 bg-white hover:bg-slate-100 rounded-full text-slate-500 shadow-sm border border-slate-200 transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto neumorphic-scrollbar">
              <form id="roleForm" onSubmit={handleSaveRole} className="p-5 sm:p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
                  
                  {/* Left Column: Role Metadata */}
                  <div className="w-full lg:w-5/12 space-y-5 sm:space-y-6 shrink-0">
                    <div className="space-y-2">
                      <label className="block text-[14px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Role Designation (Job Title)</label>
                      <input type="text" required value={newRoleForm.name} onChange={e => setNewRoleForm({...newRoleForm, name: e.target.value})} placeholder="e.g., Regional HR Manager" className="embossed-input w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all focus:border-gamboge-400 focus:ring-2 focus:ring-gamboge-100" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-[14px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Description & Duties</label>
                      <textarea required value={newRoleForm.description} onChange={e => setNewRoleForm({...newRoleForm, description: e.target.value})} placeholder="Describe the responsibilities and scope of this role..." className="embossed-input w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-sm font-medium text-slate-600 outline-none min-h-[100px] sm:min-h-[120px] resize-none transition-all focus:border-gamboge-400 focus:ring-2 focus:ring-gamboge-100" />
                    </div>

                    <div className="bg-gamboge-50 border border-gamboge-100 p-4 sm:p-5 rounded-xl sm:rounded-2xl">
                      <div className="flex items-center mb-2">
                        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-gamboge-600 mr-2 shrink-0" />
                        <span className="font-bold text-gamboge-800 text-xs sm:text-sm">Security Best Practice</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-gamboge-700 font-medium leading-relaxed">
                        Follow the Principle of Least Privilege. Only bundle the exact software modules necessary for this job designation to function effectively.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Module Checklist */}
                  <div className="w-full lg:w-7/12 flex flex-col min-h-[300px] lg:min-h-[400px]">
                    <label className="block text-[14px] font-extrabold text-slate-400 uppercase tracking-widest ml-1 mb-2 sm:mb-3">Software Entitlements (The Bundle)</label>
                    <div className="inner-depth rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 flex-1 overflow-y-auto neumorphic-scrollbar space-y-3 sm:space-y-4 border border-slate-200/50 min-h-[250px]">
                      {apps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400 h-full">
                          <Rocket className="w-8 h-8 sm:w-10 sm:h-10 mb-3 opacity-20" />
                          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center px-4">No Enterprise Suites Allocated</p>
                        </div>
                      ) : (
                        apps.map(app => (
                          <div key={app.app_id} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-slate-50/80 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-100 flex items-center">
                              <h4 className="text-[10px] sm:text-[12px] font-extrabold text-slate-500 uppercase tracking-widest truncate">{app.app_name}</h4>
                            </div>
                            
                            <div className="divide-y divide-slate-100 flex-1">
                              {app.modules?.length === 0 ? (
                                <div className="p-3 sm:p-4 bg-slate-50 flex items-start opacity-70">
                                  <div className="mt-0.5 relative flex items-center justify-center shrink-0">
                                    <input disabled type="checkbox" className="w-4 h-4 sm:w-5 sm:h-5 rounded sm:rounded-md border-2 border-slate-300 bg-slate-100 cursor-not-allowed appearance-none" />
                                  </div>
                                  <div className="ml-3 flex-1 min-w-0 pr-2 sm:pr-4">
                                    <span className="text-xs sm:text-sm font-bold text-slate-700 truncate block">{app.app_name} (Base Suite)</span>
                                    <p className="text-[9px] sm:text-[10px] text-amber-600 font-bold mt-1 flex items-center uppercase tracking-widest">
                                      <AlertTriangle className="w-3 h-3 mr-1 shrink-0" /> SuperAdmin Setup Required
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                app.modules?.map((mod: any) => {
                                  const isChecked = !!roleBundles[mod.id];
                                  return (
                                    <div key={mod.id} className={`p-3 sm:p-4 transition-colors ${isChecked ? 'bg-gamboge-50/30' : 'hover:bg-slate-50'}`}>
                                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                        <label className="flex items-start cursor-pointer flex-1 group min-w-0">
                                          <div className="mt-0.5 relative flex items-center justify-center shrink-0">
                                            <input 
                                              type="checkbox" 
                                              checked={isChecked} 
                                              onChange={(e) => {
                                                if (e.target.checked) setRoleBundles(prev => ({ ...prev, [mod.id]: 'READ' }));
                                                else { const newB = { ...roleBundles }; delete newB[mod.id]; setRoleBundles(newB); }
                                              }} 
                                              className="w-4 h-4 sm:w-5 sm:h-5 rounded sm:rounded-md border-2 border-slate-300 text-gamboge-600 focus:ring-gamboge-500 focus:ring-offset-1 sm:focus:ring-offset-2 transition-colors cursor-pointer appearance-none checked:bg-gamboge-600 checked:border-gamboge-600" 
                                            />
                                            {isChecked && <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white absolute pointer-events-none" strokeWidth={3} />}
                                          </div>
                                          <div className="ml-3 flex-1 min-w-0 pr-2 sm:pr-4">
                                            <span className="text-xs sm:text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors block truncate">{mod.name}</span>
                                            <p className="text-[10px] sm:text-[12px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{mod.description}</p>
                                          </div>
                                        </label>

                                        {isChecked && (
                                          <select value={roleBundles[mod.id]} onChange={e => setRoleBundles(prev => ({...prev, [mod.id]: e.target.value}))} className="bg-white border border-gamboge-200 text-gamboge-700 rounded-lg text-[10px] sm:text-[12px] font-bold tracking-widest uppercase py-1.5 sm:py-2 px-2 outline-none focus:border-gamboge-500 shadow-sm cursor-pointer shrink-0 w-full sm:w-auto">
                                            <option value="READ">Read</option>
                                            <option value="WRITE">Write</option>
                                          </select>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-5 sm:p-6 lg:p-8 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 bg-slate-50/50 rounded-b-3xl sm:rounded-b-[2rem] shrink-0">
              <button type="button" onClick={() => setIsComposerOpen(false)} className="w-full sm:w-auto py-3 sm:py-3.5 px-6 sm:px-8 text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 font-extrabold rounded-xl sm:rounded-2xl text-xs tracking-widest uppercase transition-all">
                Discard
              </button>
              
              {/* We now use isSubmitting specifically for the button state! */}
              <button type="submit" form="roleForm" disabled={isSubmitting || !newRoleForm.name || Object.keys(roleBundles).length === 0 || !isComposerDirty()} className="w-full sm:w-auto shine-btn py-3 sm:py-3.5 px-8 sm:px-10 text-white font-extrabold rounded-xl sm:rounded-2xl text-xs tracking-widest uppercase disabled:opacity-50 disabled:shadow-none shadow-lg shadow-gamboge-500/30">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingRoleId ? 'Save Changes' : 'Compile Role')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE ROLE CONFIRMATION */}
      {deleteRoleModal.isOpen && deleteRoleModal.roleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:pl-32 lg:pl-140">
          <div className="bg-white p-6 sm:p-8 w-full max-w-md rounded-3xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <div className="p-3 rounded-2xl mr-3 sm:mr-4 shadow-inner bg-red-100 text-red-600 shrink-0">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">Delete Role</h3>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 truncate max-w-[200px]">Target: {deleteRoleModal.roleName}</p>
                </div>
              </div>
              <button onClick={() => setDeleteRoleModal({ isOpen: false, roleId: null, roleName: '' })} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed border border-slate-200/60">
              This action is <strong className="text-red-500">permanent</strong>. Deleting this role will instantly revoke all permissions associated with it, affecting any personnel currently assigned to it.
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={() => setDeleteRoleModal({ isOpen: false, roleId: null, roleName: '' })} className="w-full sm:flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm tracking-widest uppercase transition-colors shrink-0">Cancel</button>
              <button onClick={executeDeleteRole} className="w-full sm:flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs sm:text-sm tracking-widest uppercase transition-colors shadow-sm shrink-0">Delete Role</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GRANT ROLE */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:pl-32 lg:pl-140">
          <div className="bg-white p-6 sm:p-8 w-full max-w-md sm:max-w-lg rounded-3xl shadow-xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight flex items-center">
                  <CheckSquare className="w-5 h-5 mr-2 text-gamboge-600 shrink-0" /> Assign Role
                </h3>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 truncate max-w-[200px] sm:max-w-xs">
                  Granting <span className="text-gamboge-700">{selectedRole?.name}</span>
                </p>
              </div>
              <button onClick={() => { setIsGrantModalOpen(false); setSelectedToGrant([]); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="relative mb-4 shrink-0">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400 shrink-0" />
              <input type="text" placeholder="Search unassigned personnel..." value={modalSearchQuery} onChange={(e) => setModalSearchQuery(e.target.value)} className="embossed-input w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-400 outline-none border border-slate-200 focus:border-gamboge-300" />
            </div>
            <div className="bg-slate-50 border border-slate-200/60 p-2 rounded-2xl flex-1 overflow-y-auto mb-6 neumorphic-scrollbar">
              {filteredUnassigned.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm font-medium">{modalSearchQuery ? 'No unassigned users match.' : 'All users already have this role.'}</div>
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
              <button onClick={handleConfirmGrant} disabled={selectedToGrant.length === 0} className="w-full sm:flex-1 shine-btn py-3 text-white font-bold rounded-xl text-xs sm:text-sm tracking-widest uppercase disabled:opacity-50 shrink-0">Assign ({selectedToGrant.length})</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REVOKE ROLE */}
      {revokeModal.isOpen && revokeModal.userId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:pl-32 lg:pl-140">
          <div className="bg-white p-6 sm:p-8 w-full max-w-md rounded-3xl shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <div className="p-3 rounded-2xl mr-3 sm:mr-4 shadow-inner bg-red-100 text-red-600 shrink-0"><AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">Revoke Assignment</h3>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 truncate max-w-[200px]">Target: {revokeModal.userName}</p>
                </div>
              </div>
              <button onClick={() => setRevokeModal({ isOpen: false, userId: null, userName: '' })} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl mb-6 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
              This will <strong className="text-red-500">instantly remove</strong> the <strong className="text-slate-800">{selectedRole?.name}</strong> role.
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={() => setRevokeModal({ isOpen: false, userId: null, userName: '' })} className="w-full sm:flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm tracking-widest uppercase transition-colors shrink-0">Cancel</button>
              <button onClick={executeRevokeRole} className="w-full sm:flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs sm:text-sm tracking-widest uppercase transition-colors shadow-sm shrink-0">Revoke Role</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}