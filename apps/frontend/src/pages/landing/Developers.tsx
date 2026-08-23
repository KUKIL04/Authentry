// apps/frontend/src/pages/landing/Developers.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Terminal, Webhook, KeyRound, ArrowRight, Server, Layers } from 'lucide-react';

export default function Developers() {
  const sdkCode = `import express from 'express';
import { AuthEntry } from '@authentry/node';

const app = express();

// 1. Initialize the AuthEntry Node SDK
const auth = new AuthEntry({
  apiKey: process.env.AE_SECRET_KEY,
  tenantId: process.env.AE_WORKSPACE_ID
});

// 2. Protect routes with the RBAC Engine
app.post(
  '/api/v1/billing/refund', 
  auth.requireRole(['FinanceAdmin', 'SuperAdmin']), 
  async (req, res) => {
    // Only accessible if the active user holds the correct role
    const processed = await processRefund(req.body.id);
    res.json({ success: true, processed });
});`;

  const webhookCode = `import { AuthEntry } from '@authentry/node';

const auth = new AuthEntry({
  apiKey: process.env.AE_SECRET_KEY,
  webhookSecret: process.env.AE_WEBHOOK_SECRET
});

// Mount the automated webhook receiver middleware
app.post('/api/webhooks/authentry', 
  express.raw({ type: 'application/json' }), 
  auth.webhooks.expressHandler((event, data) => {
    
    // Instantly sync HR changes to your internal database
    switch(event) {
      case 'user.session.revoked':
        console.log(\`Kill switch activated for user: \${data.userId}\`);
        break;
      case 'user.role.granted':
        console.log(\`User \${data.userId} granted role \${data.roleId}\`);
        break;
    }
}));`;

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
            <Link to="/pricing" className="hover:text-gamboge-600 transition-colors">Pricing</Link>
            <Link to="/developers" className="text-gamboge-600 transition-colors">Developers</Link>
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
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-200/50 border border-slate-300 text-slate-600 text-[10px] font-extrabold uppercase tracking-widest mb-6">
          <Terminal className="w-3.5 h-3.5 mr-2" /> Node.js SDK Available
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-4">
          Built for Developers. <br className="hidden sm:block" />
          Loved by <span className="text-gamboge-600">Administrators.</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto text-lg">
          Drop the AuthEntry SDK into your backend architecture and secure your internal tools with enterprise-grade RBAC in minutes.
        </p>
      </header>

      {/* SDK DEMO SECTIONS */}
      <div className="max-w-6xl mx-auto px-6 space-y-16">
        
        {/* API & RBAC */}
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 lg:pr-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-slate-200 mb-6">
              <KeyRound className="w-6 h-6 text-gamboge-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-4">Secure Middleware in Seconds</h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-6">
              Generate a secure API key from your Workspace Settings. Import our SDK, initialize your tenant space, and wrap your Express routes with strict Role-Based Access Control logic.
            </p>
            <div className="inner-depth p-4 inline-block font-mono text-xs font-bold text-slate-600 bg-slate-100/50">
              pnpm install @authentry/node
            </div>
          </div>
          <div className="flex-1 w-full relative">
            <div className="absolute -inset-4 bg-gamboge-500/10 blur-2xl rounded-full"></div>
            <div className="embossed-card p-2 rounded-3xl relative z-10 shadow-2xl">
              <div className="bg-[#1e1e2e] rounded-2xl overflow-hidden border border-slate-700/50">
                <div className="flex items-center px-4 py-3 bg-[#181825] border-b border-slate-700/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">server.ts</span>
                </div>
                <div className="p-6 overflow-x-auto">
                  <pre className="text-sm font-mono leading-relaxed">
                    <code className="text-slate-300" dangerouslySetInnerHTML={{ __html: sdkCode.replace(/AuthEntry/g, '<span class="text-gamboge-400 font-bold">AuthEntry</span>').replace(/express/g, '<span class="text-blue-400">express</span>').replace(/requireRole/g, '<span class="text-blue-400">requireRole</span>').replace(/'(.*?)'/g, '<span class="text-green-400">\'$1\'</span>').replace(/\/\/(.*)/g, '<span class="text-slate-500">//$1</span>') }} />
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WEBHOOKS */}
        <div className="flex flex-col-reverse lg:flex-row gap-12 items-center pt-8 border-t border-slate-300/50">
          <div className="flex-1 w-full relative">
            <div className="embossed-card p-2 rounded-3xl relative z-10 shadow-2xl">
              <div className="bg-[#1e1e2e] rounded-2xl overflow-hidden border border-slate-700/50">
                <div className="flex items-center px-4 py-3 bg-[#181825] border-b border-slate-700/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">webhooks.ts</span>
                </div>
                <div className="p-6 overflow-x-auto">
                  <pre className="text-sm font-mono leading-relaxed">
                    <code className="text-slate-300" dangerouslySetInnerHTML={{ __html: webhookCode.replace(/AuthEntry/g, '<span class="text-gamboge-400 font-bold">AuthEntry</span>').replace(/expressHandler/g, '<span class="text-blue-400">expressHandler</span>').replace(/'(.*?)'/g, '<span class="text-green-400">\'$1\'</span>').replace(/\/\/(.*)/g, '<span class="text-slate-500">//$1</span>').replace(/console.log/g, '<span class="text-amber-400">console.log</span>') }} />
                  </pre>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 lg:pl-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-slate-200 mb-6">
              <Webhook className="w-6 h-6 text-gamboge-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-4">Event Synchronization</h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-6">
              Don't constantly poll for user state changes. Register a webhook endpoint and let AuthEntry push live cryptographic identity events directly to your backend the moment HR revokes an account or updates a role.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center text-sm font-bold text-slate-600"><Layers className="w-4 h-4 mr-3 text-slate-400" /> user.session.revoked</li>
              <li className="flex items-center text-sm font-bold text-slate-600"><Layers className="w-4 h-4 mr-3 text-slate-400" /> user.role.granted</li>
              <li className="flex items-center text-sm font-bold text-slate-600"><Layers className="w-4 h-4 mr-3 text-slate-400" /> audit.log.batch</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}