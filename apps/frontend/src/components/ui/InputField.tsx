import React, { type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  asSelect?: boolean;
  children?: ReactNode;
}

export const InputField = React.forwardRef<HTMLInputElement | HTMLSelectElement, InputFieldProps>(
  ({ label, error, required, icon, asSelect, children, className = '', ...props }, ref) => {
    
    const inputClasses = `embossed-input w-full py-3.5 rounded-2xl text-sm text-slate-700 placeholder-slate-400 font-semibold tracking-wide disabled:opacity-75 disabled:cursor-not-allowed ${icon ? 'pl-12 pr-4' : 'px-4'}`;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}

        <div className="relative group">
          {icon && React.isValidElement(icon) && (
            <div className="absolute left-4 top-3.5 bg-lightgray rounded-lg">
              {React.cloneElement(icon, {
                className: `w-5 h-5 text-slate-400 group-focus-within:text-gamboge-500 transition-colors ${
                  (icon.props as any).className || ""
                }`
              } as React.HTMLAttributes<HTMLElement>)}
            </div>
          )}
          
          {asSelect ? (
            <select ref={ref as any} className={`${inputClasses} appearance-none`} {...props}>
              {children}
            </select>
          ) : (
            <input ref={ref as any} required={required} className={inputClasses} {...props} />
          )}

          {error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>
        {error && <p className="mt-1 ml-1 text-xs text-red-500 font-bold uppercase tracking-wide">{error}</p>}
      </div>
    );
  }
);
InputField.displayName = 'InputField';