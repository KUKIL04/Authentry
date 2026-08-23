import React, { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../api/admin.api';
import { InputField } from '../../components/ui/InputField';
import { FeatureLockBanner } from '../../components/ui/FeatureLockBanner';
import { Building2, Globe, Palette, Save, Loader2, Settings, UploadCloud, Terminal, Key, Trash2, Copy, Check, AlertTriangle, Webhook, CheckSquare, Square } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function WorkspaceSettings() {
  const [formData, setFormData] = useState({ name: '', logoUrl: '', themeColor: '#C7923E' });
  const [initialFormData, setInitialFormData] = useState({ name: '', logoUrl: '', themeColor: '#C7923E' });
  const [tenantId, setTenantId] = useState<string>('');
  const [locks, setLocks] = useState<Record<string, boolean>>({});

  const { refreshBranding } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const navigate = useNavigate();

  useEffect(() => { 
    fetchSettings(); 
  }, []);

  // --- FETCH CALLS ---
  
  const fetchSettings = async () => {
    try {
      const data = await AdminAPI.getSettings();
      if (data) { 
        setTenantId(data.id); 
        const freshData = { 
          name: data.name || '', 
          logoUrl: data.logoUrl || '', 
          themeColor: data.themeColor || '#C7923E' 
        };
        setFormData(freshData);
        setInitialFormData(freshData);
        if (data.locks) {
          setLocks(data.locks);
        }
      }
    } catch (err) { 
      notify('error', 'Failed to fetch workspace configurations.'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const notify = (type: 'success' | 'error', text: string) => { 
    setMessage({ type, text }); 
    setTimeout(() => setMessage({ type: '', text: '' }), 5000); 
  };

  // --- SETTINGS & BRANDING ACTIONS ---

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    setFormData({ ...formData, [e.target.name]: e.target.value }); 
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]; if (!file) return;
    setIsUploading(true);
    try {
      const res = await AdminAPI.uploadLogo(file);
      if (res.logoUrl) { 
        setFormData(prev => ({ ...prev, logoUrl: res.logoUrl })); 
        notify('success', 'Logo uploaded successfully. Remember to save.'); 
      }
    } catch (err: any) { 
      notify('error', err.response?.data?.error || 'Failed to upload logo'); 
    } finally { 
      setIsUploading(false); 
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] }, maxFiles: 1, maxSize: 5 * 1024 * 1024
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setIsSaving(true);
    try { 
      await AdminAPI.updateSettings(formData); 
      setInitialFormData(formData);
      notify('success', 'Workspace settings updated.'); 
      await refreshBranding(); 
    } catch (err: any) { 
      notify('error', err.response?.data?.error || 'Failed to update settings'); 
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <div className="w-full pb-12 relative">
      <div className="sticky top-0 z-40 px-4 sm:px-8 lg:px-12 py-4 lg:py-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm supports-[backdrop-filter]:bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Workspace Settings</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Manage corporate identity, themes, and developer integrations.</p>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-12 mt-8 max-w-4xl mx-auto space-y-8">
        {message.text && (
          <div className={`px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-2 ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 font-bold uppercase tracking-widest text-sm">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mr-3 shrink-0" /> Loading Configurations...
          </div>
        ) : (
          <>
            {/* BRANDING SECTION */}
            <div className="embossed-card p-6 sm:p-10 w-full relative overflow-hidden">
              <h2 className="text-lg sm:text-xl font-bold text-slate-700 mb-8 flex items-center border-b border-slate-300/50 pb-4">
                <div className="p-2 bg-lightgray rounded-lg mr-3 shadow-inner shrink-0"><Settings className="w-5 h-5 text-gamboge-600" /></div> Branding & Identity
              </h2>
              {locks.customTheme && (
                <div className="mb-8 relative z-20">
                  <FeatureLockBanner 
                    title="Custom Branding is Locked" 
                    description="Upgrade your workspace to unlock white-labeling and visual themes."
                    requiredTier="Premium"
                    onUpgrade={() => navigate('/admin/billing')}
                  />
                </div>
              )}
              <div className={`transition-all duration-300 ${locks.customTheme ? 'opacity-40 pointer-events-none select-none grayscale-[50%]' : ''}`}>
                {/* Check if form differs from initial state */}
                {(() => {
                  const isBrandDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);
                  
                  return (
                    <form onSubmit={handleSubmit} className="w-full relative z-10">
                      <div className="flex flex-col gap-8 w-full">

                        {/* Setting: Company Name */}
                        <div className="flex flex-col md:flex-row gap-4 md:gap-8 border-b border-slate-200/60 pb-8">
                          <div className="md:w-1/3 shrink-0">
                            <h3 className="text-sm font-bold text-slate-800">Company Name</h3>
                            <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-relaxed">The official legal or trading name of your organization. This appears on all tenant-facing dashboards.</p>
                          </div>
                          <div className="md:w-2/3 max-w-md w-full">
                            <InputField name="name" value={formData.name} onChange={handleChange} required icon={<Building2 />} placeholder="Acme Corp" />
                          </div>
                        </div>

                        {/* Setting: Brand Theme Color */}
                        <div className="flex flex-col md:flex-row gap-4 md:gap-8 border-b border-slate-200/60 pb-8">
                          <div className="md:w-1/3 shrink-0">
                            <h3 className="text-sm font-bold text-slate-800">Brand Theme Color</h3>
                            <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-relaxed">Your primary corporate color. This is injected into the CSS variables to dynamically style buttons, glows, and accents.</p>
                          </div>
                          <div className="w-full">
                          <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Brand Theme Color</label>
                          <div className="flex space-x-3 group relative w-full">
                            <div className="absolute left-4 top-3.5 bg-lightgray rounded-lg z-10 pointer-events-none shrink-0"><Palette className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-focus-within:text-gamboge-500 transition-colors" /></div>
                            <input type="color" name="themeColor" disabled={locks.customTheme} value={formData.themeColor} onChange={handleChange} className="h-[48px] sm:h-[52px] w-12 sm:w-16 rounded-xl sm:rounded-2xl cursor-pointer embossed-input p-1.5 pl-7 sm:pl-8 shrink-0" />
                            <input type="text" name="themeColor" disabled={locks.customTheme} value={formData.themeColor} onChange={handleChange} className="flex-1 w-full embossed-input px-3 sm:px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-widest outline-none min-w-0" />
                          </div>
                        </div>
                        </div>

                        {/* Setting: Corporate Logo */}
                        <div className="flex flex-col md:flex-row gap-4 md:gap-8 border-b border-slate-200/60 pb-8">
                          <div className="md:w-1/3 shrink-0">
                            <h3 className="text-sm font-bold text-slate-800">Corporate Logo</h3>
                            <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-relaxed">Upload a high-resolution logo. Transparent PNGs or SVGs are recommended for the best results on varied backgrounds.</p>
                          </div>
                          <div className="md:w-2/3 max-w-md w-full">
                            <div {...getRootProps()} className={`inner-depth p-6 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all border-2 w-full ${isDragActive ? 'border-gamboge-500 bg-gamboge-50/50' : 'border-transparent hover:bg-slate-100'}`}>
                              <input {...getInputProps()} disabled={locks.customTheme} />
                              {isUploading ? (
                                <Loader2 className="w-8 h-8 text-gamboge-500 animate-spin mb-3 shrink-0" />
                              ) : formData.logoUrl ? (
                                <div className="relative group w-full flex justify-center">
                                  <img src={formData.logoUrl.startsWith('http') ? formData.logoUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${formData.logoUrl}`} alt="Logo Preview" className="h-16 object-contain mb-3 rounded-lg bg-white p-2 border border-slate-200 shadow-sm" />
                                  <div className="absolute inset-0 bg-slate-900/60 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="text-white text-[10px] font-bold uppercase tracking-widest">Replace</span></div>
                                </div>
                              ) : (
                                <UploadCloud className={`w-10 h-10 mb-3 shrink-0 ${isDragActive ? 'text-gamboge-600' : 'text-slate-400'}`} />
                              )}
                              <p className="text-sm font-bold text-slate-700">{isDragActive ? 'Drop image here...' : formData.logoUrl ? 'Update Logo' : 'Drag & Drop Logo'}</p>
                              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mt-1">PNG, JPG, SVG (Max 5MB)</p>
                            </div>
                          </div>
                        </div>

                      </div>

                      <div className="pt-6 flex justify-end">
                        <button type="submit" disabled={isSaving || locks.customTheme || !isBrandDirty} className="shine-btn flex items-center justify-center py-4 px-8 text-white font-bold rounded-2xl text-xs sm:text-sm tracking-widest uppercase disabled:opacity-50 w-full md:w-auto shrink-0 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-gamboge-500/30">
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2 shrink-0" /> : <Save className="w-5 h-5 mr-2 shrink-0" />} <span>Save Configuration</span>
                        </button>
                      </div>
                    </form>
                  );
                })()} 
              </div>  
            </div>
          </>
        )}
      </div>
    </div>
  );
}