// apps/frontend/src/pages/landing/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Users, Key, ArrowRight, CheckCircle2, 
  Building2, Layers, Lock, Activity, Mail, FileText, UserCheck, 
  Briefcase,
  LogIn
} from 'lucide-react';

export default function Home() {
  const steps = [
    {
      icon: <Building2 className="w-6 h-6 text-gamboge-600" />,
      title: "1. Provision Workspace",
      description: "Register your organization to establish a strictly isolated corporate directory with custom branding and compliance metadata."
    },
    {
      icon: <UserCheck className="w-6 h-6 text-gamboge-600" />,
      title: "2. Verify & Onboard",
      description: "Distribute time-sensitive invite links or import bulk rosters. Screen new personnel in the secure Waiting Room with custom HR forms."
    },
    {
      icon: <Key className="w-6 h-6 text-gamboge-600" />,
      title: "3. Govern Roles & Access",
      description: "Compose custom job titles, bundle allocated software suites with Read/Write precision, or grant direct module overrides."
    },
    {
      icon: <Activity className="w-6 h-6 text-gamboge-600" />,
      title: "4. Monitor & Enforce",
      description: "Protect accounts with Number-Match Push MFA, terminate live sessions remotely, and track every action in an immutable audit ledger."
    }
  ];

  return (
    <div className="min-h-screen bg-[#45403a] text-slate-800 font-sans selection:bg-gamboge-500 selection:text-white">
      
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
            <Link to="/controls" className="hover:text-gamboge-600 transition-colors">Governance</Link>
            <Link to="/pricing" className="hover:text-gamboge-600 transition-colors">Plans & Tiers</Link>
            <a href="mailto:spheri20verse04@gmail.com" className="hover:text-gamboge-600 transition-colors">Support</a>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4"> 
            <Link 
              to="/login" 
              className="p-2.5 text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center md:px-0 md:py-0"
            > 
              {/* Icon shown on small screens */}
              <LogIn className="w-5 h-5 md:hidden" />
              {/* Text shown on medium screens and up */}
              <span className="hidden md:inline text-sm font-bold uppercase tracking-widest">
                Sign In
              </span> 
            </Link> 

            <Link 
              to="/onboard-workspace" 
              className="shine-btn p-2.5 sm:p-3 md:px-6 md:py-2.5 rounded-xl text-white shadow-md flex items-center justify-center"
            > 
              {/* Icon shown on small screens */}
              <Briefcase className="w-4 h-4 md:hidden" />
              {/* Text shown on medium screens and up */}
              <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">
                Provision Workspace
              </span> 
            </Link> 
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gamboge-500/15 blur-[120px] rounded-full pointer-events-none z-0"></div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row items-center gap-16">
          
          {/* HERO COPY */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-slate-100 text-[10px] font-extrabold uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-gamboge-500 mr-2 animate-pulse"></span>
              Enterprise Identity & Resource Governance
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-slate-100 tracking-tight leading-tight mb-6 drop-shadow-lg">
              Centralized Identity. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gamboge-400 to-gamboge-600">
                Granular Control.
              </span>
            </h1>
            <p className="text-lg text-slate-300 font-medium mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Unify workforce directory management, Role-Based Access Control (RBAC), and enterprise application licensing under one zero-trust command plane—without writing a single line of configuration code.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
              <Link to="/onboard-workspace" className="shine-btn w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-bold uppercase tracking-widest flex items-center justify-center shadow-xl text-sm">
                Provision Organization <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link to="/controls" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#E6E9EF] hover:bg-white text-slate-700 font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center text-sm border-2 border-transparent hover:border-slate-300">
                <Layers className="w-5 h-5 mr-2 text-gamboge-600" /> Explore Governance
              </Link>
            </div>
          </div>

          {/* MINIMALIST GOVERNANCE CONTROL PREVIEW CARD */}
          <div className="flex-1 w-full max-w-xl lg:max-w-none">
            <div className="embossed-card p-6 sm:p-8 rounded-3xl bg-[#E6E9EF] shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-white/40 space-y-6">
              
              {/* Top Bar */}
              <div className="flex items-center justify-between border-b border-slate-300/60 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-gamboge-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Access Control Matrix</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Workspace Policy Engine</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 text-[10px] font-extrabold uppercase tracking-widest flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span> Enforced
                </span>
              </div>

              {/* Simulated Role & Entitlements Breakdown */}
              <div className="inner-depth p-5 rounded-2xl bg-slate-100/70 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Allocated Suite</span>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Permission Scope</span>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Key className="w-4 h-4 text-gamboge-600 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">Core HR & Directory</p>
                        <p className="text-[10px] font-semibold text-slate-400">Role: Regional HR Lead</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 text-[10px] font-extrabold uppercase tracking-widest">
                      READ / WRITE
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">Supply Chain & Logistics</p>
                        <p className="text-[10px] font-semibold text-slate-400">Direct Module Override</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-extrabold uppercase tracking-widest">
                      READ ONLY
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">Progressive HR Onboarding</p>
                        <p className="text-[10px] font-semibold text-slate-400">Custom Schema Verification</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-gamboge-50 text-gamboge-700 border border-gamboge-200 text-[10px] font-extrabold uppercase tracking-widest">
                      REQUIRED
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Telemetry Footer */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="bg-white/80 p-3 rounded-xl border border-slate-200/60 text-center">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Push MFA</p>
                  <p className="text-xs font-black text-slate-800 mt-1">Number-Match</p>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-slate-200/60 text-center">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Isolation</p>
                  <p className="text-xs font-black text-slate-800 mt-1">Multi-Tenant</p>
                </div>
                <div className="bg-white/80 p-3 rounded-xl border border-slate-200/60 text-center">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Sessions</p>
                  <p className="text-xs font-black text-slate-800 mt-1">Instant Kill-Switch</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ZERO TO GOVERNED PIPELINE */}
      <section className="py-24 bg-[#E6E9EF] border-t border-slate-200/50 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight uppercase">
              Workforce Governance in Four Steps
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-3 max-w-xl mx-auto">
              Streamline how sub-organizations onboard personnel, assign licensed software suites, and enforce security policies.
            </p>
            <div className="h-1.5 w-16 rounded-full bg-gamboge-500 mx-auto mt-6 shadow-sm"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="inner-depth p-8 rounded-3xl relative overflow-hidden group hover:bg-slate-50 transition-colors duration-300 border border-transparent hover:border-slate-300">
                <span className="absolute -top-4 -right-4 text-9xl font-black text-slate-200/50 pointer-events-none group-hover:text-gamboge-100/50 transition-colors duration-500">
                  {idx + 1}
                </span>
                
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 border border-slate-200">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-14 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-gamboge-500" />
              <span className="text-lg font-extrabold text-white tracking-tight uppercase">ManavSutra</span>
            </div>
            <p className="text-xs font-medium text-slate-400 max-w-sm leading-relaxed mb-4">
              Enterprise Identity Provider (IDP), Role-Based Access Control, and multi-tenant resource allocation platform for modern organizations.
            </p>
            <a 
              href="mailto:spheri20verse04@gmail.com" 
              className="inline-flex items-center text-xs font-bold text-gamboge-400 hover:text-gamboge-300 transition-colors"
            >
              <Mail className="w-4 h-4 mr-2" /> spheri20verse04@gmail.com
            </a>
          </div>
          <div className="flex flex-col space-y-2.5">
            <span className="text-xs font-bold text-white uppercase tracking-widest mb-1">Platform</span>
            <Link to="/controls" className="text-sm hover:text-white transition-colors">Access Governance</Link>
            <Link to="/pricing" className="text-sm hover:text-white transition-colors">Subscription Tiers</Link>
            <Link to="/onboard-workspace" className="text-sm hover:text-white transition-colors">Provision Workspace</Link>
          </div>
          <div className="flex flex-col space-y-2.5">
            <span className="text-xs font-bold text-white uppercase tracking-widest mb-1">Legal & Support</span>
            <Link to="/privacy-policy" className="text-sm hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-sm hover:text-white transition-colors">Terms of Service</Link>
            <a href="mailto:spheri20verse04@gmail.com" className="text-sm hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>

    </div>
  );
}