// apps/superadmin/src/components/layout/SuperAdminLayout.tsx
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { 
  Terminal, LayoutDashboard, Building2, Users, 
  CreditCard, Activity, Flag, Shield, LogOut, 
  MoreVertical, ChevronLeft, ChevronRight, Webhook, 
  Layers
} from 'lucide-react';

export default function SuperAdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  
  // Panel now defaults to being OPEN (pulled up) on load/refresh
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navGroups = [
    {
      label: 'Core Platform',
      items: [
        { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Software Suites', path: '/apps', icon: Terminal },
        { name: 'Role Blueprints', path: '/blueprints', icon: Layers },
        { name: 'Tenant Fleet', path: '/tenants', icon: Building2 },
        { name: 'Global Users', path: '/users', icon: Users },
      ]
    },
    {
      label: 'Enterprise Metrics',
      items: [
        { name: 'Revenue & Billing', path: '/billing', icon: CreditCard, placeholder: true },
        { name: 'System Telemetry', path: '/telemetry', icon: Activity },
        { name: 'SGC Health & Sync', path: '/sgc-health', icon: Webhook },
      ]
    },
    {
      label: 'Control Plane',
      items: [
        { name: 'Feature Flags', path: '/tiers', icon: Flag },
        { name: 'Audit Ledger', path: '/audits', icon: Shield },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-950 font-sans selection:bg-indigo-500/30">
      
      {/* 1. TOP NAVBAR - Always visible */}
      <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-slate-800 bg-slate-950 shrink-0 z-30 shadow-sm relative">
        <div className="flex items-center">
          <Terminal className="w-6 h-6 text-indigo-500 mr-3" />
          <span className="font-extrabold text-white tracking-tight uppercase text-lg">MANAVSUTRA OS</span>
        </div>
        
        <div className="flex items-center bg-slate-800 rounded-xl p-1.5 md:p-2 border border-slate-800">
          <div className="hidden md:block mr-3 text-right">
            <p className="text-xs font-bold text-white leading-tight">{user?.firstName} {user?.lastName}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">SuperAdmin</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <button 
            onClick={handleLogout}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors ml-2 shrink-0"
            title="End Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN LAYOUT AREA */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

        {/* 3. COLLAPSIBLE SIDEBAR PANEL */}
        <div 
          className={`relative bg-slate-950 border-slate-800 transition-all duration-300 ease-in-out z-20 shrink-0 h-full flex flex-col ${
            isPanelOpen ? 'w-64 border-r' : 'w-0 border-r-0'
          }`}
        >
          {/* Inner Content (Hidden when panel is pushed in) */}
          <div className={`w-64 h-full overflow-hidden transition-all duration-300 ${isPanelOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8 pointer-events-none'}`}>
            <div className="h-full overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin scrollbar-thumb-slate-800">
              {navGroups.map((group, idx) => (
                <div key={idx}>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.path}
                        // Removed the onClick auto-close logic here so it stays open
                        className={({ isActive }) => `
                          flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                          ${isActive 
                            ? 'bg-indigo-500/10 text-indigo-500 font-bold' 
                            : 'hover:bg-slate-900 hover:text-slate-300 text-slate-400'}
                        `}
                      >
                        <item.icon className={`w-5 h-5 mr-3 transition-opacity ${item.placeholder ? 'opacity-50' : 'opacity-70 group-hover:opacity-100'}`} />
                        {item.name}
                        {item.placeholder && (
                          <span className="ml-auto text-[9px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                            Soon
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. TRAPEZIUM TOGGLE BUTTON */}
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="absolute -right-7 top-1/2 -translate-y-1/2 w-7 h-28 bg-indigo-600/10 border-r border-y border-indigo-500/30 flex flex-col items-center justify-center text-indigo-400 hover:text-indigo-300 hover:bg-indigo-600/20 transition-all cursor-pointer z-50 shadow-[4px_0_15px_rgba(0,0,0,0.1)] backdrop-blur-sm"
            style={{ 
              clipPath: 'polygon(0 0, 100% 15%, 100% 85%, 0 100%)' 
            }}
            title={isPanelOpen ? 'Push Panel' : 'Pull Panel'}
          >
            {/* 3 Vertical Dots */}
            <MoreVertical className="w-4 h-4 mb-1 opacity-70" />
            
            {/* Pull / Push Sign */}
            {isPanelOpen ? (
              <ChevronLeft className="w-5 h-5 mt-1" />
            ) : (
              <ChevronRight className="w-5 h-5 mt-1 animate-pulse" />
            )}
          </button>
        </div>

        {/* 5. MAIN CONTENT OUTLET */}
        <main className="flex-1 overflow-y-auto z-10 bg-transparent">
          <div className="p-6 md:p-8 xl:p-10 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
        
        {/* Mobile Overlay Background (Darkens main content when panel is pulled out on small screens) */}
        {isPanelOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-10 top-16"
            onClick={() => setIsPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
}