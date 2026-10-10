import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserAPI } from '../../api/user.api';
import { AuthAPI } from '../../api/auth.api';
import { RefreshCw, LogOut, ShieldCheck, Hourglass, ArrowRightLeft, Building2, X, ArrowRight, Ban, BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import AuthLayout from '../../components/layout/AuthLayout';

export default function WaitingRoom() {
  // Added 'login' to context to handle the token updates when switching
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState('');

  const { isSupported, isSubscribed, subscribeToPush } = usePushNotifications();

  // --- Switch Workspace State ---
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);
  const [switchTempToken, setSwitchTempToken] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [hasMultipleWorkspaces, setHasMultipleWorkspaces] = useState(false);

  const [switchError, setSwitchError] = useState<string | null>(null);

  // Silently check for other workspaces on mount
  useEffect(() => {
    AuthAPI.getAvailableWorkspaces().then(res => {
      if (res.tenants && res.tenants.length > 0) {
        setHasMultipleWorkspaces(true);
        // We can also pre-load the workspaces to make the modal instant
        setAvailableWorkspaces(res.tenants);
        setSwitchTempToken(res.tempToken);
      }
    }).catch(() => console.error("Failed to pre-fetch workspaces"));
  }, []);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setMessage('');
    try {
      const profile = await UserAPI.getProfile();
      
      if (profile.status === 'ACTIVE') {
        logout(); 
        navigate('/login', { 
          state: { message: 'Security clearance updated! Please sign in again to synchronize your access.' } 
        });
      } else {
        setMessage('Your account is still pending HR approval.');
      }
    } catch (error) {
      setMessage('Failed to synchronize with backend. Please try again.');
    } finally {
      setIsChecking(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // --- Execute Workspace Switch ---
  const handleWorkspaceSelect = async (tenantId: string) => {
    if (!switchTempToken) return;
    setIsSwitching(true);
    try {
      const response = await AuthAPI.selectWorkspace(switchTempToken, tenantId);
      
      // Update global context with new credentials & instantly refetch branding
      login(response.user);
      
      setIsSwitchModalOpen(false);
      
      // Force a reload to route them correctly (either to dashboard or back here if also pending)
      window.location.reload(); 
    } catch (err: any) {
      setIsSwitching(false);
      // Safely extract the IDP error
      if (err.response?.data?.error === 'USER_SUSPENDED') {
        setSwitchError('Your access to this workspace has been suspended.');
      } else if (err.response?.data?.error === 'WORKSPACE_FROZEN') {
        setSwitchError('This organization is currently suspended.');
      } else {
        setSwitchError('Failed to access workspace.');
      }
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-[540px] mx-auto text-center mt-2 relative">
        
        {/* Waiting Room Header */}
        <div className="mb-8">
          <h2 className="text-xl font-extrabold text-slate-700 uppercase tracking-widest">
            Secure Waiting Room
          </h2>
          <p className="text-sm text-slate-500 mt-2 font-semibold">
            Identity Confirmed: <span style={{ color: 'var(--theme-500, #e49b0f)' }} className="uppercase tracking-wider ml-1">
              {user?.firstName} {user?.lastName}
            </span>
          </p>
        </div>

        {/* PUSH NOTIFICATION OPT-IN BANNER */}
        {isSupported && !isSubscribed && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 shadow-sm text-left relative z-20">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-xl mr-3 shrink-0">
                <BellRing className="w-5 h-5 text-indigo-600 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-900 tracking-tight">Stay Updated</h4>
                <p className="text-xs font-medium text-indigo-700 mt-0.5">Enable notifications to be instantly alerted when HR approves your workspace access.</p>
              </div>
            </div>
            <button 
              onClick={subscribeToPush} 
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-md shrink-0"
            >
              Enable Alerts
            </button>
          </div>
        )}

        {message && (
          <div className="mb-6 bg-slate-100 border border-slate-200 text-slate-600 px-4 py-3 rounded-2xl text-sm font-semibold animate-in fade-in slide-in-from-top-2">
            {message}
          </div>
        )}

        <div className="inner-depth p-8 sm:p-10 relative overflow-hidden">
          {/* Subtle colored top border linking to the theme */}
          <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: 'var(--theme-500, #e49b0f)' }}></div>
          
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Radar pulse effect */}
              <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: 'var(--theme-500, #e49b0f)' }}></div>
              <div className="bg-lightgray p-4 rounded-full border border-slate-200 shadow-sm relative z-10">
                <Hourglass style={{ color: 'var(--theme-500, #e49b0f)' }} className="w-10 h-10 animate-pulse" />
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-800 mb-3 tracking-tight">Awaiting Administrator Approval</h3>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed font-medium">
            Your credentials have been securely verified. Your workspace administrator must provision your module access and finalize your activation before you can proceed.
          </p>

          <div className="space-y-4">
            <button 
              onClick={handleCheckStatus}
              disabled={isChecking}
              className="shine-btn w-full flex items-center justify-center space-x-2 py-4 text-white font-bold rounded-2xl text-sm tracking-widest uppercase disabled:opacity-50"
              style={{ backgroundColor: 'var(--theme-500, #e49b0f)' }}
            >
              {isChecking ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
              <span>{isChecking ? 'Verifying...' : 'Check Status'}</span>
            </button>
            
            <div className={hasMultipleWorkspaces ? "grid grid-cols-2 gap-4" : "flex flex-col"}>              
              {hasMultipleWorkspaces && (
                <button 
                  onClick={() => setIsSwitchModalOpen(true)}
                  className="w-full flex items-center justify-center space-x-2 py-4 text-slate-600 bg-white hover:bg-slate-50 shadow-sm border border-slate-200 font-bold rounded-2xl text-xs tracking-widest uppercase transition-all"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  <span>Switch</span>
                </button>
              )}              
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 py-4 text-slate-600 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm border border-slate-200 font-bold rounded-2xl text-xs tracking-widest uppercase transition-all"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer Status Indicator */}
        <div className="mt-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center">
          <span className="mr-2">Status:</span> 
          <span className="flex items-center text-amber-500">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-1.5"></span>
            Pending Authorization
          </span>
        </div>
      </div>

      {/* WORKSPACE SWITCH MODAL */}
      {isSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Switch Workspace</h2>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Select an environment</p>
              </div>
              <button 
                onClick={() => setIsSwitchModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto neumorphic-scrollbar space-y-3 text-left">
              
              {/* Error Banner */}
              {switchError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center">
                  <Ban className="w-4 h-4 mr-2 shrink-0" />
                  {switchError}
                </div>
              )}

              {isSwitching && availableWorkspaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mb-4 text-gamboge-500" />
                  <p className="text-sm font-bold uppercase tracking-widest">Scanning Environments...</p>
                </div>
              ) : availableWorkspaces.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium">You do not belong to any other active workspaces.</p>
                </div>
              ) : (
                availableWorkspaces.map((tenant) => (
                  <button
                    key={tenant.tenantId}
                    onClick={() => handleWorkspaceSelect(tenant.tenantId)}
                    disabled={isSwitching}
                    className="w-full bg-lightgray hover:bg-slate-50 border border-slate-200/60 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center group text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 inner-depth rounded-xl mr-4 flex flex-shrink-0 items-center justify-center bg-white">
                      {tenant.logoUrl ? (
                        <img src={tenant.logoUrl.startsWith('http') ? tenant.logoUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${tenant.logoUrl}`} alt={tenant.companyName} className="w-6 h-6 object-contain" />
                      ) : (
                        <Building2 className="w-5 h-5 text-slate-400 group-hover:text-gamboge-500 transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-700 truncate">{tenant.companyName}</h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate uppercase">{tenant.tenantId.split('-')[0]}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-gamboge-500 transform group-hover:translate-x-1 transition-all" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}