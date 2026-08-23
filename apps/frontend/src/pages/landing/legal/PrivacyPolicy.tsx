// apps/frontend/src/pages/landing/legal/PrivacyPolicy.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
          <div className="flex items-center space-x-2 opacity-50">
            <ShieldCheck className="w-5 h-5 text-gamboge-600" />
            <span className="font-extrabold tracking-tight uppercase text-sm">ManavSutra</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase mb-4">Privacy Policy</h1>
          <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">Last Updated: July 2026</p>
        </div>

        <div className="inner-depth p-8 md:p-12 space-y-8 bg-slate-50/50 text-slate-600 font-medium leading-relaxed rounded-[2rem]">
          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">1. Data Isolation & Tenant Sovereignty</h2>
            <p className="mb-4">
              ManavSutra operates on a strict multi-tenant architecture. All organizational data, including employee identities, roles, and audit logs, are cryptographically bound to your specific workspace (Tenant ID). We do not aggregate or share personal data across tenants under any circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">2. Information We Collect</h2>
            <p className="mb-4">To provision and maintain your Identity Provider services, we collect the following:</p>
            <ul className="list-disc pl-6 space-y-2 text-sm font-bold text-slate-700">
              <li>Corporate billing and administrative contact information.</li>
              <li>Employee identity data voluntarily submitted during the registration workflow (e.g., Name, Email, Corporate Phone).</li>
              <li>System telemetry, including IP addresses and timestamps, explicitly for generating your immutable security audit logs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">3. Security Credentials</h2>
            <p className="mb-4">
              ManavSutra utilizes the Argon2id hashing algorithm for all user passwords and security answers. We do not possess the ability to read, reverse, or recover your raw passwords. Administrative account recovery must be facilitated through verified secondary channels (OTP).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">4. Data Retention</h2>
            <p>
              Tenant data is retained for the active lifecycle of your subscription. Upon termination of the Enterprise agreement, or a manual "Delete Workspace" trigger, all associated employee data, tokens, and audit logs are permanently purged from our primary databases within 30 days.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}