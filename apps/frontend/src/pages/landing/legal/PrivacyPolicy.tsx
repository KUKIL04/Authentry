// apps/frontend/src/pages/landing/legal/PrivacyPolicy.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Mail } from 'lucide-react';

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
          <div className="flex items-center space-x-2 opacity-60">
            <ShieldCheck className="w-5 h-5 text-gamboge-600" />
            <span className="font-extrabold tracking-tight uppercase text-sm">ManavSutra</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase mb-4">Privacy Policy</h1>
          <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">Last Updated: October 2026</p>
        </div>

        <div className="inner-depth p-8 md:p-12 space-y-8 bg-slate-50/50 text-slate-600 font-medium leading-relaxed rounded-[2rem]">
          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">1. Data Isolation & Tenant Sovereignty</h2>
            <p className="mb-4">
              ManavSutra operates on a strict multi-tenant architecture. All organizational data—including employee identities, custom HR onboarding attributes, role assignments, and audit logs—are cryptographically bound to your specific workspace (Tenant ID). We do not share or expose directory records across separate sub-companies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">2. Information We Collect</h2>
            <p className="mb-4">To provision and maintain your Identity Provider and access governance services, we collect:</p>
            <ul className="list-disc pl-6 space-y-2 text-sm font-bold text-slate-700">
              <li>Corporate identity, compliance metadata (Tax ID / CIN), and administrative contact information.</li>
              <li>Employee identity data submitted during onboarding or roster imports (Name, Corporate Email, Verified Mobile Number, Employee ID, and organization-defined HR fields).</li>
              <li>Network telemetry—including IP addresses, browser User-Agents, and timestamps—strictly for anomaly detection, active session management, and immutable security audit logs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">3. Cryptographic Security Credentials</h2>
            <p className="mb-4">
              ManavSutra hashes all user passwords using the memory-hard Argon2id algorithm. Platform and workspace administrators cannot view, reverse, or recover raw passwords. Account recovery and mandatory password resets are strictly facilitated through verified out-of-band OTP channels.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">4. Data Retention & Privacy Inquiries</h2>
            <p className="mb-4">
              Workspace directory data is retained for the active lifecycle of your organization's subscription. For data privacy inquiries, workspace deletion requests, or compliance support, please contact our administrative support desk:
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