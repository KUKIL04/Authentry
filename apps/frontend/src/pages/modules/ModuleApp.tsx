import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AuthAPI } from '../../api/auth.api';
import { UserAPI } from '../../api/user.api';
import { LogOut, User, ShieldCheck, RefreshCw, ArrowRightLeft, Building2, X, Ban, Rocket, ExternalLink, AlertCircle, KeyRound, ChevronDown, Loader2, CheckCircle2, ShieldMinus, UserCircle, Phone, Globe, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { InputField } from '../../components/ui/InputField';
import { OtpActionInput } from '../../components/ui/OtpActionInput';

export default function ModuleApp() {
  const { user, login, logout, tenantSettings } = useAuth();
  const navigate = useNavigate();

  // --- Switch Workspace State ---
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);
  const [switchTempToken, setSwitchTempToken] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [hasMultipleWorkspaces, setHasMultipleWorkspaces] = useState(false);
  const [launchingApp, setLaunchingApp] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Profile Menu & Password State ---
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '', povToken: '' });
  const [pwdState, setPwdState] = useState({ isLoading: false, error: '', success: false });
  const [pwdStep, setPwdStep] = useState<1 | 2>(1);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- PROGRESSIVE & PLATFORM PROFILING STATE ---
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'platform' | 'company'>('company');
  
  // Platform Form State
  const [platformForm, setPlatformForm] = useState({ firstName: '', middleName: '', lastName: '', mobileNo: '' });
  const [initialPlatformForm, setInitialPlatformForm] = useState({ firstName: '', middleName: '', lastName: '', mobileNo: '' });
  const [initialMobile, setInitialMobile] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(true);
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);

  // Company Form State
  const [onboardingSchema, setOnboardingSchema] = useState<any[]>([]);
  const [isSchemaFetched, setIsSchemaFetched] = useState(false);
  const [customProfileData, setCustomProfileData] = useState<Record<string, any>>({});
  const [initialCustomData, setInitialCustomData] = useState<Record<string, any>>({});

  const [profileState, setProfileState] = useState({ isLoading: false, error: '', success: false });

  // Handle clicking outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    if (user?.status !== 'SUSPENDED') {
      AuthAPI.getAvailableWorkspaces().then(res => {
        if (res.tenants && res.tenants.length > 0) {
          setHasMultipleWorkspaces(true);
          setAvailableWorkspaces(res.tenants);
          setSwitchTempToken(res.tempToken);
        }
      }).catch(() => console.error("Failed to pre-fetch workspaces"));

      // CONCURRENTLY FETCH SCHEMA AND SECURE PROFILE
      Promise.all([
        UserAPI.getOnboardingSchema(),
        UserAPI.getProfile()
      ]).then(([schemaRes, profileRes]) => {
        const schema = schemaRes.schema || [];
        setOnboardingSchema(schema);
        setIsSchemaFetched(true);

        // Safely pre-fill the secure platform data
        const fetchedMobile = profileRes?.mobile_no || '';
        setInitialMobile(fetchedMobile);
        const freshPlatformData = {
          firstName: profileRes?.first_name || user?.firstName || '',
          middleName: profileRes?.middle_name || '',
          lastName: profileRes?.last_name || user?.lastName || '',
          mobileNo: fetchedMobile
        };
        setPlatformForm(freshPlatformData);
        setInitialPlatformForm(freshPlatformData);

        // HYDRATE THE CUSTOM PROFILE DATA SO IT IS NOT BLANK
        let fetchedCustomData = profileRes?.custom_profile_data || {};
        if (typeof fetchedCustomData === 'string') {
          try { fetchedCustomData = JSON.parse(fetchedCustomData); } catch (e) { fetchedCustomData = {}; }
        }
        setCustomProfileData(fetchedCustomData);
        setInitialCustomData(fetchedCustomData);

        // Progressive Profiling Check AFTER data loads
        if (user?.isProfileIncomplete && schema.length > 0) {
          if (user?.isProfileEnforced) {
            setActiveTab('company');
            setIsProfileModalOpen(true);
          }
        }
      }).catch(err => {
        console.error("Failed to load initial data:", err);
        setIsSchemaFetched(true);
      });
    }
  }, [user]);

  const handleOpenProfileSettings = async () => {
    setIsProfileMenuOpen(false);
    setIsProfileModalOpen(true);
    
    // GUARANTEE FRESH DATA ON MODAL OPEN
    try {
      const [schemaRes, profileRes] = await Promise.all([
        UserAPI.getOnboardingSchema(),
        UserAPI.getProfile()
      ]);
      
      const schema = schemaRes.schema || [];
      setOnboardingSchema(schema);
      setIsSchemaFetched(true);

      const fetchedMobile = profileRes?.mobile_no || '';
      setInitialMobile(fetchedMobile);
      const freshPlatformData = {
        firstName: profileRes?.first_name || user?.firstName || '',
        middleName: profileRes?.middle_name || '',
        lastName: profileRes?.last_name || user?.lastName || '',
        mobileNo: fetchedMobile
      };
      setPlatformForm(freshPlatformData);
      setInitialPlatformForm(freshPlatformData);

      // HYDRATE THE CUSTOM PROFILE DATA SO IT IS NOT BLANK
      let fetchedCustomData = profileRes?.custom_profile_data || {};
      if (typeof fetchedCustomData === 'string') {
        try { fetchedCustomData = JSON.parse(fetchedCustomData); } catch (e) { fetchedCustomData = {}; }
      }
      setCustomProfileData(fetchedCustomData);
      setInitialCustomData(fetchedCustomData);

      // Reset Verification States for the fresh modal
      setIsPhoneOtpSent(false);
      setIsPhoneVerified(true);

      setActiveTab(schema.length > 0 && user?.isProfileEnforced && user?.isProfileIncomplete ? 'company' : 'platform');
    } catch (err) { 
      console.error(err); 
      setIsSchemaFetched(true);
      setActiveTab('platform');
    }
  };

  // --- SAVE PLATFORM FORM ---
  const handleSavePlatformProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileState({ isLoading: true, error: '', success: false });

    if (platformForm.mobileNo && platformForm.mobileNo !== initialMobile && !isPhoneVerified) {
      setProfileState({ isLoading: false, error: 'Please verify your new mobile number via OTP.', success: false });
      return;
    }

    try {
      const res = await UserAPI.updatePlatformProfile(platformForm);
      setInitialPlatformForm(platformForm);

      const currentRefresh = localStorage.getItem('refreshToken') || '';
      
      if (res.user) {
        login(res.accessToken, currentRefresh, res.user);
      }

      setProfileState({ isLoading: false, error: '', success: true });
      setTimeout(() => {
        setProfileState({ isLoading: false, error: '', success: false });
      }, 2000);
    } catch (err: any) {
        setProfileState({ isLoading: false, error: err.response?.data?.error || 'Failed to update platform details.', success: false });
    }
  };

  // --- SAVE COMPANY FORM ---
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileState({ isLoading: true, error: '', success: false });
    try {
      const res = await UserAPI.completeProfile(customProfileData);
      setInitialCustomData(customProfileData);

      const currentRefresh = localStorage.getItem('refreshToken') || '';
      
      if (res.user) {
        login(res.accessToken, currentRefresh, res.user);
      }
      
      setProfileState({ isLoading: false, error: '', success: true });
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setProfileState({ isLoading: false, error: '', success: false });
      }, 1500);
    } catch (err: any) {
      setProfileState({ isLoading: false, error: err.response?.data?.error || 'Failed to update profile.', success: false });
    }
  };

  const handleSendPhoneOtp = async (target: string) => {
    await AuthAPI.sendOtp(target, 'PHONE');
    setIsPhoneOtpSent(true);
  };

  const handleVerifyPhoneOtp = async (target: string, otp: string) => {
    const res = await AuthAPI.verifyOtp(target, 'PHONE', otp);
    if (res.success) {
      setIsPhoneVerified(true);
      return true;
    }
    return false;
  };

  const handleWorkspaceSelect = async (tenantId: string) => {
    if (!switchTempToken) return;
    setIsSwitching(true);
    try {
      const oldRefreshToken = localStorage.getItem('refreshToken') || undefined;
      const response = await AuthAPI.selectWorkspace(switchTempToken, tenantId, oldRefreshToken);
        
      login(response.accessToken, response.refreshToken, response.user);
      setIsSwitchModalOpen(false);
      window.location.reload(); 
    } catch (error) {
      setIsSwitching(false);
    }
  };

  const handleLaunchApp = async (appName: string) => {
    setLaunchingApp(appName);;
    try {
      const response = await AuthAPI.requestLaunchCode(appName);
      if (response.redirectUrl) window.location.href = response.redirectUrl; 
    } catch (error: any) {
      console.error("Failed to generate secure launch token", error);
      if (error.response?.status === 403) {
        await handleSyncAccess();
      } else {
        setLaunchingApp(null);;
      }
    }
  };

  // --- SELF-HEALING SESSION SYNC ---
  const handleSyncAccess = async () => {
    setIsSyncing(true);
    try {
      const currentRefresh = localStorage.getItem('refreshToken');
      if (currentRefresh) {
        const res = await AuthAPI.refreshToken(currentRefresh);
        if (res.accessToken && res.user) {
          login(res.accessToken, currentRefresh, res.user);
          window.location.reload(); 
          return;
        }
      }
    } catch (err) {
      console.error("Failed to sync access", err);
    }
    setIsSyncing(false);
  };

  const handleVerifyStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdState({ isLoading: true, error: '', success: false });
    try {
      const res = await AuthAPI.verifyCurrentPassword(pwdForm.current);
      setPwdForm(prev => ({ ...prev, povToken: res.povToken }));
      setPwdState({ isLoading: false, error: '', success: false });
      setPwdStep(2); 
    } catch (err: any) {
      setPwdState({ isLoading: false, error: err.response?.data?.error || 'Verification failed.', success: false });
    }
  };
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdState({ isLoading: true, error: '', success: false });

    if (pwdForm.new !== pwdForm.confirm) {
      setPwdState({ isLoading: false, error: 'New passwords do not match.', success: false });
      return;
    }
    if (pwdForm.new.length < 8) {
      setPwdState({ isLoading: false, error: 'New password must be at least 8 characters long.', success: false });
      return;
    }
    try {
      await AuthAPI.changePassword(pwdForm.povToken, pwdForm.new);
      setPwdState({ isLoading: false, error: '', success: true });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPwdState({ isLoading: false, error: '', success: false });
        setPwdForm({ current: '', new: '', confirm: '', povToken: '' });
        setPwdStep(1);
      }, 2500);
    } catch (err: any) {
      setPwdState({ isLoading: false, error: err.response?.data?.error || 'Failed to change password.', success: false });
    }
  }; 

  return (
    <div 
      className="min-h-screen text-slate-700 p-4 sm:p-8 font-sans transition-all duration-300 relative"
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: `
          linear-gradient(135deg, color-mix(in srgb, var(--theme-500) 6%, transparent) 0%, transparent 100%),
          url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23cbd5e1' fill-opacity='0.4'/%3E%3C/svg%3E")
        `,
        backgroundAttachment: 'fixed'
      }}
    >
      
      {/* Top Navigation Bar */}
      <nav className="max-w-7xl mx-auto embossed-card p-4 mb-10 flex items-center justify-between bg-white/80 backdrop-blur-md relative z-50">
        <div className="flex items-center space-x-4 ml-2">
          <div className="w-10 h-10 embossed-badge rounded-full flex items-center justify-center bg-lightgray overflow-hidden">
            {tenantSettings?.logoUrl ? (
              <img 
                src={tenantSettings.logoUrl.startsWith('http') ? tenantSettings.logoUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${tenantSettings.logoUrl}`} 
                alt="Logo" 
                className="w-full h-full object-cover p-1"
                onError={(e) => { 
                  e.currentTarget.style.display = 'none'; 
                  e.currentTarget.insertAdjacentHTML('afterend', `<span style="color: var(--theme-500, #e49b0f)" class="font-extrabold text-lg">${tenantSettings?.name?.charAt(0).toUpperCase() || 'W'}</span>`);
                }}
              />
            ) : (
              <span style={{ color: 'var(--theme-500, #e49b0f)' }} className="font-extrabold text-lg">
                {tenantSettings?.name?.charAt(0).toUpperCase() || 'W'}
              </span>
            )}
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-800 uppercase">
            {tenantSettings?.name || 'WORKSPACE'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4 mr-2">

          {/* PROFILE DROPDOWN MENU */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`flex items-center text-xs font-bold uppercase tracking-widest transition-colors px-4 py-2.5 rounded-xl shadow-inner border ${user?.isProfileIncomplete && !user?.isProfileEnforced ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-lightgray border-slate-200 text-slate-600 hover:bg-slate-200'}`}
            >
              <User className={`w-4 h-4 mr-2 ${user?.isProfileIncomplete && !user?.isProfileEnforced ? 'text-amber-600' : 'text-gamboge-600'}`} />
              <span className="hidden sm:inline">{user?.firstName} {user?.lastName}</span>
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''} ${user?.isProfileIncomplete && !user?.isProfileEnforced ? 'text-amber-500' : 'text-slate-400'}`} />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200/60 shadow-xl rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signed in as</p>
                  <p className="text-sm font-extrabold text-slate-700 truncate">{user?.email}</p>
                </div>
                
                <button 
                  onClick={handleOpenProfileSettings}
                  className="w-full flex items-center px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-gamboge-600 rounded-xl transition-colors relative"
                >
                  <UserCircle className="w-4 h-4 mr-2" /> Update Profile Settings
                  {user?.isProfileIncomplete && onboardingSchema.length > 0 && (
                    <span className="absolute right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  )}
                </button>

                <button 
                  onClick={() => { setIsProfileMenuOpen(false); setIsPasswordModalOpen(true); setPwdStep(1); setPwdForm({ current: "", new: "", confirm: "", povToken: "" });  }}
                  className="w-full flex items-center px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-gamboge-600 rounded-xl transition-colors"
                >
                  <KeyRound className="w-4 h-4 mr-2" /> Change Password
                </button>
                
                <button 
                  onClick={logout}
                  className="w-full flex items-center px-3 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors mt-1 border-t border-slate-50 rounded-t-none"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </button>
              </div>
            )}
          </div>
          
          {user?.isAdmin && (
            <Link to="/admin" className="text-xs font-bold text-gamboge-600 hover:text-gamboge-700 uppercase tracking-widest transition-colors flex items-center bg-gamboge-50 px-3 py-2.5 rounded-xl border border-gamboge-100">
              <ShieldCheck className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {hasMultipleWorkspaces && (
            <button 
              onClick={() => setIsSwitchModalOpen(true)} 
              title="Switch Workspace"
              className="flex items-center text-xs font-bold text-slate-500 hover:text-gamboge-600 uppercase tracking-widest transition-colors px-2 py-2.5 rounded-xl hover:bg-slate-100"
            >
              <ArrowRightLeft className="w-4 h-4 sm:mr-1" />
              <span className="hidden lg:inline">Switch Workspace</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-4">
        
        {/* GENTLE NUDGE BANNER */}
        {user?.isProfileIncomplete && (!user?.isProfileEnforced && user?.isAdmin) && user?.status !== 'SUSPENDED' && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 shadow-sm">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-amber-600 mr-3 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-800">Action Required: Incomplete Profile</h4>
                <p className="text-xs font-medium text-amber-700 mt-0.5">Your HR department requires additional information to finalize your corporate profile.</p>
              </div>
            </div>
            <button onClick={handleOpenProfileSettings} className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shrink-0">
              Update Now
            </button>
          </div>
        )}

        {user?.status === 'SUSPENDED' ? (
          <div className="embossed-card p-10 text-center max-w-2xl mx-auto mt-16 bg-white/80 backdrop-blur-sm border border-red-100 animate-in zoom-in-95 duration-300">
            <div className="inner-depth w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-50/50">
                <Ban className="w-10 h-10 text-red-500 drop-shadow-sm" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-3 tracking-tight">Workspace Access Revoked</h2>
            <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6 px-4">
              Your access privileges for this workspace have been temporarily suspended. You cannot launch the application environment or access internal data at this time. 
            </p>
            <div className="inline-flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest bg-lightgray px-6 py-3 rounded-xl shadow-inner border border-slate-200">
              Please contact your HR department for assistance.
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center mt-6 min-h-[50vh] animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div className="text-center mb-8 w-full">
              <div className="flex items-center justify-center gap-4 mb-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight mb-2">
                  Welcome Back, {user?.firstName}
                </h1>
                <button 
                    onClick={handleSyncAccess}
                    disabled={isSyncing}
                    title="Sync Workspace Entitlements"
                    className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-gamboge-300 rounded-full transition-all focus:outline-none shadow-sm group disabled:opacity-50"
                  >
                    <RefreshCw className={`w-5 h-5 text-slate-400 group-hover:text-gamboge-500 ${isSyncing ? 'animate-spin text-gamboge-500' : ''}`} />
                  </button>
                </div>
              <p className="text-slate-500 text-sm font-medium tracking-wide max-w-lg mx-auto">
                Your identity is verified and your session is active.
              </p>
            </div>

            {/* DYNAMIC SUITE GRID BASED ON JWT ENTITLEMENTS */}
            {(() => {
              // Extract unique App Names from the user's entitlements
              const unlockedApps = Object.keys(user?.entitlements || {});
              const isLocked = user?.isProfileEnforced && user?.isProfileIncomplete;

              if (unlockedApps.length === 0) {
                return (
                  <div className="w-full max-w-2xl embossed-card p-12 text-center bg-white/60 backdrop-blur-md">
                    <ShieldMinus className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-700 mb-2">No Suites Unlocked</h2>
                    <p className="text-sm text-slate-500">You do not currently have access to any enterprise software suites. Please contact your administrator.</p>
                  </div>
                );
              }

              return (
                <div className="flex flex-wrap justify-center gap-6 sm:gap-8 w-full max-w-6xl mx-auto">
                  {unlockedApps.map(appName => {
                    const accessibleModules = Object.keys(user?.entitlements?.[appName] || {});
                    
                    return (
                      <div 
                        key={appName} 
                        className="relative bg-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between group transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 w-full sm:w-[360px] border border-slate-200 overflow-hidden"
                      >
                        {/* Subtle top gradient glow on hover */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-gamboge-400 to-amber-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                        
                        <div className="w-full flex flex-col items-start relative z-10">
                          <div className="flex items-center gap-4 mb-6 w-full">
                            {/* Animated Icon Box */}
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-400 group-hover:bg-gamboge-50 group-hover:text-gamboge-600 group-hover:border-gamboge-200 transition-colors duration-300 shrink-0 shadow-sm">
                              <Rocket className="w-7 h-7 drop-shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h2 className="text-xl font-black text-slate-600 group-hover:text-slate-900 tracking-tight uppercase">
                                {appName}
                              </h2>
                              <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mt-0.5">
                                Enterprise Suite
                              </p>
                            </div>
                          </div>

                          {/* Refined Modules Pill Stack */}
                          <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-8 group-hover:bg-slate-100 group-hover:border-slate-200/60 transition-colors duration-300">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                Unlocked Modules
                              </span>
                              <span className="text-[10px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                {accessibleModules.length}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {accessibleModules.slice(0, 4).map(modName => (
                                <span key={modName} className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-white text-slate-600 rounded border border-slate-200 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.05)]">
                                  {modName}
                                </span>
                              ))}
                              {accessibleModules.length > 4 && (
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-100 text-slate-500 rounded border border-slate-200 border-dashed">
                                  +{accessibleModules.length - 4} more
                                </span>
                              )}
                              {accessibleModules.length === 0 && (
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-100 text-slate-400 rounded border border-slate-200 border-dashed w-full text-center">
                                  Base Access Only
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Smart Launch Button */}
                        {(() => {
                          const isThisAppLaunching = launchingApp === appName;
                          const isAnyAppLaunching = launchingApp !== null;
                          const isButtonDisabled = isLocked || isAnyAppLaunching;

                          return (
                            <button 
                              onClick={() => handleLaunchApp(appName)}
                              disabled={isButtonDisabled}
                              className={`relative w-full flex items-center justify-center py-4 px-6 text-white font-extrabold rounded-xl text-xs tracking-widest uppercase overflow-hidden transition-all duration-300 z-10 ${
                                !isButtonDisabled
                                  ? 'bg-slate-800 hover:bg-slate-900 shadow-md group-hover:shadow-xl group-hover:shadow-gamboge-500/20 group-hover:bg-gamboge-600' 
                                  : isThisAppLaunching
                                    ? 'bg-gamboge-600 shadow-xl shadow-gamboge-500/20 opacity-100' // Stays highlighted while loading
                                    : 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
                              }`}
                            >
                              {/* Glossy sliding shine effect (Only works when not disabled!) */}
                              {!isButtonDisabled && (
                                <div className="absolute top-0 left-0 w-[150%] h-full -skew-x-12 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent z-20" />
                              )}
                              
                              <span className="relative z-30 flex items-center">
                                {isThisAppLaunching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize Launch'}
                                {!isThisAppLaunching && <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />}
                              </span>
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {user?.isProfileEnforced && user?.isProfileIncomplete && (
              <div className="flex items-center justify-center text-amber-600 text-xs font-bold uppercase tracking-widest mt-8 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> 
                Profile Completion Required to unlock suites
              </div>
            )}

          </div>
        )}
      </main>

      {/* TABBED PROFILE MODAL (Platform Identity & Company Data) */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="embossed-card rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden bg-white max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-8 pb-0 border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center">
                  <UserCircle className="w-5 h-5 mr-2 text-gamboge-600" /> Account Settings
                </h2>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Manage global identity and workspace profile</p>
              </div>
              {!user?.isProfileEnforced ||  user?.isAdmin ? (
                <button onClick={() => setIsProfileModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors shrink-0 text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              ) : null}
            </div>

            {/* TAB SWITCHER (Only shown if NOT forced by HR AND schema exists) */}
            {(!user?.isProfileEnforced || !user?.isProfileIncomplete) && onboardingSchema.length > 0 && (
              <div className="grid grid-cols-2 border-slate-100 bg-slate-50/50 p-1.5 px-8 gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => { setActiveTab('platform'); setProfileState({ isLoading: false, error: '', success: false }); }}
                  className={`py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center truncate px-2 ${activeTab === 'platform' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Globe className="w-3.5 h-3.5 mr-1.5 text-gamboge-600 shrink-0" /> <span className="truncate">Platform Identity</span>
                </button>
                <button 
                  type="button"
                  onClick={() => { setActiveTab('company'); setProfileState({ isLoading: false, error: '', success: false }); }}
                  className={`py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center truncate px-2 relative ${activeTab === 'company' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Building2 className="w-3.5 h-3.5 mr-1.5 text-gamboge-600 shrink-0" /> <span className="truncate">Workspace Details</span>
                  {user?.isProfileIncomplete && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500"></span>
                  )}
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto flex-1">
              {profileState.success ? (
                <div className="text-center py-12 animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Saved Successfully!</h3>
                  <p className="text-xs font-medium text-slate-500">Your information has been updated.</p>
                </div>
              ) : activeTab === 'platform' ? (
                
                /* TAB 1: PLATFORM IDENTITY FORM */
                <form onSubmit={handleSavePlatformProfile} className="space-y-4">
                  {profileState.error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-red-200 text-center">{profileState.error}</div>}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="First Name" name="firstName" value={platformForm.firstName} onChange={e => setPlatformForm({ ...platformForm, firstName: e.target.value })} required />
                    <InputField label="Middle Name" name="middleName" value={platformForm.middleName} onChange={e => setPlatformForm({ ...platformForm, middleName: e.target.value })} />
                  </div>
                  <InputField label="Last Name" name="lastName" value={platformForm.lastName} onChange={e => setPlatformForm({ ...platformForm, lastName: e.target.value })} required />

                  <div className="p-4 border border-slate-200/60 rounded-2xl bg-slate-50/50 space-y-3">
                    <InputField 
                      label="Registered Mobile Number" 
                      type="tel" 
                      name="mobileNo" 
                      placeholder="Enter new phone number..." 
                      value={platformForm.mobileNo} 
                      onChange={e => {
                        setPlatformForm({ ...platformForm, mobileNo: e.target.value });
                        if (e.target.value !== initialMobile) {
                          setIsPhoneVerified(false);
                          setIsPhoneOtpSent(false); // Reset if they start typing again before sending
                        } else {
                          setIsPhoneVerified(true);
                        }                      
                      }} 
                      disabled={platformForm.mobileNo !== initialMobile && (isPhoneOtpSent || isPhoneVerified)}
                      className={platformForm.mobileNo !== initialMobile && (isPhoneOtpSent || isPhoneVerified) ? "opacity-70 cursor-not-allowed" : ""}
                      icon={<Phone />} 
                    />
                    {platformForm.mobileNo && platformForm.mobileNo !== initialMobile && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <OtpActionInput 
                          label="Verify New Mobile Number" 
                          targetValue={platformForm.mobileNo} 
                          onSendOtp={handleSendPhoneOtp} 
                          onVerifyOtp={handleVerifyPhoneOtp} 
                          required 
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-6 flex flex-col sm:flex-row gap-3 border-t border-slate-100 mt-6">
                    {user?.isProfileEnforced && user?.isProfileIncomplete && !user?.isAdmin ? (
                      <button type="button" onClick={logout} className="w-full sm:flex-1 py-3 text-red-500 bg-red-50 hover:bg-red-100 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shrink-0">Sign Out</button>
                    ) : (
                      <button type="button" onClick={() => setIsProfileModalOpen(false)} className="w-full sm:flex-1 py-3 text-slate-700 bg-lightgray hover:bg-slate-200 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shrink-0">Cancel</button>
                    )}
                    {(() => {
                      const isPlatformDirty = JSON.stringify(platformForm) !== JSON.stringify(initialPlatformForm);
                      return (
                        <button 
                          type="submit" 
                          disabled={profileState.isLoading || !isPlatformDirty} // 🚀 FIX
                          className="w-full sm:flex-1 shine-btn py-3 text-white font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50 shrink-0"
                        >
                          {profileState.isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Identity'}
                        </button>
                      );
                    })()}
                  </div>
                </form>

              ) : (

                /* TAB 2: COMPANY / WORKSPACE CUSTOM DATA FORM */
                <form onSubmit={handleCompleteProfile} className="space-y-4">
                  {user?.isProfileEnforced && user?.isProfileIncomplete && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start text-amber-800">
                      <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium leading-relaxed">
                        Your HR department has enforced a strict completion policy. You must provide these workspace details to access corporate modules.
                      </p>
                    </div>
                  )}

                  {profileState.error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-red-200 text-center">{profileState.error}</div>}
                  
                  {!isSchemaFetched ? (
                    <div className="text-center py-8 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gamboge-500" />
                      <p className="text-xs font-bold uppercase tracking-widest">Loading workspace details...</p>
                    </div>
                  ) : onboardingSchema.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">No Details Required</h3>
                      <p className="text-xs mt-1 text-slate-400">Your organization has not requested any additional information.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {onboardingSchema.map(field => (
                        <div key={field.id} className="space-y-1">
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {field.type === 'select' ? (
                            <select 
                              value={customProfileData[field.id] || ''} 
                              onChange={e => setCustomProfileData(prev => ({ ...prev, [field.id]: e.target.value }))}
                              className="bg-lightgray border border-slate-300 text-slate-700 text-sm font-bold rounded-xl p-3.5 w-full outline-none focus:border-gamboge-500"
                              required={field.required}
                            >
                              <option value="">Select an option...</option>

                              {/* Handle legacy mismatched options */}
                              {customProfileData[field.id] && !field.options?.includes(customProfileData[field.id]) && (
                                <option value={customProfileData[field.id]}>
                                  {customProfileData[field.id]} (Imported)
                                </option>
                              )}

                              {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <input 
                              type={field.type} 
                              placeholder={field.placeholder}
                              value={customProfileData[field.id] || ''} 
                              onChange={e => setCustomProfileData(prev => ({ ...prev, [field.id]: e.target.value }))}
                              className="embossed-input w-full p-3.5 text-sm font-bold text-slate-700 outline-none rounded-xl"
                              required={field.required}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-6 flex flex-col sm:flex-row gap-3 border-t border-slate-100 mt-6">
                    {user?.isProfileEnforced && user?.isProfileIncomplete && !user?.isAdmin ? (
                      <button type="button" onClick={logout} className="w-full sm:flex-1 py-3.5 text-red-500 bg-red-50 hover:bg-red-100 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shrink-0">Sign Out</button>
                    ) : (
                      <button type="button" onClick={() => setIsProfileModalOpen(false)} className="w-full sm:flex-1 py-3.5 text-slate-700 bg-lightgray hover:bg-slate-200 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shrink-0">Cancel</button>
                    )}

                    {/*  The explicit Admin Dashboard Escape Hatch */}
                    {user?.isAdmin && user?.isProfileEnforced && user?.isProfileIncomplete && (
                      <button 
                        type="button" 
                        onClick={() => navigate('/admin')} 
                        className="w-full sm:flex-1 flex items-center justify-center py-3.5 text-gamboge-700 bg-gamboge-50 border border-gamboge-200 hover:bg-gamboge-100 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shrink-0"
                      >
                        <ShieldCheck className="w-4 h-4 mr-1.5" /> Admin Hub
                      </button>
                    )}

                    {/* The Switch Workspace Escape Hatch for Normal Users */}
                    {!user?.isAdmin && hasMultipleWorkspaces && user?.isProfileEnforced && user?.isProfileIncomplete && (
                      <button 
                        type="button" 
                        onClick={() => setIsSwitchModalOpen(true)} 
                        className="w-full sm:flex-1 flex items-center justify-center py-3.5 text-slate-700 bg-lightgray border border-slate-200 hover:bg-slate-200 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shrink-0"
                      >
                        <ArrowRightLeft className="w-4 h-4 mr-1.5" /> Switch
                      </button>
                    )}

                    {(() => {
                      const isCompanyDirty = JSON.stringify(customProfileData) !== JSON.stringify(initialCustomData);
                      return (
                        <button 
                          type="submit" 
                          disabled={profileState.isLoading || onboardingSchema.length === 0 || !isCompanyDirty} // 🚀 FIX
                          className="w-full sm:flex-1 shine-btn py-3.5 text-white font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50 shrink-0"
                        >
                          {profileState.isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Details'}
                        </button>
                      );
                    })()}
                  </div>
                </form>

              )}
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="embossed-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Security Configuration</h2>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Change your account password</p>
              </div>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors shrink-0 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {pwdState.success ? (
                <div className="text-center py-8 animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Password Updated!</h3>
                  <p className="text-xs font-medium text-slate-500">Your account is secure. Other active sessions have been terminated.</p>
                </div>
              ) : (
                <>
                  {!pwdState.success && pwdStep === 1 && (
                    <form onSubmit={handleVerifyStep} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                      {pwdState.error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-red-200 text-center">{pwdState.error}</div>}
                      <InputField label="Current Password" type="password" name="current" placeholder="Verify your identity" value={pwdForm.current} onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })} required />
                      <div className="pt-4 flex flex-col sm:flex-row gap-3">
                        <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="w-full sm:flex-1 py-3 text-slate-700 bg-lightgray hover:bg-slate-200 shadow-sm font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shrink-0">Cancel</button>
                        <button type="submit" disabled={pwdState.isLoading || !pwdForm.current} className="w-full sm:flex-1 shine-btn py-3 text-white font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50 shrink-0">
                          {pwdState.isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Verify Identity'}
                        </button>
                      </div>
                    </form>
                  )}

                  {!pwdState.success && pwdStep === 2 && (
                    <form onSubmit={handleChangePassword} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                      {pwdState.error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-red-200 text-center">{pwdState.error}</div>}
                      <InputField label="New Password" type="password" name="new" placeholder="At least 8 characters" value={pwdForm.new} onChange={(e) => setPwdForm({ ...pwdForm, new: e.target.value })} required />
                      <InputField label="Confirm New Password" type="password" name="confirm" placeholder="Must match exactly" value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} required />
                      <div className="pt-4 flex flex-col sm:flex-row gap-3">
                        <button type="submit" disabled={pwdState.isLoading} className="w-full sm:flex-1 shine-btn py-3 text-white font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50 shrink-0">
                          {pwdState.isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}  

      {/* WORKSPACE SWITCH MODAL (z-[60] to render over Profile Modal) */}
      {isSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
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

            <div className="p-6 overflow-y-auto neumorphic-scrollbar space-y-3">
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
                    <div className="w-10 h-10 inner-depth rounded-xl mr-4 flex flex-shrink-0 items-center justify-center bg-white overflow-hidden">
                      {tenant.logoUrl ? (
                        <img 
                          src={tenant.logoUrl.startsWith('http') ? tenant.logoUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${tenant.logoUrl}`} 
                          alt={tenant.companyName} 
                          className="w-6 h-6 object-contain" 
                        />
                      ) : (
                        <span className="font-extrabold text-lg text-slate-400 group-hover:text-gamboge-500 transition-colors">
                          {tenant.companyName?.charAt(0).toUpperCase() || 'W'}
                        </span>
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

      {/* Platform Branding */}
      <div className="mt-16 pb-8 text-center opacity-70 absolute bottom-0 w-full left-0 pointer-events-none">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          Powered by <br/>
          <span style={{ color: 'var(--theme-500)' }} className="text-xs tracking-[0.25em] drop-shadow-sm">MANAVSUTRA</span>
        </p>
      </div>
    </div>
  );
}