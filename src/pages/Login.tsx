import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Car, Lock, Key, AlertCircle, ChevronRight, Headphones, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { isSupabaseConfigured } from '../lib/supabase';
import { cn } from '../lib/utils';

export function LoginPage() {
  const [id, setId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, driver } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminRequest = searchParams.get('admin') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const success = await login(id, pin);
    if (success) {
      if (isAdminRequest) {
        if (id !== 'admin') {
          setError('Invalid Admin Credentials.');
          setIsLoading(false);
          return;
        }
        navigate('/admin');
      } else {
        if (id === 'admin') {
          setError('Please use the Admin Portal to login.');
          setIsLoading(false);
          return;
        }
        navigate('/');
      }
    } else {
      // Check if specifically blocked
      const { getDriverByLogin } = await import('../services/api');
      const testDriver = await getDriverByLogin(id, pin);
      if (testDriver?.isBlocked) {
        setError('Your account is BLOCKED. Contact Support.');
      } else {
        setError('Invalid Driver ID or Password/PIN');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col p-8 pb-12">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <header className="mb-12 text-center">
          <div className={cn(
            "w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6 premium-shadow -rotate-6 transition-colors duration-500",
            isAdminRequest ? "bg-neutral-900" : "bg-primary"
          )}>
            {isAdminRequest ? <ShieldCheck size={40} className="text-white" /> : <Car size={40} className="text-white" />}
          </div>
          <h1 className="text-4xl font-black text-neutral-900 tracking-tight">
            {isAdminRequest ? 'Admin Portal' : 'Trusty Yellow'}
          </h1>
          <p className={cn(
            "font-black uppercase tracking-[0.2em] -mt-1 text-sm",
            isAdminRequest ? "text-neutral-500" : "text-primary"
          )}>
            {isAdminRequest ? 'Authorized Access Only' : 'Driver Portal'}
          </p>
        </header>

        {!isSupabaseConfigured && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-lg flex gap-3 items-start animate-in zoom-in-95 duration-150 text-left">
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-amber-900 text-xs">Configuration Required</h3>
              <p className="text-[10px] text-amber-700 font-medium mt-1 leading-relaxed">
                Connect your database via environment variables in the Secrets panel to enable login.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 border border-red-100"
              >
                <AlertCircle size={20} />
                <p className="text-sm font-bold">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">
                {isAdminRequest ? 'Admin ID' : 'Driver ID'}
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder={isAdminRequest ? "e.g. admin" : "e.g. D001"}
                  className="w-full bg-white border-2 border-neutral-100 rounded-2xl py-4 pl-12 pr-6 font-bold text-neutral-900 focus:border-primary outline-none transition-all placeholder:text-neutral-300"
                  required
                />
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Password / PIN</label>
              <div className="relative group">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-white border-2 border-neutral-100 rounded-2xl py-4 pl-12 pr-6 font-bold text-neutral-900 focus:border-primary outline-none transition-all placeholder:text-neutral-300"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={20} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-lg premium-shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2",
              isAdminRequest ? "bg-neutral-900 text-white" : "bg-primary text-white"
            )}
          >
            {isLoading ? 'SIGNING IN...' : (isAdminRequest ? 'ACCESS ADMIN PANEL' : 'LOGIN TO DRIVE')}
            <ChevronRight size={22} />
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-bold text-neutral-400">
          Admin manually creates accounts.<br/>
          Contact dispatch for support.
        </p>
      </div>

      <footer className="mt-auto flex justify-center gap-6 text-neutral-400 font-bold text-xs">
        <a href="#" className="flex items-center gap-1.5 hover:text-primary transition-colors">
          <Headphones size={14} /> Help Support
        </a>
        <span>•</span>
        <span>Version 2.4.0</span>
      </footer>
    </div>
  );
}
