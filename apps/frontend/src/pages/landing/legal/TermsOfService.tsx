// apps/frontend/src/pages/landing/legal/TermsOfService.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

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
          <div className="flex items-center space-x-2 opacity-50">
            <ShieldCheck className="w-5 h-5 text-gamboge-600" />
            <span className="font-extrabold tracking-tight uppercase text-sm">ManavSutra</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase mb-4">Terms of Service</h1>
          <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">Effective Date: July 2026</p>
        </div>

        <div className="inner-depth p-8 md:p-12 space-y-8 bg-slate-50/50 text-slate-600 font-medium leading-relaxed rounded-[2rem]">
          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By registering an organizational workspace on the ManavSutra platform ("Service"), you agree to abide by these Terms of Service. If you are accepting these terms on behalf of a corporation or enterprise, you represent that you hold the legal authority to bind that entity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">2. Fair Use & API Limits</h2>
            <p className="mb-4">
              Access to ManavSutra's Node SDK and REST APIs is subject to the usage limits dictated by your active Subscription Tier (Free, Premium, or Enterprise). Engaging in deliberate circumvention of API rate limits or reverse engineering the cryptographic payload verification constitutes an immediate breach of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">3. Administrator Responsibilities</h2>
            <p className="mb-4">
              The master administrator ("Host Admin") is solely responsible for managing Role-Based Access Control (RBAC) grants and maintaining the security of generated API Keys. ManavSutra is not liable for data breaches occurring within external applications resulting from leaked API credentials or misconfigured user permissions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 uppercase tracking-wide">4. Service Uptime & Liability</h2>
            <p>
              While we strive for 99.99% availability, ManavSutra provides the service "as is." In no event shall ManavSutra be held liable for indirect, incidental, or consequential damages resulting from a service outage, including but not limited to lost profits or business interruptions inside external applications relying on our Identity Provider.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}