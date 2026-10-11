import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { InputField } from '../../components/ui/InputField';
import { AuthAPI } from '../../api/auth.api';
import { useAuth } from '../../hooks/useAuth';
import { Loader2, Mail, Lock, Building2, ArrowRight, ArrowLeft, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, User, Ban } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';
import { MfaHoldScreen } from '../../components/auth/MfaHoldScreen';

interface TenantOption {
  tenantId: string;
  companyName: string;
  logoUrl: string | null;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [step, setStep] = useState<'CREDENTIALS' | 'MFA_HOLD' | 'WORKSPACE_SELECT' | 'FROZEN' | 'USER_SUSPENDED' | 'REDIRECTING' | 'SECURITY_BLOCK' | 'ORPHANED' | 'TOKEN_THEFT'>('CREDENTIALS');
  const [mfaChallenge, setMfaChallenge] = useState<{ attemptId: string; challengeCode: string; expiresIn: number } | null>(null);
  const [securityMessage, setSecurityMessage] = useState('');
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [frozenMessage, setFrozenMessage] = useState('');

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const redirectUri = searchParams.get('redirectUri');
  const targetTenantId = searchParams.get('targetTenantId');
  const clientId = searchParams.get('clientId');
  const urlError = searchParams.get('error');

  const [error, setError] = useState('');

  // Safely extract the target hostname for the UI
  const targetHost = redirectUri ? (() => {
    try { return new URL(redirectUri).hostname; } catch { return 'Target Application'; }
  })() : '';

  useEffect(() => {
    // 1. Intercept hard-logout suspension state from Axios interceptor
    if (location.state?.message === 'Your access to this workspace has been suspended.') {
      setFrozenMessage(location.state.message);
      setError(''); // Ensure top banner is hidden
      setStep('USER_SUSPENDED');
      window.history.replaceState({}, document.title);
      return;
    }

    // 2. Handle URL Errors (from Interceptor Redirects)
    if (urlError) {
      const isSecurityEvent =
        urlError.includes('Compromised') ||
        urlError.includes('Suspicious') ||
        urlError.includes('mismatch') ||
        urlError.includes('denied');

      const isSilentExpiry =
        urlError.includes('Refresh token is required') ||
        urlError.includes('Authorization cookie');

      if (isSecurityEvent) {
        setSecurityMessage(urlError);
        setError(''); // Custom TOKEN_THEFT card handles this!
        setStep('TOKEN_THEFT');
      } else if (!isSilentExpiry) {
        setError(urlError); // Only show standard banner for normal messages
      }

      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    } else if (location.state?.message) {
      setError(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location, urlError, searchParams, setSearchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const executeRedirect = (url: string) => {
    setStep('REDIRECTING');
    // Add a polished 1.5s delay so the user can read the success message
    setTimeout(() => {
      window.location.href = url;
    }, 1500);
  };

  const handleLoginSuccess = (response: any) => {
    if (response.requiresMfa) {
      setMfaChallenge({
        attemptId: response.attemptId,
        challengeCode: response.challengeCode,
        expiresIn: response.expiresIn || 180
      });
      setStep('MFA_HOLD');
    } else if (response.requiresTenantSelection) {
      setAvailableTenants(response.tenants);
      setTempToken(response.tempToken);
      setStep('WORKSPACE_SELECT');
    } else if (response.redirectUrl) {
      if (response.user) login(response.user);
      executeRedirect(response.redirectUrl);
    } else if (response.user) {
      login(response.user);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await AuthAPI.login(formData.email, formData.password, redirectUri || undefined, targetTenantId || undefined, clientId || undefined);
      
      handleLoginSuccess(response);
    } catch (err: any) {
      const errCode = err.response?.data?.error;
      const errMsg = err.response?.data?.message;

      if (errCode === 'WORKSPACE_FROZEN') {
        setFrozenMessage(errMsg || 'Your workspace access has been suspended.');
        setStep('FROZEN');
      } else if (errCode === 'USER_SUSPENDED') {
        setFrozenMessage('Your access to this workspace has been suspended.');
        setStep('USER_SUSPENDED');
      } else if (errCode === 'OAUTH_SECURITY_VIOLATION') {
        setSecurityMessage(errMsg || 'A security violation was detected.');
        setStep('SECURITY_BLOCK');
      } else if (errCode === 'ORPHANED_USER') {
        setFrozenMessage(errMsg || 'No associated workspaces found.');
        setStep('ORPHANED');
      } else {
        setError(errCode || 'Invalid credentials');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkspaceSelect = async (tenantId: string) => {
    if (!tempToken) return;
    setError('');
    setIsLoading(true);
    try {
      const response = await AuthAPI.selectWorkspace(tempToken, tenantId, redirectUri || undefined, clientId || undefined);
      if (response.redirectUrl) {
        // Establish the True SSO Session!
        if (response.user) {
          login(response.user);
        }
        executeRedirect(response.redirectUrl);
      } else {
        login(response.user);
        navigate(location.state?.from?.pathname || '/', { replace: true });
      }
    } catch (err: any) {
      if (err.response?.data?.error === 'WORKSPACE_FROZEN') {
        setFrozenMessage(err.response?.data?.message || 'Your workspace access has been suspended.');
        setStep('FROZEN');
      } else if (err.response?.data?.error === 'USER_SUSPENDED') {
        setFrozenMessage('Your access to this workspace has been suspended.'); 
        setStep('USER_SUSPENDED');
      } else if (err.response?.data?.error === 'OAUTH_SECURITY_VIOLATION') {
        setSecurityMessage(err.response?.data?.message || 'A security violation was detected.');
        setStep('SECURITY_BLOCK');
      } else {
        setError(err.response?.data?.error || 'Failed to access workspace');
        setStep('CREDENTIALS');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-[540px] w-full mx-auto">
        <div className="mb-8 text-center">
            <h2 className={`text-xl font-bold ${step === 'FROZEN' ? 'text-red-600' : 'text-slate-700'}`}>
              {step === 'CREDENTIALS' && 'Welcome Back'}
              {step === 'WORKSPACE_SELECT' && 'Select Workspace'}
              {step === 'FROZEN' && 'Access Suspended'}
              {step === 'USER_SUSPENDED' && 'Access Suspended'}
              {step === 'TOKEN_THEFT' && 'Security Intervention'}
              {step === 'REDIRECTING' && 'Authentication Successful'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">
              {step === 'CREDENTIALS' && 'Authenticate to access your secure workspace.'}
              {step === 'WORKSPACE_SELECT' && `Found ${availableTenants.length} environments linked to this identity.`}
              {step === 'FROZEN' && 'Your organization\'s network access has been revoked.'}
              {step === 'USER_SUSPENDED' && 'Your privileges for this environment have been revoked.'}
              {step === 'TOKEN_THEFT' && 'We intercepted an anomaly and secured your account.'}
              {step === 'REDIRECTING' && 'Establishing secure connection...'}
            </p>
        </div>

        {error && (step === 'CREDENTIALS' || step === 'WORKSPACE_SELECT') && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm text-center font-semibold animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <div className="inner-depth p-6 sm:p-8 relative overflow-hidden">
          
          {step === 'CREDENTIALS' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <form onSubmit={handleCredentialSubmit} className="space-y-6">
                <InputField label="Corporate Email" type="email" name="email" placeholder="name@company.com" value={formData.email} onChange={handleChange} required icon={<Mail />} />
                <InputField label="Password Matrix" type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required icon={<Lock />} />

                <div className="flex items-center justify-between px-1 pt-1">
                  <Link to="/forgot-password" className="text-xs font-bold text-gamboge-600 hover:text-gamboge-700 transition-colors uppercase tracking-wider">
                    Forgot Password?
                  </Link>
                </div>

                <button type="submit" disabled={isLoading} className="shine-btn w-full flex items-center justify-center space-x-2 py-4 text-white font-bold rounded-2xl text-sm tracking-widest uppercase mt-6 disabled:opacity-75">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <><span>Authenticate</span><ArrowRight className="w-4 h-4 ml-1" /></>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-300/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-500 font-medium text-center sm:text-left">
                  New to the platform?
                </p>
                <Link 
                  to="/onboard-workspace" 
                  className="inline-flex items-center justify-center w-full sm:w-auto px-5 py-2.5 bg-lightgray hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shadow-inner border border-slate-200/50 shrink-0"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Provision Workspace
                </Link>
              </div>
            </div>
          )}

          {step === 'MFA_HOLD' && mfaChallenge && (
            <MfaHoldScreen
              attemptId={mfaChallenge.attemptId}
              challengeCode={mfaChallenge.challengeCode}
              initialExpiresIn={mfaChallenge.expiresIn}
              onApproved={handleLoginSuccess}
              onDenied={(msg) => {
                setMfaChallenge(null);
                setError(msg);
                setStep('CREDENTIALS');
              }}
              onCancel={() => {
                setMfaChallenge(null);
                setStep('CREDENTIALS');
              }}
            />
          )}

          {step === 'WORKSPACE_SELECT' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4 max-h-[400px] overflow-y-auto neumorphic-scrollbar px-1">
              {availableTenants.map((tenant) => (
                <button
                  key={tenant.tenantId}
                  onClick={() => handleWorkspaceSelect(tenant.tenantId)}
                  disabled={isLoading}
                  className="w-full bg-lightgray hover:bg-slate-50 border border-slate-200/60 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center group text-left disabled:opacity-50"
                >
                  <div className="w-12 h-12 inner-depth rounded-xl mr-4 flex flex-shrink-0 items-center justify-center bg-white">
                    {tenant.logoUrl ? (
                      <img src={tenant.logoUrl.startsWith('http') ? tenant.logoUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${tenant.logoUrl}`} alt={tenant.companyName} className="w-8 h-8 object-contain" />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-400 group-hover:text-gamboge-500 transition-colors" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-700 truncate">{tenant.companyName}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{tenant.tenantId}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-gamboge-500 transform group-hover:translate-x-1 transition-all" />
                </button>
              ))}

              <div className="pt-4 text-center">
                <button 
                  onClick={() => setStep('CREDENTIALS')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center w-full space-x-1.5 uppercase tracking-widest transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Use Different Account</span>
                </button>
              </div>
            </div>
          )}

          {/* TOKEN THEFT & ANOMALY UI */}
          {step === 'TOKEN_THEFT' && (
            <div className="animate-in zoom-in-95 duration-300 text-center py-6">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
              
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-red-600"></div>
                  <div className="bg-slate-900 p-4 rounded-full border border-red-500/30 shadow-2xl relative z-10">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">Active Sessions Terminated</h3>
              
              <div className="bg-red-50 border border-red-200 shadow-sm p-5 rounded-2xl mb-6 text-left">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-3 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 font-bold mb-1">
                      Account Secured
                    </p>
                    <p className="text-sm text-red-700 font-medium leading-relaxed">
                      {securityMessage || 'A suspicious login attempt or token replay was detected. To protect your account, all your active sessions have been instantly revoked.'}
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setStep('CREDENTIALS');
                  setFormData({ email: '', password: '' });
                  setError('');
                }}
                className="w-full flex items-center justify-center space-x-2 py-4 text-white bg-slate-800 hover:bg-slate-900 shadow-md font-bold rounded-2xl text-xs tracking-widest uppercase transition-all"
              >
                <Lock className="w-4 h-4 mr-2 text-slate-400" />
                <span>Authenticate Again</span>
              </button>
            </div>
          )}

          {step === 'FROZEN' && (
            <div className="animate-in zoom-in-95 duration-300 text-center py-6">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-red-500"></div>
                  <div className="bg-lightgray p-4 rounded-full border border-red-100 shadow-sm relative z-10">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">Organization Suspended</h3>
              
              <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl mb-6 text-left">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-500 mr-3 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-700 font-bold mb-1">
                      {frozenMessage}
                    </p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                      This typically occurs due to unresolved billing issues, policy violations, or an explicit mandate by your platform administrator.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-semibold mb-8 px-4">
                If you believe this is an error, please contact your internal IT department or corporate administrator.
              </p>

              <button 
                onClick={() => {
                  setStep('CREDENTIALS');
                  setFormData({ email: '', password: '' });
                }}
                className="w-full flex items-center justify-center space-x-2 py-4 text-slate-600 bg-white hover:bg-slate-50 shadow-sm border border-slate-200 font-bold rounded-2xl text-xs tracking-widest uppercase transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span>Return to Login</span>
              </button>
            </div>
          )}

          {step === 'USER_SUSPENDED' && (
            <div className="animate-in zoom-in-95 duration-300 text-center py-6">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-red-500"></div>
                  <div className="bg-lightgray p-4 rounded-full border border-red-100 shadow-sm relative z-10">
                    <User className="w-10 h-10 text-red-500" /> {/* Import User from lucide-react */}
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">Access Suspended</h3>
              
              <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl mb-6 text-left">
                <div className="flex items-start">
                  <Ban className="w-5 h-5 text-red-500 mr-3 shrink-0 mt-0.5" /> {/* Import Ban from lucide-react */}
                  <div>
                    <p className="text-sm text-slate-700 font-bold mb-1">
                      {frozenMessage}
                    </p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                      Your privileges for this environment have been revoked by your workspace administrator. You cannot authenticate at this time.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-semibold mb-8 px-4">
                If you believe this is an error, please contact your internal IT or HR department.
              </p>

              <button 
                onClick={() => {
                  setStep('CREDENTIALS');
                  setFormData({ email: '', password: '' });
                }}
                className="w-full flex items-center justify-center space-x-2 py-4 text-slate-600 bg-white hover:bg-slate-50 shadow-sm border border-slate-200 font-bold rounded-2xl text-xs tracking-widest uppercase transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span>Return to Login</span>
              </button>
            </div>
          )}

          {step === 'ORPHANED' && (
            <div className="animate-in zoom-in-95 duration-300 text-center py-6">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-400"></div>
              
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="bg-lightgray p-4 rounded-full border border-slate-200 shadow-sm relative z-10">
                    <Building2 className="w-10 h-10 text-slate-400" />
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">No Workspaces Found</h3>
              
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl mb-6 text-left">
                <p className="text-sm text-slate-600 font-medium leading-relaxed text-center">
                  {frozenMessage}
                </p>
              </div>

              <button 
                onClick={() => {
                  setStep('CREDENTIALS');
                  setFormData({ email: '', password: '' });
                }}
                className="w-full flex items-center justify-center space-x-2 py-4 text-slate-600 bg-white hover:bg-slate-50 shadow-sm border border-slate-200 font-bold rounded-2xl text-xs tracking-widest uppercase transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span>Return to Login</span>
              </button>
            </div>
          )}

          {step === 'SECURITY_BLOCK' && (
            <div className="animate-in zoom-in-95 duration-300 text-center py-6">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
              
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-red-600"></div>
                  <div className="bg-slate-900 p-4 rounded-full border border-red-500/30 shadow-2xl relative z-10">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">Security Action Taken</h3>
              
              <div className="bg-white border border-red-200 shadow-sm p-5 rounded-2xl mb-6 text-left">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-3 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-800 font-bold mb-1">
                      Untrusted Redirect Blocked
                    </p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                      {securityMessage} This often happens if you clicked a tampered or malicious link. 
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  // Purge the dangerous URL parameters and reload safely
                  window.location.href = window.location.pathname;
                }}
                className="w-full flex items-center justify-center space-x-2 py-4 text-white bg-slate-800 hover:bg-slate-900 shadow-md font-bold rounded-2xl text-xs tracking-widest uppercase transition-all"
              >
                <ShieldCheck className="w-4 h-4 mr-2 text-green-400" />
                <span>Return to Safe Login</span>
              </button>
            </div>
          )}

          {/* NEW: POLISHED REDIRECTING UX */}
          {step === 'REDIRECTING' && (
            <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-10">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-gamboge-500"></div>
                  <div className="bg-lightgray p-4 rounded-full border border-gamboge-200 shadow-sm relative z-10">
                    <CheckCircle2 className="w-10 h-10 text-gamboge-600" />
                  </div>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">Credentials Verified</h3>
              
              <div className="flex items-center justify-center space-x-3 text-slate-500 font-medium bg-slate-50/50 border border-slate-200 p-4 rounded-2xl mx-auto max-w-[80%]">
                <Loader2 className="w-5 h-5 text-gamboge-500 animate-spin" />
                <span>Redirecting back to <strong className="text-slate-700 font-bold">{targetHost}</strong>...</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </AuthLayout>
  );
}