import React, { useState, useEffect } from 'react';
import { AdminAPI } from '../../api/admin.api';
import { InputField } from '../../components/ui/InputField';
import { ShieldAlert, Link as LinkIcon, PlusCircle, UserCheck, Copy, Check, Users, Ban, Activity } from 'lucide-react';

interface AppModule {
  id: string;
  name: string;
  description?: string;
}

interface AppResponse {
  id: string;
  name: string;
  modules: AppModule[];
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'PROVISION' | 'APPROVALS' | 'ACCOUNTS'>('PROVISION');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [modules, setModules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Form States
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch Data on Load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const appsRes = await AdminAPI.getApps();
      const usersRes = await AdminAPI.getUsers();
      
      const availableModules: (AppModule & { appName: string })[] = [];
      
      if (Array.isArray(appsRes)) {
        appsRes.forEach((app: AppResponse) => {
          if (Array.isArray(app.modules)) {
            app.modules.forEach((mod: AppModule) => {
              availableModules.push({ ...mod, appName: app.name });
            });
          }
        });
      }
      
      setModules(availableModules);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
    } catch (err) {
      notify('error', 'Failed to sync workspace data');
    } finally {
      setIsLoading(false);
    }
  };

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // --- ACTIONS ---
  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await AdminAPI.inviteUser(inviteEmail);
      
      const emailParam = `&email=${encodeURIComponent(inviteEmail)}`;
      let linkToShare = res.inviteLink;

      if (!linkToShare.includes('http')) {
        linkToShare = `${window.location.origin}/register?token=${res.inviteLink}${emailParam}`;
      } else if (!linkToShare.includes('/register')) {
        const url = new URL(res.inviteLink);
        const tokenVal = url.searchParams.get('token') || res.inviteLink;
        linkToShare = `${url.origin}/register?token=${tokenVal}${emailParam}`;
      }
      
      setGeneratedLink(linkToShare);
      setInviteEmail('');
      notify('success', 'Invitation link generated successfully.');
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to generate invite');
    }
  };

  const handleApproveUser = async (userId: string, selectedModules: string[]) => {
    try {
      await AdminAPI.grantAccess(userId, selectedModules);
      notify('success', 'User activated and modules assigned.');
      fetchDashboardData();
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to approve user');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await AdminAPI.updateUserStatus(userId, newStatus);
      notify('success', `User account is now ${newStatus}`);
      fetchDashboardData();
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to update user status');
    }
  };

  // --- COMPUTED DATA ---
  const pendingUsers = users.filter(u => u.status === 'PENDING');
  const managedUsers = users.filter(u => u.status !== 'PENDING');

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 border-b border-slate-700/50 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center">
            <ShieldAlert className="w-8 h-8 text-brand-gold mr-3" />
            Workspace Administration
          </h1>
          <p className="text-slate-400 mt-2">Manage employee invitations, workspace modules, and access control.</p>
        </div>
      </div>

      {message.text && (
        <div className={`mb-6 px-4 py-3 rounded text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-green-500/10 border-green-500/50 text-green-500'} border`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-850/50 p-1 rounded-lg mb-8 border border-slate-700/50 inline-flex">
        {['PROVISION', 'APPROVALS', 'ACCOUNTS'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === tab 
                ? 'bg-slate-700 text-brand-gold shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab === 'PROVISION' && <span className="flex items-center"><PlusCircle className="w-4 h-4 mr-2"/> Add Assets</span>}
            {tab === 'APPROVALS' && <span className="flex items-center"><UserCheck className="w-4 h-4 mr-2"/> Pending Approvals ({pendingUsers.length})</span>}
            {tab === 'ACCOUNTS' && <span className="flex items-center"><Users className="w-4 h-4 mr-2"/> User Control</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-center py-12 animate-pulse">Syncing workspace data...</div>
      ) : (
        <>
          {/* TAB 1: PROVISIONING (Invites) */}
          {activeTab === 'PROVISION' && (
            <div className="max-w-2xl mx-auto">
              {/* Generate Invite */}
              <div className="bg-slate-850 border border-slate-700/50 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center">
                  <LinkIcon className="w-5 h-5 mr-2 text-brand-ochre" /> Generate Invitation
                </h2>
                <form onSubmit={handleGenerateInvite} className="space-y-4">
                  <InputField label="Employee Email Address" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
                  <button type="submit" className="bg-brand-ochre hover:bg-brand-gold text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors w-full uppercase tracking-widest text-sm">
                    Create Secure Link
                  </button>
                </form>

                {generatedLink && (
                  <div className="mt-6 p-4 bg-slate-900 border border-brand-ochre/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs text-slate-400 mb-2 font-semibold uppercase">Share this link:</p>
                    <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                      <code className="text-brand-gold text-sm truncate mr-4">{generatedLink}</code>
                      <button onClick={() => { navigator.clipboard.writeText(generatedLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-slate-400 hover:text-white p-2">
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PENDING APPROVALS */}
          {activeTab === 'APPROVALS' && (
            <div className="bg-slate-850 border border-slate-700/50 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center">
                <UserCheck className="w-5 h-5 mr-2 text-brand-ochre" /> Waiting Room Queue
              </h2>
              <p className="text-sm text-slate-400 mb-6">These users have successfully verified their identity and are waiting for application module assignments.</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-300 text-sm">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Assign Modules</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.length === 0 ? (
                      <tr><td colSpan={4} className="py-8 text-center text-slate-500">No users in the waiting room.</td></tr>
                    ) : (
                      pendingUsers.map(user => (
                        <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-semibold text-slate-100">{user.first_name} {user.last_name}</div>
                            <div className="text-xs text-brand-ochre font-mono mt-1">ID: {user.id.split('-')[0]}...</div>
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-400">{user.email}</td>
                          <td className="py-4 px-4">
                            <select 
                              multiple 
                              className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded text-sm p-1 max-h-20 outline-none focus:border-brand-gold"
                              id={`select-${user.id}`}
                            >
                              {modules.map(mod => <option key={mod.id} value={mod.id}>{mod.appName}: {mod.name}</option>)}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button 
                              onClick={() => {
                                const selectElement = document.getElementById(`select-${user.id}`) as HTMLSelectElement;
                                const selectedValues = Array.from(selectElement.selectedOptions).map(opt => opt.value);
                                handleApproveUser(user.id, selectedValues);
                              }}
                              className="bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/50 font-medium py-1.5 px-4 rounded text-sm transition-colors whitespace-nowrap"
                            >
                              Approve & Activate
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT CONTROL */}
          {activeTab === 'ACCOUNTS' && (
            <div className="bg-slate-850 border border-slate-700/50 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-brand-ochre" /> Directory Control
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-300 text-sm">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Access Toggle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managedUsers.map(user => (
                      <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-4 font-semibold text-slate-100">{user.first_name} {user.last_name}</td>
                        <td className="py-4 px-4 text-sm text-slate-400">{user.email}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                            'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {user.status === 'ACTIVE' ? <Activity className="w-3 h-3 mr-1"/> : <Ban className="w-3 h-3 mr-1"/>}
                            {user.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button 
                            onClick={() => handleToggleStatus(user.id, user.status)}
                            className={`font-medium py-1.5 px-4 rounded text-sm transition-colors border whitespace-nowrap ${
                              user.status === 'ACTIVE' 
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/50' 
                                : 'bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/50'
                            }`}
                          >
                            {user.status === 'ACTIVE' ? 'Suspend Account' : 'Restore Access'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}