import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { adminApiClient } from '../../api/client';
import { ShieldAlert, Loader2, Lock, Mail, Terminal, Network, Database } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Point directly to the secure backend terminal route
      const response = await adminApiClient.post('/auth/superadmin/login', { email, password });
      
      const { accessToken, refreshToken, user } = response.data;

      login(accessToken, refreshToken, user);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Authentication sequence failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-indigo-500/30 relative overflow-hidden">
      
      {/* 1. Texture: Dot Matrix Overlay */}
      <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* 2. Abstract Minimalist Vectors (Top Right & Bottom Left) */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none opacity-[0.15]">
        
        {/* Top Right Circuit Path */}
        <svg className="absolute -top-10 -right-10 w-96 h-96 text-indigo-900" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M 0,100 C 50,100 50,50 100,50 L 200,50" />
          <path fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" d="M 100,50 L 100,200" />
          <circle cx="100" cy="50" r="3" fill="currentColor" />
          <circle cx="150" cy="50" r="2" fill="currentColor" />
        </svg>

      </div>

      {/* 3. Floating Thematic Icons */}
      <Network className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-48 h-48 text-indigo-900 opacity-[0.06] pointer-events-none z-0" strokeWidth={1} />
      <Database className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-64 h-64 text-blue-500 opacity-[0.06] pointer-events-none z-0" strokeWidth={1} />

      {/* 4. Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Foreground Form Elements */}
      <div className="w-full max-w-md relative z-10 backdrop-blur-sm">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl mb-6 relative group">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Terminal className="w-8 h-8 text-indigo-500 relative z-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">ManavSutra OS</h1>
          <p className="text-slate-400 mt-2 text-sm uppercase tracking-widest font-semibold">
            SuperAdmin Control Plane
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-6 bg-red-950/50 border border-red-900/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start">
              <ShieldAlert className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Global Email
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Mail className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium placeholder:text-slate-600"
                  placeholder="admin@manavsutra.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Root Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Lock className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950/50 border border-slate-800 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-[#ffffff] font-bold py-4 rounded-2xl uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:shadow-none mt-2 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize Session'}
            </button>
          </form>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center justify-center">
            <Lock className="w-3 h-3 mr-1.5" /> End-to-End Encrypted
          </p>
        </div>
      </div>
    </div>
  );
}