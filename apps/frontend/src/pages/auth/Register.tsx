import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { InputField } from '../../components/ui/InputField';
import { OtpActionInput } from '../../components/ui/OtpActionInput';
import { AuthAPI } from '../../api/auth.api';
import { AlertCircle, Loader2, ShieldCheck, ArrowLeft, ArrowRight, Mail, Lock, Phone, Sparkles, User, Check, X, Building2 } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '', mobileNo: '',
    password: '', confirmPassword: '',
  });

  // DYNAMIC HR ANSWERS
  const [customProfileData, setCustomProfileData] = useState<Record<string, any>>({});
  const [onboardingSchema, setOnboardingSchema] = useState<any[]>([]);

  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  
  const [lockedEmail, setLockedEmail] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const stepTitles = [
    'Identity Profile',
    'Account Security'
  ];

  // Password Strength Logic
  const pwd = formData.password;
  const passwordCriteria = [
    { label: 'At least 8 characters', met: pwd.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(pwd) },
    { label: 'Contains a special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
    { label: 'Contains an uppercase letter', met: /[A-Z]/.test(pwd) }
  ];

  useEffect(() => {
    if (!token) { setIsTokenValid(false); return; }
    AuthAPI.verifyInvite(token)
      .then((res) => { 
        setLockedEmail(res.email); 
        setTenantName(res.tenantName || 'Workspace');
        setOnboardingSchema(res.onboardingSchema || []); 
        setIsTokenValid(true); 
        
        // INJECT HYDRATED DATA INTO THE FORM
        if (res.prefilledData) {
          setFormData(prev => ({
            ...prev,
            firstName: res.prefilledData.firstName || '',
            lastName: res.prefilledData.lastName || ''
          }));
          
          if (res.prefilledData.customProfileData) {
            const rawData = res.prefilledData.customProfileData;
            const schema = res.onboardingSchema || [];
            
            // Format dates perfectly just in case the CSV had slashes
            schema.forEach((field: any) => {
              if (field.type === 'date' && rawData[field.id]) {
                const d = new Date(rawData[field.id]);
                if (!isNaN(d.getTime())) rawData[field.id] = d.toISOString().split('T')[0];
              }
            });

            setCustomProfileData(rawData);
          }
        }
      })
      .catch(() => setIsTokenValid(false));
  }, [token]);

  // Auto-scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => 
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleCustomFieldChange = (id: string, value: any) => {
    setCustomProfileData(prev => ({ ...prev, [id]: value }));
  };

  const handleSendOtp = async (target: string, type: 'EMAIL' | 'PHONE') => {
    try {
      await AuthAPI.sendOtp(target, type);
      if (type === 'PHONE') setIsPhoneOtpSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to dispatch OTP.');
    }
  };

  const handleVerifyOtp = async (target: string, type: 'EMAIL' | 'PHONE', otp: string) => {
    try {
      const response = await AuthAPI.verifyOtp(target, type, otp);
      if (response.success && type === 'PHONE') {
        setIsPhoneVerified(true);
        return true;
      }
      return false;
    } catch (err) {
      return false; // Safely return false so the UI knows it failed
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName) {
        setError('First and Last Name are required.'); 
        return false;
      }
      // Validate dynamic required fields
      for (const field of onboardingSchema) {
        if (field.required && !customProfileData[field.id]) {
          setError(`Please complete the required field: ${field.label}`);
          return false;
        }
      }
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (validateStep() && step < 2) setStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(prev => prev - 1);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Ignore aggressive auto-submits if not on final step
    if (step !== 2) return;

    setError('');

    if (formData.password !== formData.confirmPassword) { 
      setError('Passwords do not match'); 
      return; 
    }
    if (!isPhoneVerified) { 
      setError('Please verify your Mobile Number.'); 
      return; 
    }
    
    setIsLoading(true);
    try {
      await AuthAPI.register({ token, ...formData, customProfileData });
      navigate('/login', { state: { message: 'Registration complete. Please log in.' } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isTokenValid === null) return <AuthLayout><div className="text-center font-bold text-slate-500 animate-pulse">Verifying secure link...</div></AuthLayout>;

  if (isTokenValid === false || !token) {
    return (
      <AuthLayout>
        <div className="inner-depth p-8 text-center max-w-[400px] mx-auto w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Invalid Link</h2>
          <p className="text-sm text-slate-500 font-medium">This invitation link is invalid or expired.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout maxWidth="max-w-5xl">
      {/* Removed the global <form> wrapper. It is now a <div> */}
      <div className="flex flex-col w-full transition-all duration-300">
        
        {/* --- DYNAMIC WIZARD HEADER & PROGRESS BAR --- */}
        <div className="shrink-0 mb-6 text-center px-4">
          <h2 className="text-3xl font-bold text-slate-700 tracking-tight">Employee Onboarding</h2>
          
          <div className="w-full max-w-xs mx-auto mt-5">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-200 rounded-full z-0"></div>
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-gamboge-500 rounded-full z-0 transition-all duration-500 ease-out" 
                style={{ width: `${((step - 1) / 1) * 100}%` }}
              ></div>
              
              {[1, 2].map(s => (
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
              ))}
            </div>
          </div>
          
          <p className="text-xs text-slate-500 mt-4 font-bold uppercase tracking-widest">
            Step {step} of 2: {stepTitles[step-1]}
          </p>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm text-center font-semibold animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}
        </div>

        {/* --- HORIZONTAL SLIDE WRAPPER --- */}
        <div className="relative w-full bg-lightgray overflow-hidden rounded-2xl shadow-inner">
          <div 
            className="flex transition-transform duration-700 ease-in-out items-start"
            style={{ 
              width: '200%', 
              transform: `translateX(-${step === 1 ? 0 : 50}%)` 
            }}
          >
            
            {/* ======================================================== */}
            {/* STEP 1: IDENTITY PROFILE                                 */}
            {/* ======================================================== */}
            {/* Wrapped in independent form */}
            <form id="step-1" onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="w-1/2 shrink-0 p-6 sm:p-10 lg:p-12">
              <div className="max-w-4xl mx-auto space-y-10">
                
                <div>
                  <div className="flex items-center mb-8">
                    <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><User className="w-6 h-6 text-gamboge-600" /></div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-700 tracking-tight">Personal Details</h3>
                      <p className="text-sm text-slate-500 font-medium">Verify and complete your registered identity profile.</p>
                    </div>
                  </div>

                  {/* Focused Grid without Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                    <InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
                    <InputField label="Middle Name (Optional)" name="middleName" value={formData.middleName} onChange={handleChange} />
                    <InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />

                    {/* RENDER DYNAMIC HR FIELDS IN A CUSTOM COMPANY CARD */}
                    {onboardingSchema.length > 0 && (
                      <div className="lg:col-span-3 mt-4">
                        <div className="p-6 bg-slate-50/80 border border-slate-200/60 rounded-3xl shadow-sm relative overflow-hidden">
                          {/* Decorative background accent */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gamboge-500/5 rounded-bl-full -z-10"></div>
                          
                          <div className="flex items-center mb-5 pb-4 border-b border-slate-200/60">
                            <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 mr-3">
                              <Building2 className="w-5 h-5 text-gamboge-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-800 tracking-tight">{tenantName} Requirements</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Additional Organization Details</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {onboardingSchema.map(field => (
                              <div key={field.id} className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                  {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                {field.type === 'select' ? (
                                  <select 
                                    value={customProfileData[field.id] || ''} 
                                    onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                                    className="bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl p-3 w-full outline-none focus:border-gamboge-500 focus:ring-2 focus:ring-gamboge-500/20 transition-all shadow-sm"
                                    required={field.required}
                                  >
                                    <option value="">Select option...</option>

                                    {/* Shows the legacy imported value if it doesn't exist in the current HR schema */}
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
                                    onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                                    className="w-full p-3 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-gamboge-500 focus:ring-2 focus:ring-gamboge-500/20 transition-all shadow-sm"
                                    required={field.required}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2.1 Contact Verification */}
                <div>
                  <div className="flex items-center mb-6">
                    <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><Phone className="w-6 h-6 text-gamboge-600" /></div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-700 tracking-tight">Contact Verification</h3>
                      <p className="text-sm text-slate-500 font-medium">Secure your corporate access.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pre-Verified Email Card */}
                    <div className="p-5 border border-slate-200/60 rounded-2xl bg-slate-50/50 shadow-sm space-y-4 flex flex-col justify-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full -z-10"></div>
                      <InputField 
                        label="Corporate E-mail" 
                        type="email" 
                        value={lockedEmail} 
                        disabled 
                        icon={<Mail />} 
                        className="opacity-70 cursor-not-allowed" 
                      />
                      <div className="flex items-center text-green-600 text-xs font-bold uppercase tracking-widest mt-1">
                        <ShieldCheck className="w-4 h-4 mr-1.5" /> Pre-Verified via Invite
                      </div>
                    </div>

                    {/* Mobile Verification Card */}
                    <div className="p-5 border border-slate-200/60 rounded-2xl bg-slate-50/50 shadow-sm space-y-4">
                      <InputField 
                        label="Mobile Number" 
                        type="tel" 
                        name="mobileNo" 
                        value={formData.mobileNo} 
                        onChange={handleChange} 
                        disabled={isPhoneOtpSent || isPhoneVerified} 
                        required 
                        icon={<Phone />} 
                        className={isPhoneOtpSent || isPhoneVerified ? "opacity-70 cursor-not-allowed" : ""} 
                      />
                      <div className="pt-1">
                        <OtpActionInput 
                          label="Phone Verification" 
                          targetValue={formData.mobileNo} 
                          onSendOtp={(target) => handleSendOtp(target, 'PHONE')} 
                          onVerifyOtp={(target, otp) => handleVerifyOtp(target, 'PHONE', otp)} 
                          required 
                        />
                      </div>
                    </div>
                  </div>
                </div>    
              </div>
            </form>

            {/* ======================================================== */}
            {/* STEP 2: ACCOUNT SECURITY                                 */}
            {/* ======================================================== */}
            {/* Wrapped in independent form */}
            <form id="step-2" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="w-1/2 shrink-0 p-6 sm:p-10 lg:p-12">
              <div className="max-w-4xl mx-auto space-y-10">


                {/* 2.2 Security Credentials & Passwords */}
                <div>
                  <div className="flex items-center mb-6">
                    <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner"><Lock className="w-6 h-6 text-gamboge-600" /></div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-700 tracking-tight">Security Settings</h3>
                      <p className="text-sm text-slate-500 font-medium">Establish your login credentials and recovery methods.</p>
                    </div>
                  </div>

                  {/* Password + Strength Panel Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputField label="Password" type="password" name="password" placeholder={!isPhoneVerified ? "Verify Mobile No. to unlock" : "••••••••"} value={formData.password} onChange={handleChange} required disabled={!isPhoneVerified} icon={<Lock />} />
                      <InputField label="Confirm Password" type="password" name="confirmPassword" placeholder={!isPhoneVerified ? "Verify Mobile No. to unlock" : "••••••••"} value={formData.confirmPassword} onChange={handleChange} required disabled={!isPhoneVerified} icon={<Lock />} />
                    </div>
                    
                    {/* Live Password Strength Panel */}
                    <div className="lg:col-span-1 p-5 rounded-2xl border border-slate-300/50 bg-white/40 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-1 bg-slate-200">
                         <div 
                           className="h-full bg-green-500 transition-all duration-300 ease-out" 
                           style={{ width: `${(passwordCriteria.filter(c => c.met).length / 4) * 100}%` }}
                         />
                       </div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-1">Password Strength</p>
                       <ul className="space-y-2.5">
                         {passwordCriteria.map((criterion, idx) => (
                           <li key={idx} className="flex items-center text-sm font-medium">
                             <div className={`mr-2.5 flex items-center justify-center w-4 h-4 rounded-full transition-colors ${criterion.met ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                               {criterion.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                             </div>
                             <span className={criterion.met ? 'text-slate-700' : 'text-slate-400'}>{criterion.label}</span>
                           </li>
                         ))}
                       </ul>
                    </div>
                  </div>
                </div>

              </div>
            </form>

          </div>
        </div>

        {/* --- DYNAMIC FOOTER --- */}
        <div className="shrink-0 pt-6 mt-2 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 bg-transparent relative z-10 px-4">
          
          {step === 1 ? (
             <Link to="/login" className="text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest transition-colors w-full sm:w-auto text-center py-2 flex items-center justify-center space-x-1.5">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Login</span>
             </Link>
          ) : (
             <button type="button" onClick={prevStep} className="w-full sm:w-auto px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-sm uppercase tracking-widest transition-colors flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>Back</span>
             </button>
          )}
          
          {/* 🚀 FIX: The form={`step-${step}`} targets the active active form for submission! */}
          {step === 2 ? (
             <button type="submit" form={`step-${step}`} disabled={isLoading} className="shine-btn w-full sm:w-auto px-10 flex items-center justify-center space-x-2 py-4 text-white font-bold rounded-2xl text-sm uppercase tracking-widest disabled:opacity-50">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                <span>Complete Registration</span>
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