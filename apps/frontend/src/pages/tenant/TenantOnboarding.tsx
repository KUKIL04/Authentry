import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { InputField } from '../../components/ui/InputField';
import { OtpActionInput } from '../../components/ui/OtpActionInput';
import { TenantAPI } from '../../api/tenant.api';
import { AuthAPI } from '../../api/auth.api'; 
import { Loader2, Building2, ShieldCheck, Copy, Check, Mail, Phone, Lock, User, Globe, Palette, AlertCircle, ArrowRight, ArrowLeft, Briefcase, MapPin, UploadCloud } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';

export default function TenantOnboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '', logoUrl: '', themeColor: '#C7923E',
    legalName: '', taxId: '', registrationNumber: '', industry: 'Education', orgSize: '1-50',
    addressStreet: '', addressCity: '', addressState: '', addressPincode: '',
    adminFirstName: '', adminMiddleName: '', adminLastName: '', adminEmail: '', adminMobile: '',
    adminPassword: '', confirmPassword: '', adminCountryCode: '+91', customProfileData: {}
  });

  const [emailOtp, setEmailOtp] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [successData, setSuccessData] = useState<{ tenantId: string; adminEmail: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [identityCheck, setIdentityCheck] = useState({ isChecked: false, exists: false, name: '' });
  const [isCheckingIdentity, setIsCheckingIdentity] = useState(false);

  const areContactsVerified = isEmailVerified && isPhoneVerified;
  
  const isExistingUser = identityCheck.isChecked && identityCheck.exists;
  const totalSteps = isExistingUser ? 3 : 4;

  const stepTitles = [
    'Corporate Identity',
    'Legal & Location',
    isExistingUser ? 'Identity & Authorization' : 'Administrator Profile',
    'Security Credentials'
  ];

  // --- Auto-scroll to top when step changes ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Drag and Drop Handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await TenantAPI.uploadOnboardingLogo(file, formData.logoUrl);
      if (res.logoUrl) {
        setFormData(prev => ({ ...prev, logoUrl: res.logoUrl }));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  }, [formData.logoUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/svg+xml': ['.svg']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCopy = () => {
    if (successData) {
      navigator.clipboard.writeText(successData.tenantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

// Wrap in try/catch to handle rate limits or network errors
  const handleSendOtp = async (target: string, type: 'EMAIL' | 'PHONE') => {
    try {
      await AuthAPI.sendOtp(target, type);
      if (type === 'EMAIL') setIsEmailOtpSent(true);
      if (type === 'PHONE') setIsPhoneOtpSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to dispatch OTP.');
    }
  };

  // Wrap in try/catch so the infinite spinner stops on wrong OTP
  const handleVerifyOtp = async (target: string, type: 'EMAIL' | 'PHONE', otp: string) => {
    try {
      const response = await AuthAPI.verifyOtp(target, type, otp);
      if (response.success) {
        if (type === 'EMAIL') setIsEmailVerified(true);
        if (type === 'PHONE') setIsPhoneVerified(true);
        return true;
      }
      return false;
    } catch (err) {
      return false; // Safely return false so the UI knows it failed
    }
  };

  const validateStep = () => {
    if (step === 1 && !formData.companyName) { 
      setError('Company Name is required.'); 
      return false; 
    }
    if (step === 3) {
      if (!identityCheck.isChecked) {
        setError('Please verify your email address first.'); 
        return false; 
      }
      if (!identityCheck.exists) {
        if (!formData.adminFirstName || !formData.adminLastName) {
          setError('Administrator Name is required for new accounts.'); 
          return false; 
        }
        if (!isEmailVerified || !isPhoneVerified) {
          setError('You must verify both your Email and Mobile Number before proceeding.'); 
          return false; 
        }
      } else {
        // Validate the password right on Step 3 for existing users
        if (!formData.adminPassword) {
          setError('Master Password is required to authorize this workspace.');
          return false;
        }
      }
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (validateStep() && step < 4) setStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(prev => prev - 1);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    
    // Ignore aggressive password manager auto-submits if the user isn't on the final step
   if (step !== totalSteps) return;

    setError('');

    if (!identityCheck.exists && formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    if (!identityCheck.exists && (!isEmailVerified || !isPhoneVerified)) {
      setError('You must verify both your Email and Mobile Number before proceeding.'); return;
    }

    setIsLoading(true);
    try {
      const response = await TenantAPI.registerTenant(formData);
      setSuccessData({ tenantId: response.tenant.id, adminEmail: response.admin.email });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIdentity = async () => {
    if (!formData.adminEmail) return;
    setIsCheckingIdentity(true);
    setError('');
    try {
      const res = await AuthAPI.checkIdentity(formData.adminEmail);
      const fullName = res.firstName ? `${res.firstName} ${res.lastName || ''}`.trim() : '';
      setIdentityCheck({ 
        isChecked: true, 
        exists: res.exists, 
        name: fullName
      });

      if (!res.exists) {
        await handleSendOtp(formData.adminEmail, 'EMAIL');
      } else {
        // If they exist, we mark email as verified to satisfy form state
        setIsEmailVerified(true);
      }
    } catch (err) {
      setError('Failed to verify identity. Please try again.');
    } finally {
      setIsCheckingIdentity(false);
    }
  };

  if (successData) {
    return (
      <AuthLayout>
        <div className="max-w-[540px] mx-auto w-full text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="embossed-card p-8">
            <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4 drop-shadow-sm" />
            <h2 className="text-2xl font-bold text-slate-700 mb-2 tracking-tight">Workspace Created!</h2>
            <p className="text-slate-500 mb-6 text-sm font-medium leading-relaxed">
              Your organization has been successfully provisioned. Please save your Workspace ID below. You will need it to log in.
            </p>
            
            <div className="inner-depth p-6 mb-8 text-left space-y-5 rounded-2xl">
              <div>
                <p className="text-xs text-gamboge-600 uppercase font-bold tracking-widest mb-1">Master Admin Email</p>
                <p className="text-slate-700 font-bold break-all">{successData.adminEmail}</p>
              </div>
              <div>
                <p className="text-xs text-gamboge-600 uppercase font-bold tracking-widest mb-1">Workspace ID (Tenant ID)</p>
                <div className="flex items-center justify-between bg-lightgray p-3 rounded-xl shadow-inner mt-1">
                  <code className="text-slate-700 font-bold text-sm truncate mr-4">{successData.tenantId}</code>
                  <button onClick={handleCopy} className="text-slate-400 hover:text-gamboge-600 transition-colors shrink-0">
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
            
            <Link to="/login" className="shine-btn w-full flex justify-center py-4 rounded-2xl font-bold text-white uppercase tracking-widest">
              Proceed to Login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout maxWidth="max-w-7xl">
      {/* 🚀 FIX: Removed the global <form> wrapper. It is now a <div> */}
      <div className="flex flex-col w-full transition-all duration-300">
        
        {/* --- DYNAMIC WIZARD HEADER & PROGRESS BAR --- */}
        <div className="shrink-0 mb-6 text-center px-4">
          <h2 className="text-3xl font-bold text-slate-700 tracking-tight">Provision Organization</h2>
          
          <div className="w-full max-w-md mx-auto mt-5">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-200 rounded-full z-0"></div>
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-gamboge-500 rounded-full z-0 transition-all duration-500 ease-out" 
                style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
              ></div>
              {[...Array(totalSteps)].map((_, i) => {
                const s = i + 1;
                return (
                  <div 
                    key={s} 
                    className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-500 ease-out border-2 ${
                      step >= s 
                        ? 'bg-gamboge-500 border-gamboge-500 text-white shadow-md' 
                        : 'bg-slate-100 border-slate-300 text-slate-400'
                    }`}
                  >
                    {step > s ? <Check className="w-4 h-4" /> : <span className="text-xs font-extrabold">{s}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          
          <p className="text-xs text-slate-500 mt-4 font-bold uppercase tracking-widest">
            {stepTitles[step-1]}
          </p>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm text-center font-semibold animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}
        </div>

        {/* --- HORIZONTAL SLIDE WRAPPER --- */}
        <div className="relative scroll-depth-wrapper w-full bg-lightgray overflow-hidden rounded-2xl">
          <div 
            className="flex transition-transform duration-700 ease-in-out w-full items-start"
            style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
          >
            
            {/* ======================================================== */}
            {/* STEP 1: CORPORATE IDENTITY                               */}
            {/* ======================================================== */}
            {/* 🚀 NEW: Wrapped in independent form */}
            <form id="step-1" onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="w-full shrink-0 p-6 sm:p-10 lg:p-12">
              <div className="max-w-4xl mx-auto space-y-10">
                <div>
                  <div className="flex items-center mb-6">
                    <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><Building2 className="w-6 h-6 text-gamboge-600" /></div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-700 tracking-tight">Organization Profile</h3>
                      <p className="text-sm text-slate-500 font-medium">Define your corporate workspace identity.</p>
                    </div>
                  </div>
                  
                  {/* Single Column Layout */}
                  <div className="space-y-6 mb-8">
                    <InputField label="Brand / Display Name" name="companyName" value={formData.companyName} onChange={handleChange} required icon={<Building2 />} />
                  </div>
                  
                  {/* Single Column for Logo & Palette */}
                  <div className="space-y-8">
                    {/* Logo Upload */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">
                        Corporate Logo
                      </label>
                      <div 
                        {...getRootProps()} 
                        className={`inner-depth px-6 py-8 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all border-2 min-h-[140px] ${
                          isDragActive ? 'border-gamboge-500 bg-gamboge-50/50' : 'border-transparent hover:bg-slate-100'
                        }`}
                      >
                        <input {...getInputProps()} />
                        {isUploading ? (
                          <Loader2 className="w-8 h-8 text-gamboge-500 animate-spin mb-3" />
                        ) : formData.logoUrl ? (
                          <div className="relative group">
                            <img 
                              src={formData.logoUrl.startsWith('http') ? formData.logoUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${formData.logoUrl}`} 
                              alt="Logo Preview" 
                              className="h-16 object-contain mb-2 rounded-lg"
                            />
                            <div className="absolute inset-0 bg-slate-900/50 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-xs font-bold uppercase tracking-widest">Replace</span>
                            </div>
                          </div>
                        ) : (
                          <UploadCloud className={`w-10 h-10 mb-3 ${isDragActive ? 'text-gamboge-600' : 'text-slate-400'}`} />
                        )}
                        <p className="text-sm font-bold text-slate-700">
                          {isDragActive ? 'Drop image here' : formData.logoUrl ? 'Update Organization Logo' : 'Drag & Drop Logo or Click to Browse'}
                        </p>
                      </div>
                    </div>

                    {/* Creative Brand Palette Row */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Brand Theme Color</label>
                        <div className="flex space-x-3 items-center group relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-lightgray rounded-lg z-10 pointer-events-none">
                            <Palette className="w-5 h-5 text-slate-400 group-focus-within:text-gamboge-500 transition-colors" />
                            </div>
                            <input type="color" name="themeColor" value={formData.themeColor} onChange={handleChange} className="h-[52px] w-16 rounded-2xl cursor-pointer embossed-input p-1.5 pl-8 shrink-0" />
                            <input type="text" name="themeColor" value={formData.themeColor} onChange={handleChange} className="w-28 sm:w-32 h-[52px] min-w-0 embossed-input px-4 rounded-2xl text-sm font-bold text-slate-700 uppercase tracking-widest outline-none shrink-0" />
                            
                            <div className="flex flex-1 items-center justify-end space-x-2 overflow-hidden pl-2 h-[52px]">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap shrink-0 mr-1 hidden sm:inline">
                                Presets:
                            </span>
                            {['#C7923E', '#2563EB', '#059669', '#DC2626', '#7C3AED'].map(color => (
                                <button
                                key={color}
                                type="button"
                                onClick={() => setFormData({ ...formData, themeColor: color })}
                                className={`w-8 h-8 shrink-0 rounded-full shadow-inner transition-all duration-200 ${
                                    formData.themeColor.toUpperCase() === color 
                                    ? 'scale-[0.8] ring-2 ring-slate-400 ring-offset-2 opacity-100' 
                                    : 'scale-100 opacity-60 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: color }}
                                />
                            ))}
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
              </div>  
            </form>

            {/* ======================================================== */}
            {/* STEP 2: LEGAL & LOCATION                                 */}
            {/* ======================================================== */}
            {/* 🚀 NEW: Wrapped in independent form */}
            <form id="step-2" onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="w-full shrink-0 p-6 sm:p-10 lg:p-12">
              <div className="max-w-5xl mx-auto space-y-10">
                <div>
                  <div className="flex items-center mb-6">
                    <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><Briefcase className="w-6 h-6 text-gamboge-600" /></div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-700 tracking-tight">Legal & Compliance</h3>
                      <p className="text-sm text-slate-500 font-medium">Required for billing and directory verification.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-3">
                      <InputField label="Registered Legal Name" name="legalName" value={formData.legalName} onChange={handleChange} placeholder="Full Registered Business Name" />
                    </div>
                    <InputField label="Tax ID / GSTIN" name="taxId" value={formData.taxId} onChange={handleChange} placeholder="E.g. 27AAAAA0000A1Z5" />
                    <InputField label="Registration No. (CIN/LLP)" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} placeholder="Company Registration Number" />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <InputField asSelect label="Industry" name="industry" value={formData.industry} onChange={handleChange}>
                        <option value="Education">Education</option>
                        <option value="Technology">Technology</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Finance">Finance</option>
                        <option value="Retail">Retail</option>
                        <option value="Other">Other</option>
                      </InputField>
                      <InputField asSelect label="Org Size" name="orgSize" value={formData.orgSize} onChange={handleChange}>
                        <option value="1-50">1-50</option>
                        <option value="51-200">51-200</option>
                        <option value="201-1000">201-1000</option>
                        <option value="1000+">1000+</option>
                      </InputField>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-300/50" />

                <div>
                  <div className="flex items-center mb-6">
                    <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><MapPin className="w-6 h-6 text-gamboge-600" /></div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-700 tracking-tight">Corporate Headquarters</h3>
                      <p className="text-sm text-slate-500 font-medium">Primary registered operational address.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-4">
                      <InputField label="Street Address" name="addressStreet" value={formData.addressStreet} onChange={handleChange} placeholder="Building, Street, Area" />
                    </div>
                    <InputField label="City" name="addressCity" value={formData.addressCity} onChange={handleChange} />
                    <div className="lg:col-span-2">
                      <InputField label="State / Province" name="addressState" value={formData.addressState} onChange={handleChange} />
                    </div>
                    <InputField label="PIN Code" name="addressPincode" value={formData.addressPincode} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </form>

            {/* ======================================================== */}
            {/* STEP 3: ADMINISTRATOR PROFILE & CONTACTS                 */}
            {/* ======================================================== */}
            {/* 🚀 NEW: Wrapped in independent form. If existing user, this form submits. If new user, it goes to step 4. */}
            <form id="step-3" onSubmit={(e) => { e.preventDefault(); if (totalSteps === 3) handleSubmit(); else nextStep(); }} className="w-full shrink-0 p-6 sm:p-10 lg:p-12">
              <div className="max-w-5xl mx-auto space-y-10">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><User className="w-6 h-6 text-gamboge-600" /></div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-700 tracking-tight">Administrator Identity</h3>
                    <p className="text-sm text-slate-500 font-medium">Link your global identity or create a new profile.</p>
                  </div>
                </div>

                {/* THE FORK IN THE ROAD: Email Check & Inline Verification */}
                <div className="p-5 border border-slate-200/60 rounded-2xl bg-slate-50/50 shadow-sm">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                      <div className="flex-1 w-full">
                        <InputField 
                          label="Administrator E-mail" 
                          type="email" 
                          name="adminEmail" 
                          value={formData.adminEmail} 
                          onChange={(e) => {
                            handleChange(e);
                            setIdentityCheck({ isChecked: false, exists: false, name: '' });
                            setIsEmailVerified(false);
                            setIsEmailOtpSent(false); 
                          }} 
                          required 
                          disabled={identityCheck.isChecked} 
                          icon={<Mail />} 
                          className={identityCheck.isChecked ? "opacity-70 cursor-not-allowed" : ""}
                        />
                      </div>
                      {!identityCheck.isChecked ? (
                        <button 
                          type="button" 
                          onClick={handleCheckIdentity} 
                          disabled={!formData.adminEmail || isCheckingIdentity}
                          className="h-[52px] px-8 shine-btn text-white font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                          {isCheckingIdentity ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Continue'}
                        </button>
                      ) : !isEmailVerified ? (
                        <button 
                          type="button" 
                          onClick={() => {
                            setIdentityCheck({ isChecked: false, exists: false, name: '' });
                            setIsEmailVerified(false);
                            setIsEmailOtpSent(false);
                          }} 
                          className="h-[52px] px-6 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors whitespace-nowrap shrink-0 shadow-sm"
                        >
                          Change Email
                        </button>
                      ) : (
                        <div className="h-[52px] px-6 flex items-center justify-center bg-green-50 border border-green-200 rounded-xl shrink-0">
                          <Check className="w-5 h-5 text-green-500" />
                        </div>  
                      )}
                    </div>

                    {/* AUTO-TRIGGERED INLINE OTP FOR NEW USERS */}
                    {identityCheck.isChecked && !identityCheck.exists && !isEmailVerified && (
                      <div className="pt-4 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-2">
                         <div className="flex items-center text-amber-600 text-xs font-bold uppercase tracking-widest mb-3">
                           <AlertCircle className="w-4 h-4 mr-1.5" /> Verification Required
                         </div>
                         
                         <div className="flex flex-col sm:flex-row gap-3">
                           <div className="flex-1">
                             <InputField 
                               type="text" 
                               name="emailOtp" 
                               placeholder="Enter 6-digit OTP..." 
                               value={emailOtp} 
                               onChange={e => setEmailOtp(e.target.value)} 
                               maxLength={6}
                               className="text-center tracking-[0.5em] font-mono font-bold"
                             />
                           </div>
                           <button 
                             type="button" 
                             disabled={emailOtp.length < 5 || isVerifyingEmail}
                             onClick={async () => {
                               setIsVerifyingEmail(true);
                               setError('');
                               const success = await handleVerifyOtp(formData.adminEmail, 'EMAIL', emailOtp);
                               if (!success) setError('Invalid or expired OTP code.');
                               setIsVerifyingEmail(false);
                             }}
                             className="h-[52px] px-8 shine-btn text-white font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50 shrink-0"
                           >
                             {isVerifyingEmail ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm'}
                           </button>
                         </div>
                         
                         <div className="mt-3 text-right">
                            <button 
                              type="button" 
                              onClick={() => handleSendOtp(formData.adminEmail, 'EMAIL')}
                              className="text-[10px] font-bold text-slate-400 hover:text-gamboge-600 uppercase tracking-widest transition-colors"
                            >
                              Resend Code
                            </button>
                         </div>
                      </div>
                    )}

                    {/* SECURE VERIFIED BADGE */}
                    {identityCheck.isChecked && !identityCheck.exists && isEmailVerified && (
                       <div className="flex items-center text-green-600 text-xs font-bold uppercase tracking-widest mt-1 animate-in fade-in">
                          <ShieldCheck className="w-4 h-4 mr-1.5" /> Email Verified Securely
                       </div>
                    )}
                  </div>
                </div>

                {/* PATH A: EXISTING USER */}
                {isExistingUser && (
                  <div className="p-6 bg-green-50/50 border border-green-200/60 rounded-2xl animate-in fade-in slide-in-from-top-4 shadow-sm space-y-6">
                    <div className="flex items-start">
                      <div className="p-2 bg-green-100 rounded-lg mr-4 text-green-600 shrink-0"><ShieldCheck className="w-6 h-6" /></div>
                      <div>
                        <h4 className="font-extrabold text-green-800 tracking-tight text-lg">Global Identity Found</h4>
                        <p className="text-sm text-green-700 mt-1 font-medium leading-relaxed">
                          Welcome back, <strong>{identityCheck.name}</strong>! Your master platform identity is already established. You can skip contact verification.
                        </p>
                      </div>
                    </div>

                    {/* The Password Field pulled into Step 3 */}
                    <div className="pt-4 border-t border-green-200/60">
                      <InputField 
                        label="Verify Master Password" 
                        type="password" 
                        name="adminPassword" 
                        placeholder="••••••••" 
                        value={formData.adminPassword} 
                        onChange={handleChange} 
                        required 
                        icon={<Lock />}
                      />
                    </div>
                  </div>
                )}

                {/* PATH B: BRAND NEW USER (Only renders AFTER email is verified) */}
                {identityCheck.isChecked && !identityCheck.exists && isEmailVerified && (
                  <div className="animate-in fade-in slide-in-from-top-4 space-y-6 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <InputField label="First Name" name="adminFirstName" value={formData.adminFirstName} onChange={handleChange} required />
                      <InputField label="Middle Name (Optional)" name="adminMiddleName" value={formData.adminMiddleName} onChange={handleChange} />
                      <InputField label="Last Name" name="adminLastName" value={formData.adminLastName} onChange={handleChange} required />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200/60">
                      <div className="p-5 border border-slate-200/60 rounded-2xl bg-slate-50/50 shadow-sm space-y-4">
                        <InputField 
                          label="Mobile Number" 
                          name="adminMobile" 
                          value={formData.adminMobile} 
                          onChange={handleChange} 
                          required 
                          disabled={isPhoneOtpSent || isPhoneVerified} 
                          icon={<Phone />} 
                          className={isPhoneOtpSent || isPhoneVerified ? "opacity-70 cursor-not-allowed" : ""} 
                        />
                        <div className="pt-1">
                          <OtpActionInput 
                            label="Mobile Verification" 
                            targetValue={formData.adminMobile} 
                            onSendOtp={(target) => handleSendOtp(target, 'PHONE')} 
                            onVerifyOtp={(target, otp) => handleVerifyOtp(target, 'PHONE', otp)} 
                            required 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* ======================================================== */}
            {/* STEP 4: SECURITY CREDENTIALS (NEW USERS ONLY)            */}
            {/* ======================================================== */}
            {/* 🚀 NEW: Wrapped in independent form */}
            <form id="step-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="w-full shrink-0 p-6 sm:p-10 lg:p-12">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><Lock className="w-6 h-6 text-gamboge-600" /></div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-700 tracking-tight">Master Admin Credentials</h3>
                    <p className="text-sm text-slate-500 font-medium">Finalize password for your organization's root account.</p>
                  </div>
                </div>

                <InputField 
                  label="Password" 
                  type="password" 
                  name="adminPassword" 
                  placeholder="••••••••" 
                  value={formData.adminPassword} 
                  onChange={handleChange} 
                  required 
                  icon={<Lock />} 
                />
                
                <InputField 
                  label="Confirm Password" 
                  type="password" 
                  name="confirmPassword" 
                  placeholder="••••••••" 
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                  required 
                  icon={<Lock />} 
                />
              </div>
            </form>

          </div>
        </div>

        {/* --- DYNAMIC FOOTER --- */}
        <div className="shrink-0 pt-6 mt-2 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 bg-transparent relative z-10 px-4">
          
          {step === 1 ? (
             <Link to="/login" className="text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest transition-colors w-full sm:w-auto text-center py-2">
                Already have a workspace? Sign in
             </Link>
          ) : (
             <button type="button" onClick={prevStep} className="w-full sm:w-auto px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-sm uppercase tracking-widest transition-colors flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>Back</span>
             </button>
          )}
          
          {/* 🚀 FIX: The form={`step-${step}`} binds this button to the active visible form! */}
          {step === totalSteps ? (
             <button type="submit" form={`step-${step}`} disabled={isLoading} className="shine-btn w-full sm:w-auto px-10 flex items-center justify-center space-x-2 py-4 text-white font-bold rounded-2xl text-sm uppercase tracking-widest disabled:opacity-50">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                <span>{isExistingUser ? 'Authorize Workspace' : 'Provision Organization'}</span>
             </button>
          ) : (
             <button type="submit" form={`step-${step}`} className="shine-btn w-full sm:w-auto px-10 flex items-center justify-center space-x-2 py-4 text-white font-bold rounded-2xl text-sm uppercase tracking-widest">
                <span>Next Phase</span>
                <ArrowRight className="w-5 h-5 ml-2" />
             </button>
          )}

        </div>
      </div>
    </AuthLayout>
  );
}