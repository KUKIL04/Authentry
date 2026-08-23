import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AdminAPI } from '../../api/admin.api';
import { InputField } from '../../components/ui/InputField';
import { 
  FileText, Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2, 
  AlertTriangle, CheckCircle2, ShieldCheck, Eye, Sparkles, HelpCircle 
} from 'lucide-react';

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export default function CustomFormManager() {
  const { updateUserContext } = useAuth();

  const [schema, setSchema] = useState<FormField[]>([]);
  const [initialSchema, setInitialSchema] = useState<FormField[]>([]);

  const [enforce, setEnforce] = useState(false);
  const [initialEnforce, setInitialEnforce] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [previewData, setPreviewData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchSchema();
  }, []);

  const fetchSchema = async () => {
    setIsLoading(true);
    try {
      const res = await AdminAPI.getOnboardingSchema();
      const fetchedSchema = res.schema || [];
      const fetchedEnforce = res.enforce || false;

      setSchema(fetchedSchema);
      setInitialSchema(fetchedSchema);
      
      setEnforce(fetchedEnforce);
      setInitialEnforce(fetchedEnforce);
    } catch (err) {
      notify('error', 'Failed to load custom form configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAddField = (presetType?: string) => {
    const newId = `field_${Date.now()}`;
    let newField: FormField = {
      id: newId,
      label: 'New Field',
      type: 'text',
      placeholder: 'Enter details...',
      required: false,
    };

    if (presetType === 'department') {
      newField = { id: newId, label: 'Department', type: 'select', options: ['Engineering', 'Sales', 'HR', 'Finance', 'Operations'], required: true };
    } else if (presetType === 'dob') {
      newField = { id: newId, label: 'Date of Birth', type: 'date', required: true };
    } else if (presetType === 'emg_phone') {
      newField = { id: newId, label: 'Emergency Contact Number', type: 'text', placeholder: '+91 9876543210', required: true };
    } else if (presetType === 'tshirt') {
      newField = { id: newId, label: 'T-Shirt Size', type: 'select', options: ['S', 'M', 'L', 'XL', 'XXL'], required: false };
    }

    setSchema(prev => [...prev, newField]);
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setSchema(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleDeleteField = (id: string) => {
    setSchema(prev => prev.filter(f => f.id !== id));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= schema.length) return;
    const newSchema = [...schema];
    const [moved] = newSchema.splice(index, 1);
    newSchema.splice(targetIndex, 0, moved);
    setSchema(newSchema);
  };

  const handleOptionChange = (fieldId: string, optionsString: string) => {
    const options = optionsString.split(',');
    handleUpdateField(fieldId, { options });
  };

  const handleSave = async () => {
    setIsSaving(true);

    const cleanedSchema = schema.map(field => {
      if (field.type === 'select' && field.options) {
        return { ...field, options: field.options.map(o => o.trim()).filter(Boolean) };
      }
      return field;
    });

    try {
      const res = await AdminAPI.updateOnboardingSchema(cleanedSchema, enforce);
      setSchema(cleanedSchema);
      setInitialSchema(cleanedSchema);
      setInitialEnforce(enforce);

      updateUserContext({ 
        isProfileEnforced: res.enforce, 
        isProfileIncomplete: res.isProfileIncomplete 
      });
      notify('success', 'Onboarding form schema saved successfully!');
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to save onboarding form.');
    } finally {
      setIsSaving(false);
    }
  };

  const isDirty = JSON.stringify(schema) !== JSON.stringify(initialSchema) || enforce !== initialEnforce;

  return (
    <div className="w-full pb-12 relative">
      <div className="sticky top-0 z-40 px-4 sm:px-8 lg:px-12 py-4 lg:py-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm supports-[backdrop-filter]:bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Onboarding Form Builder</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Configure custom HR fields required during employee registration.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="shine-btn py-3 px-6 text-white font-bold rounded-xl text-xs tracking-widest uppercase flex items-center justify-center shadow-sm w-full sm:w-auto shrink-0 transition-transform hover:scale-105 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Form Schema
        </button>
      </div>

      <div className="px-4 sm:px-8 lg:px-12 mt-8 max-w-7xl mx-auto space-y-8">
        {message.text && (
          <div className={`px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {/* ENFORCEMENT TOGGLE BANNER */}
        <div className="embossed-card p-6 bg-white border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-2xl shrink-0 ${enforce ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">Strict Profile Completion Enforcement</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 leading-relaxed">
                When enabled, active users who are missing required custom fields will be intercepted on their next login and prompted to complete their profile before accessing modules.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input 
              type="checkbox" 
              checked={enforce} 
              onChange={e => setEnforce(e.target.checked)} 
              className="sr-only peer" 
            />
            <div className="w-14 h-8 bg-slate-300 rounded-full peer shadow-inner border border-slate-300/60 peer-checked:bg-gamboge-500 peer-checked:border-gamboge-600 transition-all duration-300 ease-in-out after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-slate-200 after:border after:rounded-full after:h-6 after:w-6 after:shadow-sm after:transition-transform after:duration-300 peer-checked:after:translate-x-6"></div>
          </label>
        </div>

        {/* PRESET SHORTCUTS */}
        <div className="bg-slate-100/50 border border-slate-200/60 rounded-2xl p-3 shadow-lg">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-xs font-bold text-slate-700 border border-slate-200 shadow-sm px-2.5 py-1 rounded-lg uppercase tracking-widest shrink-0 mr-2 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-gamboge-600" /> Presets:
                </span>

                <button onClick={() => handleAddField('department')} className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold rounded-xl text-xs shrink-0 transition-colors shadow-sm">+ Department</button>
                <button onClick={() => handleAddField('dob')} className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold rounded-xl text-xs shrink-0 transition-colors shadow-sm">+ Date of Birth</button>
                <button onClick={() => handleAddField('emg_phone')} className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold rounded-xl text-xs shrink-0 transition-colors shadow-sm">+ Emergency Phone</button>
                <button onClick={() => handleAddField('tshirt')} className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold rounded-xl text-xs shrink-0 transition-colors shadow-sm">+ T-Shirt Size</button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* FIELD EDITOR LIST */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-slate-700 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gamboge-600" /> Form Fields ({schema.length})
              </h2>
              <button onClick={() => handleAddField()} className="px-4 py-2 bg-gamboge-50 hover:bg-gamboge-100 text-gamboge-700 border border-gamboge-200 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center">
                <Plus className="w-4 h-4 mr-1" /> Add Custom Field
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center p-12 text-slate-500 font-bold uppercase tracking-widest text-xs">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading Form Builder...
              </div>
            ) : schema.length === 0 ? (
              <div className="embossed-card p-8 text-center">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 text-sm font-bold">No custom fields configured.</p>
                <p className="text-slate-400 text-xs font-medium mt-1">Click a preset above or "Add Custom Field" to customize your onboarding form.</p>
              </div>
            ) : (
              schema.map((field, index) => (
                <div key={field.id} className="embossed-card p-5 space-y-4 bg-white relative group animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => handleMoveField(index, 'up')} disabled={index === 0} className="p-1 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                      <button onClick={() => handleMoveField(index, 'down')} disabled={index === schema.length - 1} className="p-1 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-2">Field #{index + 1}</span>
                    </div>
                    <button onClick={() => handleDeleteField(field.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Field Label</label>
                      <input type="text" value={field.label} onChange={e => handleUpdateField(field.id, { label: e.target.value })} className="embossed-input w-full px-3 py-2 text-sm font-bold text-slate-700 outline-none rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Input Type</label>
                      <select value={field.type} onChange={e => handleUpdateField(field.id, { type: e.target.value as any })} className="bg-lightgray border border-slate-300 text-slate-700 text-xs font-bold rounded-xl p-2.5 w-full outline-none">
                        <option value="text">Short Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date Picker</option>
                        <option value="select">Dropdown Select</option>
                        <option value="textarea">Paragraph Text</option>
                      </select>
                    </div>
                  </div>

                  {field.type === 'select' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Options (Comma separated)</label>
                      <input type="text" value={field.options?.join(',') || ''} onChange={e => handleOptionChange(field.id, e.target.value)} placeholder="Option 1, Option 2, Option 3" className="embossed-input w-full px-3 py-2 text-xs font-semibold text-slate-700 outline-none rounded-xl" />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <label className="flex items-center cursor-pointer text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <input type="checkbox" checked={field.required} onChange={e => handleUpdateField(field.id, { required: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-gamboge-600 focus:ring-gamboge-500 accent-gamboge-600 mr-2" />
                      Required Field
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* LIVE FORM PREVIEW */}
          <div className="lg:col-span-5">
            <div className="sticky top-28">
              <div className="embossed-card p-6 bg-slate-50/80 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                  <Eye className="w-4 h-4 mr-2 text-gamboge-600" /> Live Employee Preview
                </h3>

                <div className="inner-depth p-6 rounded-2xl bg-gray-100 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-extrabold text-slate-800 text-sm">Additional HR Details</h4>
                    <p className="text-[10px] text-slate-400 font-medium">This is how the custom fields will appear during onboarding.</p>
                  </div>

                  {schema.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">Add fields to see live preview.</p>
                  ) : (
                    schema.map(field => (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select className="bg-lightgray border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl p-3 w-full outline-none">
                            <option value="">Select an option...</option>
                            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea placeholder={field.placeholder} rows={2} className="embossed-input w-full p-3 text-xs font-semibold text-slate-700 outline-none rounded-xl" />
                        ) : (
                          <input type={field.type} placeholder={field.placeholder} className="embossed-input w-full p-3 text-xs font-semibold text-slate-700 outline-none rounded-xl" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}