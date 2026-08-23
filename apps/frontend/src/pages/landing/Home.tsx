// apps/frontend/src/pages/landing/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Terminal, Users, Key, ArrowRight, Code, CheckCircle2, Building2 } from 'lucide-react';

export default function Home() {
  const codeSnippet = `// 1. Initialize AuthEntry SDK
import { AuthEntry } from '@authentry/node';

const auth = new AuthEntry({ 
  apiKey: 'ae_live_8f7d9a...',
  tenantId: 'workspace_10924'
});

// 2. Secure your routes instantly
app.get(
  '/api/internal/payroll', 
  auth.requireRole('PayrollAdmin'), 
  (req, res) => {
    res.json({ data: 'Highly classified data' });
});`;

  const steps = [
    {
      icon: <Building2 className="w-6 h-6 text-gamboge-600" />,
      title: "1. Provision Workspace",
      description: "Administrators register their company, securing a strictly isolated, branded tenant database in seconds."
    },
    {
      icon: <Code className="w-6 h-6 text-gamboge-600" />,
      title: "2. Integrate the SDK",
      description: "Developers generate API keys and drop the lightweight Node SDK into external services to lock them down instantly."
    },
    {
      icon: <Key className="w-6 h-6 text-gamboge-600" />,
      title: "3. Dispatch Secure Invites",
      description: "HR bypasses vulnerable default passwords by distributing cryptographically secure, time-sensitive registration links."
    },
    {
      icon: <Users className="w-6 h-6 text-gamboge-600" />,
      title: "4. Frictionless Onboarding",
      description: "Employees complete multi-factor verification, dropping directly into the Waiting Room for final approval."
    }
  ];

  return (
    <div className="min-h-screen bg-[#45403a] text-slate-800 font-sans selection:bg-gamboge-500 selection:text-white">
      
      {/* GLOBAL NAVBAR */}
      <nav className="fixed w-full z-50 top-0 px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 embossed-badge rounded-full flex items-center justify-center bg-lightgray">
              <ShieldCheck className="w-5 h-5 text-gamboge-600" />
            </div>
            <span className="text-xl font-extrabold tracking-tight uppercase">ManavSutra</span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm font-bold uppercase tracking-widest text-slate-500">
            <Link to="/pricing" className="hover:text-gamboge-600 transition-colors">Pricing</Link>
            <Link to="/developers" className="hover:text-gamboge-600 transition-colors">Developers</Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login" className="text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link to="/onboard-workspace" className="shine-btn px-6 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-widest shadow-md">
              Start Free Workspace
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gamboge-500/20 blur-[120px] rounded-full pointer-events-none z-0"></div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row items-center gap-16">
          
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-gamboge-100/80 border border-gamboge-200 text-white text-[10px] font-extrabold uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-gamboge-500 mr-2 animate-pulse"></span>
              Enterprise Identity, Decoupled.
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-100 tracking-tight leading-tight mb-6 drop-shadow-lg">
              Secure Your Stack. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gamboge-400 to-gamboge-600">Empower Your Team.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 font-medium mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              The premier Identity Provider bridging the gap between HR administration and backend engineering. Self-serve onboarding, granular RBAC, and real-time event webhooks—ready in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
              <Link to="/onboard-workspace" className="shine-btn w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-bold uppercase tracking-widest flex items-center justify-center shadow-xl text-sm">
                Provision Organization <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link to="/developers" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#E6E9EF] hover:bg-white text-slate-700 font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center text-sm border-2 border-transparent hover:border-slate-300">
                <Terminal className="w-5 h-5 mr-2" /> View SDK Docs
              </Link>
            </div>
          </div>

          {/* IDE MOCKUP */}
          <div className="flex-1 w-full max-w-xl lg:max-w-none perspective-[1000px]">
            <div className="embossed-card p-2 rounded-3xl transform lg:-rotate-y-6 lg:rotate-x-2 transition-transform duration-700 hover:rotate-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="bg-[#1e1e2e] rounded-2xl overflow-hidden border border-slate-700/50">
                <div className="flex items-center px-4 py-3 bg-[#181825] border-b border-slate-700/50">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="mx-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">server.ts - AuthEntry SDK</span>
                </div>
                <div className="p-6 overflow-x-auto">
                  <pre className="text-sm font-mono leading-relaxed">
                    <code className="text-slate-300" dangerouslySetInnerHTML={{ __html: codeSnippet.replace(/AuthEntry/g, '<span class="text-gamboge-400 font-bold">AuthEntry</span>').replace(/requireRole/g, '<span class="text-blue-400">requireRole</span>').replace(/get/g, '<span class="text-blue-400">get</span>').replace(/'(.*?)'/g, '<span class="text-green-400">\'$1\'</span>').replace(/\/\/(.*)/g, '<span class="text-slate-500">//$1</span>') }} />
                  </pre>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ZERO TO SECURED PIPELINE */}
      <section className="py-24 bg-[#E6E9EF] border-t border-slate-200/50 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight uppercase">
              Zero to Secured in Four Steps
            </h2>
            <div className="h-1.5 w-16 rounded-full bg-gamboge-500 mx-auto mt-6 shadow-sm"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="inner-depth p-8 rounded-3xl relative overflow-hidden group hover:bg-slate-50 transition-colors duration-300 border border-transparent hover:border-slate-300">
                {/* Number Watermark */}
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
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-gamboge-500" />
              <span className="text-lg font-extrabold text-white tracking-tight uppercase">ManavSutra</span>
            </div>
            <p className="text-xs font-medium">Enterprise-grade multi-tenant identity administration.</p>
          </div>
          <div className="flex flex-col space-y-2">
            <span className="text-xs font-bold text-white uppercase tracking-widest mb-2">Platform</span>
            <Link to="/pricing" className="text-sm hover:text-white transition-colors">Pricing & Plans</Link>
            <Link to="/developers" className="text-sm hover:text-white transition-colors">Developer SDK</Link>
          </div>
          <div className="flex flex-col space-y-2">
            <span className="text-xs font-bold text-white uppercase tracking-widest mb-2">Legal</span>
            <Link to="/privacy-policy" className="text-sm hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-sm hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}