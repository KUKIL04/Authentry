import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { InputField } from '../../components/ui/InputField';
import { AuthAPI } from '../../api/auth.api';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await AuthAPI.forgotPassword(email);
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate password reset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Added w-full here to prevent squeezing */}
      <div className="max-w-[540px] w-full mx-auto">
        <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-slate-700">Account Recovery</h2>
            <p className="text-sm text-slate-500 mt-1.5">Securely request a matrix reset link.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm text-center font-semibold">
            {error}
          </div>
        )}

        <div className="inner-depth p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <InputField 
              label="Corporate Email" 
              type="email" 
              name="email" 
              placeholder="name@company.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              icon={<Mail />}
            />
            <button type="submit" disabled={isLoading || !email} className="shine-btn w-full flex items-center justify-center space-x-2 py-4 text-white font-bold rounded-2xl text-sm tracking-widest uppercase mt-6 disabled:opacity-75">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Request Reset</span>}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center">
          <Link to="/login" className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center w-full space-x-1.5 uppercase tracking-widest">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel & Return</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}