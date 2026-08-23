import React, { useState, useEffect } from 'react';
import { AdminAPI } from '../../api/admin.api';
import { CreditCard, Activity, Users, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function BillingSettings() {
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<any>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statusData, plansData] = await Promise.all([
        AdminAPI.getBillingStatus(),
        AdminAPI.getAvailablePlans()
      ]);
      setBillingStatus(statusData);
      setPlans(plansData);
    } catch (err) {
      notify('error', 'Failed to load billing configurations.');
    } finally {
      setIsLoading(false);
    }
  };

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleUpgrade = async (planCode: string) => {
    setIsProcessing(true);
    try {
      await AdminAPI.upgradePlan(planCode);
      notify('success', 'Plan upgraded successfully. Limits have been expanded.');
      setShowConfirmModal(null);
      await fetchData();
    } catch (err: any) {
      notify('error', err.response?.data?.error || 'Upgrade failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || !billingStatus) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 font-bold uppercase tracking-widest text-sm">
        <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading Billing Data...
      </div>
    );
  }

  const { subscription, usage } = billingStatus;

  // Helper to calculate progress bar percentages safely
  const getPercentage = (current: number, max: number | null) => {
    if (max === null) return 0;
    const pct = (current / max) * 100;
    return pct > 100 ? 100 : pct;
  };

  return (
    <div className="w-full pb-12 relative">
      <div className="sticky top-0 z-40 px-4 sm:px-8 lg:px-12 py-4 lg:py-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm supports-[backdrop-filter]:bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Billing & Usage</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Monitor limits, manage your plan, and upgrade capabilities.</p>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-12 mt-8 max-w-5xl mx-auto space-y-8">
        
        {message.text && (
          <div className={`px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {/* SECTION 1: USAGE METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MAU Usage Card */}
          <div className="embossed-card p-6 sm:p-8 rounded-3xl w-full border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 flex items-center"><Users className="w-5 h-5 mr-2 text-gamboge-600" /> Active Users</h3>
              <span className="text-sm font-mono font-bold text-slate-500">{usage.mau.current} / {usage.mau.max === null ? 'Unlimited' : usage.mau.max}</span>
            </div>
            {usage.mau.max !== null && (
              <div className="w-full bg-slate-200 rounded-full h-3 mb-2 shadow-inner">
                <div 
                  className={`h-3 rounded-full ${getPercentage(usage.mau.current, usage.mau.max) > 90 ? 'bg-red-500' : 'bg-gamboge-500'}`} 
                  style={{ width: `${getPercentage(usage.mau.current, usage.mau.max)}%` }}
                ></div>
              </div>
            )}
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              {usage.mau.max === null ? 'No hard limit applied' : 'When limits are reached, you cannot invite new personnel.'}
            </p>
          </div>

          {/* API Usage Card */}
          <div className="embossed-card p-6 sm:p-8 rounded-3xl w-full border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 flex items-center"><Activity className="w-5 h-5 mr-2 text-gamboge-600" /> API Requests</h3>
              <span className="text-sm font-mono font-bold text-slate-500">{usage.api.current} / {usage.api.max === null ? 'Unlimited' : usage.api.max}</span>
            </div>
            {usage.api.max !== null && (
              <div className="w-full bg-slate-200 rounded-full h-3 mb-2 shadow-inner">
                <div 
                  className={`h-3 rounded-full ${getPercentage(usage.api.current, usage.api.max) > 90 ? 'bg-red-500' : 'bg-gamboge-500'}`} 
                  style={{ width: `${getPercentage(usage.api.current, usage.api.max)}%` }}
                ></div>
              </div>
            )}
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Resets at the end of the billing cycle.</p>
          </div>
        </div>

        {/* SECTION 2: AVAILABLE PLANS */}
        <div>
          <h2 className="text-xl font-bold text-slate-700 mb-6 flex items-center border-b border-slate-300/50 pb-4">
            <CreditCard className="w-5 h-5 mr-3 text-gamboge-600" /> Subscription Tiers
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = subscription.plan_code === plan.code;
              const isDowngrade = plan.tier_rank < subscription.tier_rank;

              return (
                <div key={plan.code} className={`relative p-6 rounded-3xl border-2 transition-all ${isCurrent ? 'bg-gamboge-50/30 border-gamboge-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  {isCurrent && (
                    <div className="absolute top-0 right-0 bg-gamboge-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl rounded-tr-xl">
                      Current Plan
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-slate-800 mb-1">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-3xl font-extrabold text-slate-900">${plan.monthly_price_usd}</span>
                    <span className="text-sm font-bold text-slate-500">/mo</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center text-sm font-medium text-slate-600">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-gamboge-600" /> 
                      {plan.max_mau === null ? 'Unlimited' : plan.max_mau} Active Users
                    </li>
                    <li className="flex items-center text-sm font-medium text-slate-600">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-gamboge-600" /> 
                      {plan.max_api_requests === null ? 'Unlimited' : plan.max_api_requests} API Requests
                    </li>
                  </ul>

                  {!isCurrent && (
                    <button
                      onClick={() => setShowConfirmModal(plan)}
                      disabled={isDowngrade}
                      className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                        isDowngrade 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg'
                      }`}
                    >
                      {isDowngrade ? 'Contact Support to Downgrade' : 'Upgrade Plan'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* UPGRADE CONFIRMATION MODAL */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-gamboge-600" /> Confirm Checkout
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-gamboge-50 border border-gamboge-200 p-4 rounded-xl flex items-start">
                  <AlertTriangle className="w-5 h-5 text-gamboge-600 mr-3 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-gamboge-900 text-sm">Payment integration pending.</h4>
                    <p className="text-xs text-gamboge-800 mt-1 font-medium">By clicking confirm, your workspace will instantly be upgraded to the <strong>{showConfirmModal.name}</strong> tier and limits will expand. You will be billed ${showConfirmModal.monthly_price_usd} on your next cycle.</p>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-sm font-bold text-slate-600">Total Due Today</span>
                  <span className="text-xl font-extrabold text-slate-800">${showConfirmModal.monthly_price_usd}.00</span>
                </div>

                <div className="pt-4 flex justify-end space-x-3">
                  <button onClick={() => setShowConfirmModal(null)} className="px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                  <button 
                    onClick={() => handleUpgrade(showConfirmModal.code)} 
                    disabled={isProcessing}
                    className="px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />} Confirm Upgrade
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}