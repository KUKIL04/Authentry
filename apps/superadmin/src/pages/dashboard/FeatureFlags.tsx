import React, { useState, useEffect } from 'react';
import { SuperAdminAPI } from '../../api/superadmin.api';
import { Shield, Users, Save, Server, Palette, Webhook, Loader2, DollarSign, Activity, Plus, X } from 'lucide-react';

const FEATURE_META: Record<string, { label: string, icon: any }> = {
  unlimitedMau: { label: 'Unlimited Active Users', icon: Users },
  unlimitedApi: { label: 'Unlimited API Calls', icon: Server },
  customTheme: { label: 'White-label Custom Branding', icon: Palette },
  advancedRbac: { label: 'Custom RBAC Engine', icon: Shield },
  webhooksIntegration: { label: 'Event Webhooks & Sync', icon: Webhook }, // <--- ADDED HERE
};

export default function FeatureFlags() {
  const [plans, setPlans] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [originalFeatures, setOriginalFeatures] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Create Tier Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlan, setNewPlan] = useState({ code: '', name: '', price: 0, maxMau: '', maxApi: '', rank: 10 });

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    try {
      setIsLoading(true);
      const data = await SuperAdminAPI.Billing.getFeatureMatrix();
      
      // Safety fallback arrays in case database is empty
      const fetchedPlans = Array.isArray(data.plans) ? data.plans : [];
      const fetchedFeatures = Array.isArray(data.features) ? data.features : [];

      setPlans(fetchedPlans);
      setFeatures(fetchedFeatures);
      setOriginalFeatures(JSON.parse(JSON.stringify(fetchedFeatures))); 
    } catch (error) {
      notify('error', 'Failed to load entitlement engine data. Check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleFeatureChange = (featureKey: string, newPlanCode: string) => {
    setFeatures(prev => prev.map(f => f.feature_key === featureKey ? { ...f, min_plan_code: newPlanCode } : f));
  };

  const handlePlanChange = (planCode: string, field: string, value: string) => {
    setPlans(prev => prev.map(p => p.code === planCode ? { ...p, [field]: value } : p));
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await SuperAdminAPI.Billing.createPlan({
        code: newPlan.code.toUpperCase().replace(/\s+/g, '_'),
        name: newPlan.name,
        monthlyPriceUsd: newPlan.price,
        maxMau: newPlan.maxMau ? parseInt(newPlan.maxMau) : null,
        maxApiRequests: newPlan.maxApi ? parseInt(newPlan.maxApi) : null,
        tierRank: newPlan.rank
      });
      notify('success', `Tier ${newPlan.name} created successfully.`);
      setShowCreateModal(false);
      fetchMatrix(); // Refresh everything
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Failed to create plan.');
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // 1. Update Plans
      for (const plan of plans) {
        await SuperAdminAPI.Billing.updatePlan(plan.code, {
          monthlyPriceUsd: parseFloat(plan.monthly_price_usd) || 0,
          maxMau: plan.max_mau ? parseInt(plan.max_mau, 10) : null,
          maxApiRequests: plan.max_api_requests ? parseInt(plan.max_api_requests, 10) : null,
        });
      }

      // 2. Update Feature Flags
      const changedFeatures = features.filter((f, idx) => f.min_plan_code !== originalFeatures[idx]?.min_plan_code);
      await Promise.all(
        changedFeatures.map(f => SuperAdminAPI.Billing.updateFeatureFlag(f.feature_key, f.min_plan_code))
      );

      setOriginalFeatures(JSON.parse(JSON.stringify(features)));
      notify('success', 'Entitlement Engine synchronized successfully.');
    } catch (error) {
      notify('error', 'Failed to sync configurations.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const hasChanges = JSON.stringify(features) !== JSON.stringify(originalFeatures);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-white relative">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Entitlement Engine</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Configure subscription limits, tier pricing, and feature mappings.
          </p>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Tier
          </button>
          
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
            Sync Engine
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-950/50 text-red-400 border border-red-900' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900'}`}>
          {message.text}
        </div>
      )}

      {/* SECTION 1: PLAN LIMITS & QUOTAS */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Subscription Tiers</h2>
        
        {plans.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-700 rounded-3xl text-center text-slate-500">
            No tiers found. Click "Add Tier" to create your first subscription plan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.code} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-full h-1 bg-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">{plan.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">{plan.code}</p>
                  </div>
                  <span className="text-[10px] bg-slate-950 text-slate-500 px-2 py-1 rounded font-mono border border-slate-800">
                    Rank: {plan.tier_rank}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Monthly Price (USD)</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="number" 
                        value={plan.monthly_price_usd} 
                        onChange={(e) => handlePlanChange(plan.code, 'monthly_price_usd', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Max Active Users (MAU)</label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="number" 
                        placeholder="Unlimited"
                        value={plan.max_mau || ''} 
                        onChange={(e) => handlePlanChange(plan.code, 'max_mau', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Max Monthly API Calls</label>
                    <div className="relative">
                      <Activity className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="number" 
                        placeholder="Unlimited"
                        value={plan.max_api_requests || ''} 
                        onChange={(e) => handlePlanChange(plan.code, 'max_api_requests', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: FEATURE MATRIX MAPPING */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Platform Features</h2>
          {hasChanges && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest animate-pulse">Unsaved Mappings</span>}
        </div>
        
        {features.length === 0 ? (
           <div className="p-8 border border-dashed border-slate-700 rounded-3xl text-center text-slate-500">
             No features found in the database. Ensure database migrations are seeded.
           </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-12 bg-slate-950/50 border-b border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <div className="col-span-7 p-5">Feature Module</div>
              <div className="col-span-5 p-5">Required Tier</div>
            </div>

            <div className="divide-y divide-slate-800/50">
              {features.map((feature) => {
                const meta = FEATURE_META[feature.feature_key] || { label: feature.description || feature.feature_key, icon: Shield };
                const Icon = meta.icon;
                
                return (
                  <div key={feature.feature_key} className="grid grid-cols-12 hover:bg-slate-800/30 transition-colors items-center">
                    <div className="col-span-7 p-5 flex items-center">
                      <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mr-4 shrink-0">
                        <Icon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-white block">{meta.label}</span>
                        <span className="text-[10px] font-mono text-slate-500 mt-1">{feature.feature_key}</span>
                      </div>
                    </div>

                    <div className="col-span-5 p-5">
                      <select
                        value={feature.min_plan_code}
                        onChange={(e) => handleFeatureChange(feature.feature_key, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-2 px-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                      >
                        {plans.map(p => (
                          <option key={p.code} value={p.code}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CREATE TIER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Create New Tier</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Internal Code (e.g. ENTERPRISE_PRO)</label>
                <input required type="text" value={newPlan.code} onChange={e => setNewPlan({...newPlan, code: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Display Name</label>
                <input required type="text" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Base Price ($)</label>
                  <input type="number" required value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Hierarchy Rank</label>
                  <input type="number" required value={newPlan.rank} onChange={e => setNewPlan({...newPlan, rank: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">Create Tier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}