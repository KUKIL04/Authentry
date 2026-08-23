// apps/frontend/src/pages/landing/Pricing.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Lock, ArrowRight, ArrowUpRight, Building2, Zap, Globe } from 'lucide-react';

export default function Pricing() {
  const plans = [
    {
      name: "Free Workspace",
      code: "FREE_TIER",
      price: "0",
      icon: <Building2 className="w-6 h-6 text-slate-500" />,
      mau: "Up to 10",
      api: "10,000 / mo",
      cta: "Start for Free",
      isPremium: false,
    },
    {
      name: "Premium Workspace",
      code: "PREMIUM_TIER",
      price: "49",
      icon: <Zap className="w-6 h-6 text-gamboge-600" />,
      mau: "Up to 500",
      api: "100,000 / mo",
      cta: "Start Premium Trial",
      isPremium: true, // Triggers the indigo glow and embossed-badge styling
    },
    {
      name: "Enterprise",
      code: "ENTERPRISE",
      price: "199",
      icon: <Globe className="w-6 h-6 text-slate-700" />,
      mau: "Unlimited",
      api: "Unlimited",
      cta: "Contact Sales",
      isPremium: false,
    }
  ];

  const features = [
    { name: "Custom RBAC Engine", free: true, premium: true, enterprise: true },
    { name: "Event Webhooks & SGC Sync", free: false, premium: true, enterprise: true },
    { name: "White-label Custom Branding", free: false, premium: false, enterprise: true },
    { name: "Unlimited API Calls", free: false, premium: false, enterprise: true },
    { name: "Unlimited Active Users", free: false, premium: false, enterprise: true },
  ];

  return (
    <div className="min-h-screen bg-[#E6E9EF] text-slate-800 font-sans selection:bg-gamboge-500 selection:text-white pb-24">
      
      {/* GLOBAL NAVBAR (Matching Home.tsx) */}
      <nav className="fixed w-full z-50 top-0 px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 embossed-badge rounded-full flex items-center justify-center bg-lightgray">
              <ShieldCheck className="w-5 h-5 text-gamboge-600" />
            </div>
            <span className="text-xl font-extrabold tracking-tight uppercase">ManavSutra</span>
          </Link>
          <div className="hidden md:flex items-center space-x-8 text-sm font-bold uppercase tracking-widest text-slate-500">
            <Link to="/pricing" className="text-gamboge-600 transition-colors">Pricing</Link>
            <Link to="/developers" className="hover:text-gamboge-600 transition-colors">Developers</Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login" className="text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link to="/onboard-workspace" className="shine-btn px-6 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-widest shadow-md flex items-center">
              Start Free <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </nav>

      {/* HEADER */}
      <header className="pt-40 pb-16 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight uppercase mb-4">
          Transparent Pricing. <br className="hidden sm:block" />
          <span className="text-gamboge-600">Zero Surprises.</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto text-lg">
          Start building for free. Scale your enterprise identity architecture only when your workforce and user base demands it.
        </p>
      </header>

      {/* PRICING CARDS */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {plans.map((plan) => (
          <div key={plan.code} className={`embossed-card p-8 relative overflow-hidden flex flex-col ${plan.isPremium ? 'border-gamboge-400/50' : ''}`}>
            
            {/* Indigo Premium Glow from FeatureLockBanner */}
            {plan.isPremium && (
              <div className="absolute -right-10 -top-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none z-0"></div>
            )}

            <div className="relative z-10 flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200 bg-white ${plan.isPremium ? 'embossed-badge ring-4 ring-gamboge-50' : ''}`}>
                {plan.icon}
              </div>
              
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{plan.name}</h3>
              
              <div className="mt-4 mb-8">
                  <div className="flex items-end">
                    <span className="text-4xl font-black text-slate-900">${plan.price}</span>
                    <span className="text-sm font-bold text-slate-500 mb-1 ml-1">/mo</span>
                  </div>
                
              </div>

              <div className="inner-depth p-5 rounded-2xl space-y-4 mb-8">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Max Active Users (MAU)</p>
                  <p className="font-extrabold text-slate-800 text-sm">{plan.mau}</p>
                </div>
                <div className="h-px w-full bg-slate-300/50"></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Max API Calls</p>
                  <p className="font-extrabold text-slate-800 text-sm">{plan.api}</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 shrink-0 mt-auto">
              <Link 
                to="/admin/billing" 
                className={`w-full flex items-center justify-center py-4 px-6 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${
                  plan.isPremium 
                    ? 'shine-btn text-white' 
                    : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                }`}
              >
                {plan.cta} {plan.isPremium ? <ArrowUpRight className="w-4 h-4 ml-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* DETAILED FEATURE COMPARISON */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight uppercase">Platform Module Mapping</h2>
          <div className="h-1 w-12 rounded-full bg-gamboge-500 mx-auto mt-4 shadow-sm"></div>
        </div>

        <div className="embossed-card overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-300/50 bg-slate-50/50">
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest w-2/5">Feature Module</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest text-center w-1/5">Free</th>
                  <th className="py-5 px-6 text-xs font-bold text-gamboge-600 uppercase tracking-widest text-center w-1/5">Premium</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-800 uppercase tracking-widest text-center w-1/5">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/30">
                {features.map((feature, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-700 text-sm">{feature.name}</td>
                    
                    <td className="py-4 px-6 text-center">
                      {feature.free ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto drop-shadow-sm" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    
                    <td className="py-4 px-6 text-center bg-gamboge-50/20">
                      {feature.premium ? (
                        <CheckCircle2 className="w-5 h-5 text-gamboge-500 mx-auto drop-shadow-sm" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    
                    <td className="py-4 px-6 text-center">
                      {feature.enterprise ? (
                        <CheckCircle2 className="w-5 h-5 text-slate-800 mx-auto drop-shadow-sm" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}