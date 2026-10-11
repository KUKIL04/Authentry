// apps/frontend/src/pages/landing/Controls.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, KeyRound, ArrowRight, Layers, Users, 
  ShieldAlert, FileText, CheckCircle2, Lock, Smartphone, Mail 
} from 'lucide-react';

export default function Controls() {
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
            <Link to="/controls" className="text-gamboge-600 transition-colors">Controls</Link>
            <Link to="/pricing" className="hover:text-gamboge-600 transition-colors">Plans & Tiers</Link>
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
          <ShieldCheck className="w-3.5 h-3.5 mr-2 text-gamboge-600" /> Zero-Code Access Administration
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-4 uppercase">
          Enterprise Identity. <br className="hidden sm:block" />
          <span className="text-gamboge-600">Unified Resource Control.</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto text-lg">
          ManavSutra eliminates manual configuration. Sub-companies receive pre-integrated software suites from the parent organization and govern employee access through an intuitive visual control plane.
        </p>
      </header>

      {/* ARCHITECTURE PILLARS */}
      <div className="max-w-6xl mx-auto px-6 space-y-16">
        
        {/* PILLAR 1: RBAC & MODULE OVERRIDES */}
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 lg:pr-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-slate-200 mb-6">
              <KeyRound className="w-6 h-6 text-gamboge-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-4">
              Custom Role Composer & Direct Overrides
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-6">
              Workspace administrators never need to touch code to enforce least-privilege access. Clone global role blueprints or compose bespoke job titles that bundle specific software modules with granular <strong>READ</strong> or <strong>WRITE</strong> clearances.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center text-sm font-bold text-slate-700">
                <CheckCircle2 className="w-4 h-4 mr-3 text-gamboge-600 shrink-0" />
                One-click System Blueprint cloning for rapid workspace setup
              </li>
              <li className="flex items-center text-sm font-bold text-slate-700">
                <CheckCircle2 className="w-4 h-4 mr-3 text-gamboge-600 shrink-0" />
                Individual user module overrides without altering base roles
              </li>
              <li className="flex items-center text-sm font-bold text-slate-700">
                <CheckCircle2 className="w-4 h-4 mr-3 text-gamboge-600 shrink-0" />
                Reverse access auditing to inspect every user assigned to a module
              </li>
            </ul>
          </div>

          <div className="flex-1 w-full">
            <div className="embossed-card p-6 sm:p-8 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-300/60 pb-4">
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Role Bundle Configuration</span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-gamboge-50 text-gamboge-700 rounded-md border border-gamboge-200">
                  advancedRbac
                </span>
              </div>
              <div className="inner-depth p-4 rounded-2xl space-y-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">Procurement & Suppliers</p>
                    <p className="text-[10px] font-semibold text-slate-400">Inherited via Role Bundle</p>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded bg-green-100 text-green-700 border border-green-200 uppercase tracking-widest">
                    WRITE
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">Warehouse Inventory</p>
                    <p className="text-[10px] font-semibold text-slate-400">Explicit User Override</p>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-widest">
                    READ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PILLAR 2: WAITING ROOM & PROGRESSIVE PROFILING */}
        <div className="flex flex-col-reverse lg:flex-row gap-12 items-center pt-8 border-t border-slate-300/50">
          <div className="flex-1 w-full">
            <div className="embossed-card p-6 sm:p-8 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-300/60 pb-4">
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Dynamic HR Onboarding Schema</span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md border border-amber-200">
                  Strict Enforcement
                </span>
              </div>
              <div className="inner-depth p-4 rounded-2xl space-y-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Department Classification <span className="text-red-500">*</span></span>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Dropdown Select</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Emergency Contact Number <span className="text-red-500">*</span></span>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Verified Text</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Employee ID Code</span>
                  <span className="text-[10px] font-mono font-bold text-gamboge-600 uppercase">Unique Composite Key</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 lg:pl-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-slate-200 mb-6">
              <FileText className="w-6 h-6 text-gamboge-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-4">
              Waiting Room & Progressive Profiling
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-6">
              Maintain air-tight directory hygiene. Design custom onboarding forms to capture mandatory HR fields, or upload CSV/Excel rosters to pre-populate employee profiles and assign job titles in bulk.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center text-sm font-bold text-slate-700">
                <CheckCircle2 className="w-4 h-4 mr-3 text-gamboge-600 shrink-0" />
                Zero-Trust Waiting Room holds unverified signups until HR approval
              </li>
              <li className="flex items-center text-sm font-bold text-slate-700">
                <CheckCircle2 className="w-4 h-4 mr-3 text-gamboge-600 shrink-0" />
                Strict profile enforcement intercepts logins missing required HR fields
              </li>
              <li className="flex items-center text-sm font-bold text-slate-700">
                <CheckCircle2 className="w-4 h-4 mr-3 text-gamboge-600 shrink-0" />
                Global identity recognition links multi-workspace users seamlessly
              </li>
            </ul>
          </div>
        </div>

        {/* PILLAR 3: SESSION & CREDENTIAL SECURITY */}
        <div className="flex flex-col lg:flex-row gap-12 items-center pt-8 border-t border-slate-300/50">
          <div className="flex-1 lg:pr-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-slate-200 mb-6">
              <ShieldAlert className="w-6 h-6 text-gamboge-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-4">
              Live Session Control & Push MFA
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-6">
              Defend every workspace against credential stuffing, token replay, and anomalous geographical logins. Administrators have full visibility into active network tokens with instant termination controls.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center text-sm font-bold text-slate-700">
                <Smartphone className="w-4 h-4 mr-3 text-gamboge-600 shrink-0" />
                Number-Match Push MFA challenges across registered user devices
              </li>
              <li className="flex items-center text-sm font-bold text-slate-700">
                <Lock className="w-4 h-4 mr-3 text-gamboge-600 shrink-0" />
                Remote Session Kill-Switch, Force Password Reset, and Lockout Clearing
              </li>
              <li className="flex items-center text-sm font-bold text-slate-700">
                <Layers className="w-4 h-4 mr-3 text-gamboge-600 shrink-0" />
                Immutable system audit logs with Omni-Search across actors and IPs
              </li>
            </ul>
          </div>

          <div className="flex-1 w-full">
            <div className="embossed-card p-6 sm:p-8 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-300/60 pb-4">
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Active Security Perimeter</span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-red-50 text-red-600 rounded-md border border-red-200">
                  Real-Time Defense
                </span>
              </div>
              <div className="inner-depth p-4 rounded-2xl space-y-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">Number-Match MFA Challenge</p>
                    <p className="text-[10px] font-semibold text-slate-400">3-Option Native OS Push Verification</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-green-600 uppercase tracking-widest">Active</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">Token Replay & Geo-IP Trap</p>
                    <p className="text-[10px] font-semibold text-slate-400">Automated Global Session Revocation</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-green-600 uppercase tracking-widest">Armed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SUPPORT CTA */}
        <div className="pt-8">
          <div className="inner-depth p-8 rounded-3xl text-center space-y-4">
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Questions About Workspace Governance?</h3>
            <p className="text-sm font-medium text-slate-500 max-w-xl mx-auto">
              Contact our platform support team for guidance on multi-company onboarding, software suite allocations, or security compliance.
            </p>
            <div className="pt-2">
              <a 
                href="mailto:spheri20verse04@gmail.com" 
                className="inline-flex items-center px-6 py-3 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-extrabold tracking-widest text-gamboge-600 hover:bg-slate-50 transition-all"
              >
                <Mail className="w-4 h-4 mr-2" /> spheri20verse04@gmail.com
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}