import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AuthAPI } from '../../api/auth.api';

interface AuthLayoutProps {
  children: React.ReactNode;
  maxWidth?: string; 
}

export default function AuthLayout({ children, maxWidth = "max-w-[800px]" }: AuthLayoutProps) {
  const [branding, setBranding] = useState<{name?: string, logoUrl?: string, themeColor?: string}>({});

  useEffect(() => {
    // Applying the CSS variables to the document root
    const applyThemeToDOM = (themeColor: string) => {
      const root = document.documentElement;
      root.style.setProperty('--theme-500', themeColor);
      
      const adjustColor = (color: string, amount: number) => {
        return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
      };
      root.style.setProperty('--theme-400', adjustColor(themeColor, 20));
      root.style.setProperty('--theme-600', adjustColor(themeColor, -20));
      root.style.setProperty('--theme-700', adjustColor(themeColor, -40));
    };

    // CHECKS URL FOR OAUTH REDIRECT TARGET
    const searchParams = new URLSearchParams(window.location.search);
    const targetTenantId = searchParams.get('targetTenantId');
    const inviteToken = searchParams.get('token');

    if (targetTenantId) {
      // DYNAMIC OAUTH FLOW: Fetches the specific tenant's branding from the server
      AuthAPI.getTenantBranding(targetTenantId)
        .then((data) => {
          setBranding(data);
          if (data.themeColor) applyThemeToDOM(data.themeColor);
        })
        .catch((err) => {
          // SECURITY PATCH: If the target ID is completely invalid, it purges the URL
          console.warn('Invalid target tenant ID detected. Stripping parameters.');
          window.location.href = window.location.pathname;
        });
    } else if (inviteToken) {
      // DYNAMIC INVITE FLOW: Fetches branding from the invite token
      AuthAPI.verifyInvite(inviteToken)
        .then((data) => {
          const brandingData = {
            name: data.tenantName,
            logoUrl: data.logoUrl,
            themeColor: data.themeColor
          };
          setBranding(brandingData);
          if (data.themeColor) applyThemeToDOM(data.themeColor);
        })
        .catch(() => {
          // We don't redirect here so the Register component can render the "Invalid Link" UI
          console.warn('Invalid invite token for branding.');
        });    
    } else {
      // STANDARD FLOW: Attempts to grab branding from local cache
      const storedBranding = localStorage.getItem('tenantSettings') || localStorage.getItem('tempBranding');
      if (storedBranding) {
        try {
          const parsed = JSON.parse(storedBranding);
          setBranding(parsed);
          if (parsed.themeColor) applyThemeToDOM(parsed.themeColor);
        } catch (e) {
          console.error("Failed to parse branding data");
        }
      }
    }
  }, []);

  return (
    <div 
      className="antialiased min-h-screen relative text-slate-700 transition-colors duration-500 flex flex-col justify-center overflow-hidden"
      style={{
        // A very professional, ultra-subtle 10% tint of the brand color acting as the base
        backgroundColor: 'color-mix(in srgb, var(--theme-500, #e49b0f) 10%, #f5efe8d0)',
        // A clean, soft diagonal lighting effect
        backgroundImage: `radial-gradient(circle at top left, color-mix(in srgb, var(--theme-500, #e49b0f) 8%, transparent) 0%, transparent 60%)`,
      }}
    >
      
      {/* Sleek, Professional Architectural Bottom Wave */}
      <div className="absolute bottom-0 left-0 w-full z-0 pointer-events-none">
        <svg className="w-full h-auto min-h-[35vh] object-cover" viewBox="0 0 1440 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          {/* Layer 1 - Lightest */}
          <path fill="var(--theme-500, #e49b0f)" fillOpacity="0.14" d="M0,250L48,245.3C96,241,192,231,288,245.3C384,260,480,298,576,303.8C672,309,768,282,864,250.5C960,219,1056,183,1152,174.5C1248,166,1344,185,1392,194.8L1440,204.5L1440,400L1392,400C1344,400,1248,400,1152,400C1056,400,960,400,864,400C768,400,672,400,576,400C480,400,384,400,288,400C192,400,96,400,48,400L0,400Z"></path>
          {/* Layer 2 - Medium */}
          <path fill="var(--theme-500, #e49b0f)" fillOpacity="0.28" d="M0,320L60,314.7C120,309,240,299,360,303.8C480,309,600,331,720,325.2C840,319,960,288,1080,266.5C1200,245,1320,235,1380,229.8L1440,224.5L1440,400L1380,400C1320,400,1200,400,1080,400C960,400,840,400,720,400C600,400,480,400,360,400C240,400,120,400,60,400L0,400Z"></path>
          {/* Layer 3 - Darkest/Accent */}
          <path fill="var(--theme-500, #e49b0f)" fillOpacity="0.5" d="M0,370L120,360C240,350,480,330,720,335C960,340,1200,370,1320,385L1440,400L1440,400L1320,400C1200,400,960,400,720,400C480,400,240,400,120,400L0,400Z"></path>
        </svg>
      </div>

      <div className="flex items-center justify-center py-12 px-4 z-10 w-full min-h-screen">
        <div className="w-full flex justify-center relative">
          
          <div className={`embossed-card p-2 w-full ${maxWidth} transition-all duration-300 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]`}>
            <div className="px-8 pb-10 pt-4 relative z-10">
              
              {/* Dynamic Logo & Organization Name */}
              <div className="text-center relative flex flex-col items-center mb-10">
                  <div className="w-24 h-24 embossed-badge rounded-full flex items-center justify-center mb-6 -mt-14 bg-lightgray relative z-20 overflow-hidden shadow-xl border-4 border-white">
                      {branding.logoUrl ? (
                        <img 
                          src={branding.logoUrl.startsWith('http') ? branding.logoUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${branding.logoUrl}`}
                          alt="Organization Logo"
                          className="w-full h-full object-cover p-2"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                            e.currentTarget.insertAdjacentHTML('afterend', '<span style="color: var(--theme-500, #e49b0f)" class="font-extrabold text-xs">LOGO</span>');
                          }}
                        />
                      ) : (
                        // Fallback ShieldCheck if no logo is available yet
                        <ShieldCheck style={{ color: 'var(--theme-500, #e49b0f)' }} className="w-12 h-12 drop-shadow-sm" />
                      )}
                  </div>
                  
                  <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight uppercase">
                    {branding.name || 'MANAVSUTRA'}
                  </h1>
                  <div className="h-1.5 w-12 rounded-full mt-4 shadow-sm" style={{ backgroundColor: 'var(--theme-500, #e49b0f)' }}></div>
              </div>
              
              {children}
              
              {/* MANAVSUTRA PLATFORM BRANDING */}
              <div className="mt-10 pt-6 border-t border-slate-200/60 text-center">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Powered by <br/>
                  <span style={{ color: 'var(--theme-500, #e49b0f)' }} className="text-xs tracking-[0.25em] drop-shadow-sm">MANAVSUTRA</span>
                </p>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}