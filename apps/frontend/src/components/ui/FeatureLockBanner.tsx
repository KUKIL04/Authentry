import React from 'react';
import { Lock, ArrowUpRight } from 'lucide-react';

interface FeatureLockBannerProps {
  title: string;
  description: string;
  requiredTier?: string;
  layout?: 'row' | 'col';
  onUpgrade?: () => void;
}

export const FeatureLockBanner: React.FC<FeatureLockBannerProps> = ({ 
  title, 
  description, 
  requiredTier = 'Premium',
  layout = 'row',
  onUpgrade 
}) => {
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 flex w-full shadow-inner relative overflow-hidden ${
      layout === 'row' 
        ? 'flex-col md:flex-row items-start md:items-center justify-between gap-4' 
        : 'flex-col gap-4'
    }`}>
      
      {/* Subtle Premium Background Glow */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-start z-10 w-full flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-4 shrink-0 shadow-sm border border-slate-200">
          <Lock className="w-5 h-5 text-slate-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-sm md:text-base">{title}</h3>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium leading-relaxed break-words">
            {description}
          </p>
        </div>
      </div>

      <button
        onClick={onUpgrade}
        className={`shine-btn shrink-0 flex items-center justify-center py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[10px] sm:text-xs tracking-widest uppercase transition-all z-10 shadow-md ${
          layout === 'row' ? 'w-full md:w-auto mt-0' : 'w-full mt-1'
        }`}
      >
        Upgrade to {requiredTier} <ArrowUpRight className="w-4 h-4 ml-1.5" />
      </button>
    </div>
  );
};