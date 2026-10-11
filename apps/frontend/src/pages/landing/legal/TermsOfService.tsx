// apps/frontend/src/pages/landing/legal/TermsOfService.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Mail } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#E6E9EF] text-slate-800 font-sans pb-24">
      {/* SIMPLE NAVBAR */}
      <nav className="w-full px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-sm font-bold tracking-widest uppercase text-slate-500">Back to Home</span>
          </Link>
          <div className="flex items-center space-x-2 opacity-60">
            <ShieldCheck className="w-5 h-5 text-gamboge-600" />
            <span className="font-extrabold tracking-tight uppercase text-sm">ManavSutra</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase mb-4">Terms of Service</h1>
          <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">Effective Date: October 2026</p>
        </div>

        <div className="inner-depth p-8 md:p-12 space-y-8 bg-slate-50/50 text-slate-600 font-medium leading-relaxed rounded-[2rem]">
          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">1. Acceptance of Governance Terms</h2>
            <p className="mb-4">
              By provisioning or accessing an organizational workspace on the ManavSutra platform ("Service"), you agree to abide by these Terms of Service. If you are accepting these terms on behalf of a sub-company or corporate entity, you represent that you hold the authority to bind that organization.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">2. Subscription Tiers & Resource Quotas</h2>
            <p className="mb-4">
              Workspace capabilities—including Monthly Active Users (MAU), monthly API request allowances, Custom RBAC Engine access (`advancedRbac`), and White-label Custom Branding (`customTheme`)—are governed by your active Subscription Tier (`FREE_TIER`, `PREMIUM_TIER`, or `ENTERPRISE`). Access to enterprise software suites is strictly determined by parent-level license allocations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">3. Workspace Administrator Responsibilities</h2>
            <p className="mb-4">
              Workspace administrators are responsible for verifying personnel in the Waiting Room, maintaining accurate Role-Based Access Control (RBAC) assignments and module overrides, and promptly revoking access or active sessions for departing personnel.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">4. Platform Support & Contact</h2>
            <p className="mb-4">
              ManavSutra reserves the right to freeze workspaces or blacklist global identities that engage in unauthorized cross-tenant access attempts or security violations. For billing inquiries, tier upgrades, or technical support, contact:
            </p>
            <a 
              href="mailto:spheri20verse04@gmail.com" 
              className="inline-flex items-center text-sm font-extrabold text-gamboge-600 hover:text-gamboge-700"
            >
              <Mail className="w-4 h-4 mr-2" /> spheri20verse04@gmail.com
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}