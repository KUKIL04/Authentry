import React, { useState, useEffect, useRef } from 'react';
import { AdminAPI } from '../../api/admin.api';
import { InputField } from '../../components/ui/InputField';
import { Link as LinkIcon, Check, Copy, Loader2, UserCheck, X, AlertTriangle, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeatureLockBanner } from '../../components/ui/FeatureLockBanner';

export default function ProvisioningManager() {
  const navigate = useNavigate();
  const [mauUsage, setMauUsage] = useState<{current: number, max: number | null} | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteExpireHours, setInviteExpireHours] = useState(24);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteEmployeeId, setInviteEmployeeId] = useState('');

  const [users, setUsers] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [selections, setSelections] = useState<Record<string, { modules: string[], roles: string[] }>>({});
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [revokeModal, setRevokeModal] = useState<{isOpen: boolean, inviteId: string | null, email: string}>({ isOpen: false, inviteId: null, email: '' });

  // 🚨 NEW: State for the Roles Dropdown Popover
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, []);

  // 🚨 NEW: Click-outside listener for the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setIsLoadingQueue(true);
    try {
      const [usersRes, modulesRes, rolesRes, invitesRes, billingRes] = await Promise.all([
        AdminAPI.getUsers().catch(() => []), 
        AdminAPI.getApps().catch(() => []), 
        AdminAPI.getRoles().catch(() => []), 
        AdminAPI.getPendingInvitations().catch(() => []),
        AdminAPI.getBillingStatus().catch(() => null)
      ]);
      
      setUsers(Array.isArray(usersRes) ? usersRes : []); 
      setModules(Array.isArray(modulesRes) ? modulesRes : []);
      setRoles(Array.isArray(rolesRes) ? rolesRes : []); 
      setPendingInvitations(Array.isArray(invitesRes) ? invitesRes : []);
      
      if (billingRes?.usage?.mau) {
        setMauUsage(billingRes.usage.mau);
      }
    } catch (err) { 
      notify('error', 'Failed to fetch provisioning data.'); 
    } finally { 
      setIsLoadingQueue(false); 
    }
  };

  const isLimitReached = mauUsage?.max !== null && (mauUsage?.current || 0) >= (mauUsage?.max || 0);

  const notify = (type: 'success' | 'error', text: string) => { setMessage({ type, text }); setTimeout(() => setMessage({ type: '', text: '' }), 5000); };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault(); setIsGenerating(true);
    try {
      const res = await AdminAPI.inviteUser(inviteEmail, inviteExpireHours, inviteEmployeeId);
      if (res.existingUser) {
        notify('success', res.message); setGeneratedLink(''); fetchData(); 
      } else {
        let linkToShare = res.inviteLink;
        if (!linkToShare.includes('http')) linkToShare = `${window.location.origin}/register?token=${res.inviteLink}`;
        setGeneratedLink(linkToShare); notify('success', res.message || 'Invitation link generated.');
      }
      fetchData(); setInviteEmail(''); setInviteEmployeeId('');
    } catch (err: any) { notify('error', err.response?.data?.error || 'Failed to process invite'); }
    finally { setIsGenerating(false); }
  };

  const executeRevokeInvite = async () => {
    if (!revokeModal.inviteId) return;
    try { await AdminAPI.revokeInvitation(revokeModal.inviteId); notify('success', 'Invitation link revoked.'); fetchData(); setRevokeModal({ isOpen: false, inviteId: null, email: '' }); } 
    catch (err: any) { notify('error', err.response?.data?.error || 'Failed to revoke invitation'); }
  };

  const handleCheckboxChange = (userId: string, type: 'modules' | 'roles', itemId: string, checked: boolean) => {
    setSelections(prev => {
      const userSels = prev[userId] || { modules: [], roles: [] };
      const updatedType = checked ? [...userSels[type], itemId] : userSels[type].filter(id => id !== itemId);
      return { ...prev, [userId]: { ...userSels, [type]: updatedType } };
    });
  };

  const handleApproveUser = async (userId: string) => {
    const userSelections = selections[userId] || { modules: [], roles: [] };
    try {
      await AdminAPI.grantAccess(userId, [], userSelections.roles);
      notify('success', 'User activated and assets assigned.');
      setSelections(prev => { const next = { ...prev }; delete next[userId]; return next; });
      fetchData(); 
    } catch (err: any) { notify('error', err.response?.data?.error || 'Failed to approve user'); }
  };

  const pendingUsers = users.filter(u => u.status === 'PENDING');

  return (
    <div className="w-full pb-12 relative">
      {/* FLAWLESS STICKY HEADER */}
      <div className="sticky top-0 z-40 px-4 sm:px-8 lg:px-12 py-4 lg:py-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm supports-[backdrop-filter]:bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Provisioning & Approvals</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Generate secure invites and provision workspace access.</p>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-12 mt-8 max-w-7xl mx-auto space-y-8">
        {message.text && (
          <div className={`px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 w-full">
          {/* GENERATE INVITE */}
          <div className="embossed-card p-6 sm:p-8 w-full lg:w-2/5 flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold text-slate-700 mb-6 flex items-center">
              <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><LinkIcon className="w-5 h-5 text-gamboge-600 shrink-0" /></div>
              Generate Invitation
            </h2>

            {isLimitReached && mauUsage && (
              <div className="mb-6 relative z-20">
                <FeatureLockBanner 
                  title="User Limit Reached" 
                  description={`Your workspace has reached the limit of ${mauUsage.max} active users. Upgrade to invite more personnel.`}
                  requiredTier="Premium"
                  layout="col"
                  onUpgrade={() => navigate('/admin/billing')}
                />
              </div>
            )}

            <div className={`transition-all duration-300 w-full ${isLimitReached ? 'opacity-40 pointer-events-none grayscale-[50%]' : ''}`}>  
              <form onSubmit={handleGenerateInvite} className="space-y-4 flex-grow w-full">
                {/* RESPONSIVE LAYOUT AS REQUESTED */}
                <div className="flex flex-col gap-4 w-full">
                  <div className="w-full">
                    <InputField 
                      label="User Email" 
                      type="email" 
                      value={inviteEmail} 
                      onChange={(e) => setInviteEmail(e.target.value)} 
                      required 
                    />
                  </div> 
                  
                  <div className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="w-full md:w-1/2">
                      <InputField 
                        label="User ID" 
                        type="text" 
                        value={inviteEmployeeId} 
                        onChange={(e) => setInviteEmployeeId(e.target.value)} 
                        placeholder="EMP-001" 
                      />
                    </div> 
                    
                    <div className="w-full md:w-1/2 shrink-0">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3.5">Expiry</label>
                      <select 
                        value={inviteExpireHours} 
                        onChange={(e) => setInviteExpireHours(Number(e.target.value))} 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-gamboge-500"
                      >
                        <option value={12}>12 Hours</option>
                        <option value={24}>24 Hours</option>
                        <option value={48}>48 Hours</option>
                        <option value={168}>7 Days</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={isGenerating || !inviteEmail} className="shine-btn w-full flex justify-center items-center py-4 text-white font-bold rounded-2xl text-sm tracking-widest uppercase mt-4 disabled:opacity-50 shadow-md transition-all">
                  {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin mr-2 shrink-0" /> Dispatching...</> : 'Create Secure Link'}
                </button>
              </form>
            </div>  

            {generatedLink && (
              <div className="mt-6 p-4 sm:p-5 inner-depth rounded-2xl animate-in fade-in slide-in-from-top-4 w-full">
                <p className="text-[10px] sm:text-xs text-slate-500 mb-2 font-bold uppercase tracking-widest">Share this link:</p>
                <div className="flex items-center justify-between bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-300 w-full overflow-hidden">
                  <code className="text-gamboge-700 text-xs sm:text-sm truncate mr-2 sm:mr-4 font-semibold block w-full">{generatedLink}</code>
                  <button onClick={() => { navigator.clipboard.writeText(generatedLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-slate-400 hover:text-slate-700 p-2 shrink-0">
                    {copied ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 shrink-0" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE SENT LINKS */}
          <div className="embossed-card p-6 sm:p-8 w-full lg:w-3/5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-700 mb-6 flex items-center">
              <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><LinkIcon className="w-5 h-5 text-gamboge-600 shrink-0" /></div>
              Active Sent Links
            </h2>
            {isLoadingQueue ? (
               <div className="flex items-center justify-center py-12 text-slate-500 font-bold uppercase tracking-widest text-xs sm:text-sm">
                 <Loader2 className="w-5 h-5 animate-spin mr-3 shrink-0" /> Loading Links...
               </div>
            ) : (
              <div className="inner-depth p-2 sm:p-4 rounded-2xl sm:rounded-3xl overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500 text-[9px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap">
                      <th className="py-3 px-3 sm:px-4 font-bold">Email Target</th>
                      <th className="py-3 px-3 sm:px-4 font-bold">Expires At</th>
                      <th className="py-3 px-3 sm:px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvitations.length === 0 ? (
                      <tr><td colSpan={3} className="py-8 text-center text-slate-500 font-medium text-xs sm:text-sm">No pending links.</td></tr>
                    ) : (
                      pendingInvitations.map(invite => (
                        <tr key={invite.id} className="border-b border-slate-300/50 hover:bg-slate-50">
                          <td className="py-4 px-3 sm:px-4">
                            <div className="font-bold text-slate-700 text-xs sm:text-sm">{invite.email}</div>
                            <div className="text-[9px] sm:text-[10px] text-slate-400 font-semibold mt-1">Sent: {new Date(invite.created_at).toLocaleDateString()}</div>
                          </td>
                          <td className="py-4 px-3 sm:px-4 text-[10px] sm:text-xs font-semibold text-gamboge-600 whitespace-nowrap">
                            {new Date(invite.expires_at).toLocaleString()}
                          </td>
                          <td className="py-4 px-3 sm:px-4 text-right">
                            <div className="flex items-center justify-end gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 font-bold text-[9px] sm:text-[10px] rounded-md uppercase tracking-wider shrink-0">Unused</span>
                              <button onClick={() => setRevokeModal({ isOpen: true, inviteId: invite.id, email: invite.email })} className="text-[10px] sm:text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors shrink-0">Revoke</button>
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

        {/* WAITING ROOM TABLE */}
        <div className="embossed-card p-4 sm:p-8 w-full">
          <h2 className="text-lg sm:text-xl font-bold text-slate-700 mb-6 flex items-center">
            <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><UserCheck className="w-5 h-5 text-gamboge-600 shrink-0" /></div>
            Waiting Room Approvals ({pendingUsers.length})
          </h2>

          {isLoadingQueue ? (
            <div className="flex items-center justify-center py-12 text-slate-500 font-bold uppercase tracking-widest text-xs sm:text-sm">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mr-3 shrink-0" /> Loading Queue...
            </div>
          ) : (
            <div className="inner-depth p-2 sm:p-4 rounded-2xl sm:rounded-3xl overflow-x-auto w-full min-h-[300px]">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                    <th className="py-4 px-4 sm:px-6 font-bold w-1/3">User</th>
                    <th className="py-4 px-4 sm:px-6 font-bold w-1/3">Assign Roles</th>
                    <th className="py-4 px-4 sm:px-6 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.length === 0 ? (
                    <tr><td colSpan={3} className="py-12 text-center text-slate-500 font-medium">No users currently in the waiting room.</td></tr>
                  ) : (
                    pendingUsers.map(user => (
                      <tr key={user.id} className="border-b border-slate-300/50 hover:bg-slate-50 transition-colors">
                        <td className="py-4 sm:py-5 px-4 sm:px-6">
                          <div className="font-bold text-slate-700 text-sm sm:text-base">{user.first_name} {user.last_name}</div>
                          <div className="text-[12px] sm:text-xs text-slate-500 font-medium">{user.email}</div>
                          <div className="text-[12px] sm:text-[14px] text-gamboge-600 font-mono mt-1 font-bold">
                            ID: {user.employee_id || 'Not Assigned'}
                          </div>
                        </td>
                        
                        {/* SLEEK ROLE DROPDOWN UI */}
                        <td className="py-4 sm:py-5 px-4 sm:px-6 align-middle">
                          <div className="relative inline-block text-left w-full max-w-[220px]" ref={openDropdownId === user.id ? dropdownRef : null}>
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                              className={`w-full px-4 py-2.5 bg-slate-100 border hover:bg-white text-xs font-bold rounded-xl flex items-center justify-between shadow-sm transition-all ${
                                selections[user.id]?.roles?.length ? 'border-gamboge-400 text-gamboge-700 ring-1 ring-gamboge-100' : 'border-slate-200 text-slate-600'
                              }`}
                            >
                              <span className="truncate mr-2">
                                {selections[user.id]?.roles?.length 
                                  ? `${selections[user.id].roles.length} Role(s) Selected` 
                                  : 'Select Roles'}
                              </span>
                              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openDropdownId === user.id ? 'rotate-180 text-gamboge-500' : 'text-slate-400'}`} />
                            </button>

                            {openDropdownId === user.id && (
                              <div className="absolute z-50 mt-2 w-56 rounded-2xl bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 py-2 left-0 animate-in fade-in slide-in-from-top-2">
                                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                                  <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Assign Job Titles</p>
                                </div>
                                <div className="max-h-48 overflow-y-auto neumorphic-scrollbar px-1">
                                  {roles.length === 0 ? (
                                    <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">No roles created yet</div>
                                  ) : (
                                    roles.map(role => {
                                      const isSelected = selections[user.id]?.roles?.includes(role.id);
                                      return (
                                        <label key={role.id} className="flex items-center px-3 py-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                                          <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={(e) => handleCheckboxChange(user.id, 'roles', role.id, e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-gamboge-600 focus:ring-gamboge-500 accent-gamboge-600 mr-3 shrink-0"
                                          />
                                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-gamboge-700' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                            {role.name}
                                          </span>
                                        </label>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-4 sm:py-5 px-4 sm:px-6 text-right align-middle">
                          <button onClick={() => handleApproveUser(user.id)} className="bg-green-100 hover:bg-green-200 text-green-700 shadow-sm font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-xl text-[10px] sm:text-xs uppercase tracking-widest transition-all whitespace-nowrap shrink-0">
                            Activate
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
      
      {/* MODAL */}
      {revokeModal.isOpen && revokeModal.inviteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:pl-32 lg:pl-140">
          <div className="embossed-card p-6 sm:p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <div className="p-3 rounded-2xl mr-4 shadow-inner bg-red-100 text-red-600 shrink-0"><AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">Revoke Active Link</h3>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 truncate max-w-[200px]">Target: {revokeModal.email}</p>
                </div>
              </div>
              <button onClick={() => setRevokeModal({ isOpen: false, inviteId: null, email: '' })} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="inner-depth p-4 rounded-2xl sm:rounded-3xl mb-6 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
              This will <strong className="text-red-500">instantly invalidate</strong> the pending invitation link for this employee.
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={() => setRevokeModal({ isOpen: false, inviteId: null, email: '' })} className="w-full sm:flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm tracking-widest uppercase transition-colors shrink-0">Cancel</button>
              <button onClick={executeRevokeInvite} className="w-full sm:flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl text-sm tracking-widest uppercase transition-colors shadow-sm shrink-0">Revoke Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}