// apps/frontend/src/pages/landing/Pricing.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, CheckCircle2, Lock, ArrowRight, ArrowUpRight, 
  Building2, Zap, Globe, Mail, HelpCircle 
} from 'lucide-react';

export default function Pricing() {
  const plans = [
    {
      name: "Free Workspace",
      code: "FREE_TIER",
      rank: 0,
      price: "0",
      icon: <Building2 className="w-6 h-6 text-slate-500" />,
      mau: "100 Active Users",
      api: "1,000 / mo",
      cta: "Provision Free Workspace",
      link: "/onboard-workspace",
      isPremium: false,
    },
    {
      name: "Premium Workspace",
      code: "PREMIUM_TIER",
      rank: 10,
      price: "49",
      icon: <Zap className="w-6 h-6 text-gamboge-600" />,
      mau: "1,000 Active Users",
      api: "10,000 / mo",
      cta: "Start Premium Workspace",
      link: "/onboard-workspace",
      isPremium: true,
    },
    {
      name: "Enterprise Workspace",
      code: "ENTERPRISE",
      rank: 20,
      price: "199",
      icon: <Globe className="w-6 h-6 text-slate-700" />,
      mau: "Unlimited",
      api: "Unlimited",
      cta: "Provision Enterprise",
      link: "/onboard-workspace",
      isPremium: false,
    }
  ];

  const features = [
    { 
      name: "Custom RBAC Engine", 
      key: "advancedRbac", 
      requiredTier: "Premium Workspace",
      free: false, 
      premium: true, 
      enterprise: true 
    },
    { 
      name: "White-label Custom Branding", 
      key: "customTheme", 
      requiredTier: "Premium Workspace",
      free: false, 
      premium: true, 
      enterprise: true 
    },
    { 
      name: "Unlimited API Calls", 
      key: "unlimitedApi", 
      requiredTier: "Enterprise Workspace",
      free: false, 
      premium: false, 
      enterprise: true 
    },
    { 
      name: "Unlimited Active Users", 
      key: "unlimitedMau", 
      requiredTier: "Enterprise Workspace",
      free: false, 
      premium: false, 
      enterprise: true 
    },
  ];

  return (
    <div className="min-h-screen bg-[#E6E9EF] text-slate-800 font-sans selection:bg-gamboge-500 selection:text-white pb-24">
      
      {/* GLOBAL NAVBAR */}
      <nav className="fixed w-full z-50 top-0 px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 embossed-badge rounded-full flex items-center justify-center bg-lightgray">
              <ShieldCheck className="w-5 h-5 text-gamboge-600" />
            </div>
            <span className="text-xl font-extrabold tracking-tight uppercase">ManavSutra</span>
          </Link>
          <div className="hidden md:flex items-center space-x-8 text-sm font-bold uppercase tracking-widest text-slate-500">
            <Link to="/developers" className="hover:text-gamboge-600 transition-colors">Governance</Link>
            <Link to="/pricing" className="text-gamboge-600 transition-colors">Plans & Tiers</Link>
            <a href="mailto:spheri20verse04@gmail.com" className="hover:text-gamboge-600 transition-colors">Support</a>
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
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-200/70 border border-slate-300 text-slate-600 text-[10px] font-extrabold uppercase tracking-widest mb-6">
          Workspace Subscription Matrix
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight uppercase mb-4">
          Subscription Tiers. <br className="hidden sm:block" />
          <span className="text-gamboge-600">Predictable Governance.</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto text-lg">
          Provision your corporate workspace for free. Upgrade your tier as your active workforce, custom role hierarchy, and white-label requirements expand.
        </p>
      </header>

      {/* PRICING CARDS */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {plans.map((plan) => (
          <div key={plan.code} className={`embossed-card p-8 relative overflow-hidden flex flex-col ${plan.isPremium ? 'border-gamboge-400/60' : ''}`}>
            
            {plan.isPremium && (
              <div className="absolute -right-10 -top-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none z-0"></div>
            )}

            <div className="relative z-10 flex-1">
              <div className="flex items-center justify-between mb-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm border border-slate-200 bg-white ${plan.isPremium ? 'embossed-badge ring-4 ring-gamboge-50' : ''}`}>
                  {plan.icon}
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-widest">
                    {plan.code}
                  </span>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-slate-200/70 text-slate-600 text-[10px] font-extrabold uppercase tracking-widest">
                    Rank: {plan.rank}
                  </span>
                </div>
              </div>
              
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{plan.name}</h3>
              
              <div className="mt-4 mb-8">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Price (USD)</p>
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
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Max Monthly API Calls</p>
                  <p className="font-extrabold text-slate-800 text-sm">{plan.api}</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 shrink-0 mt-auto">
              <Link 
                to={plan.link} 
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

      {/* PLATFORM FEATURES MATRIX */}
      <div className="max-w-6xl mx-auto px-6 mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight uppercase">Platform Features & Entitlements</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
            Feature Gate Breakdown by Subscription Tier
          </p>
          <div className="h-1 w-12 rounded-full bg-gamboge-500 mx-auto mt-4 shadow-sm"></div>
        </div>

        <div className="embossed-card overflow-hidden rounded-3xl p-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-300/50 bg-slate-50/50">
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest w-2/6">Feature Module</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest text-center w-1/6">Free Workspace</th>
                  <th className="py-5 px-6 text-xs font-bold text-gamboge-600 uppercase tracking-widest text-center w-1/6">Premium Workspace</th>
                  <th className="py-5 px-6 text-xs font-bold text-slate-800 uppercase tracking-widest text-center w-1/6">Enterprise Workspace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/30">
                {features.map((feature, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-slate-800 text-sm">{feature.name}</div>
                      <div className="text-[11px] font-mono font-bold text-slate-400 mt-0.5">{feature.key}</div>
                    </td>
                    
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

      {/* ENTERPRISE SUPPORT & INQUIRIES BANNER */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="inner-depth p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-100/60 border border-slate-200/80">
          <div className="flex items-start space-x-4 text-left">
            <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-200 text-gamboge-600 shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Need Custom Suite Allocations or Support?</h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                Reach out to our platform administration desk for custom organization onboarding, billing assistance, or enterprise SLA inquiries.
              </p>
            </div>
          </div>
          <a 
            href="mailto:spheri20verse04@gmail.com" 
            className="shine-btn px-6 py-3.5 rounded-2xl text-white text-xs font-bold tracking-widest shadow-md flex items-center shrink-0"
          >
            <Mail className="w-4 h-4 mr-2" /> spheri20verse04@gmail.com
          </a>
        </div>
      </div>

    </div>
  );
}