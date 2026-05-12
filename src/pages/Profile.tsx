import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Phone, Car, KeyRound, Star, LogOut, Shield, MapPin, Milestone } from 'lucide-react';
import { cn } from '../lib/utils';
import { isSupabaseConfigured } from '../lib/supabase';
import { AlertCircle } from 'lucide-react';

export function ProfilePage() {
  const { driver, logout } = useAuth();
  const [showPin, setShowPin] = React.useState(false);

  if (!driver) return null;

  return (
    <div className="pb-32 page-enter-active">
      <header className="px-6 pt-12 pb-8 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Account</p>
          <h1 className="text-4xl font-black text-neutral-900 tracking-tight">Profile</h1>
        </div>
        <button 
          onClick={logout}
          className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-95 premium-shadow border border-red-100"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="px-6 space-y-8">
        {!isSupabaseConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm flex gap-4 items-start animate-in zoom-in-95 duration-150">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600 flex-shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-black text-amber-900 text-xs text-left">Configuration Required</h3>
              <p className="text-[10px] text-amber-700 font-medium mt-1 leading-relaxed text-left">
                Database is not connected. Profile data is currently local-only. Add Supabase keys to Secrets panel.
              </p>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="glass-card p-10 flex flex-col items-center text-center relative overflow-hidden bg-white/40 backdrop-blur-xl border border-white/60">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/10 to-transparent" />
          
          <div className="relative mt-2">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-28 h-28 rounded-[36px] bg-white p-1.5 premium-shadow relative z-10 overflow-hidden"
            >
               {driver.avatarUrl ? (
                 <img src={driver.avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-[30px]" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center rounded-[30px] bg-neutral-50 shadow-inner">
                   <User size={64} className="text-neutral-300" />
                 </div>
               )}
            </motion.div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center border-4 border-white z-20 shadow-lg">
               <Shield size={18} fill="currentColor" />
            </div>
          </div>

          <div className="mt-8 relative z-10">
             <h2 className="text-3xl font-black text-neutral-900 tracking-tight">{driver.name}</h2>
             <div className="flex items-center justify-center gap-2 mt-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[12px] font-black text-neutral-400 uppercase tracking-widest">Active Driver</p>
             </div>
            <p className="mt-4 text-base font-extrabold bg-neutral-200 text-neutral-900 px-4 py-2 rounded-xl uppercase tracking-widest inline-block">
  #{driver.id?.toUpperCase() || 'UNKNOWN'}
</p>
          </div>
        </div>

        {/* Details Section */}
        <div className="space-y-4">
           <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] px-2">CONTACT & SECURITY</p>
           
           <div className="space-y-3">
              <div className="glass-card p-6 flex items-center gap-5 hover:bg-white/60 transition-colors">
                 <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                    <Phone size={24} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1.5">Phone Number</p>
                    <p className="text-lg font-black text-neutral-900 tracking-tight">{driver.phone}</p>
                 </div>
              </div>

              <div className="glass-card p-6 flex items-center gap-5 hover:bg-white/60 transition-colors">
                 <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100">
                    <KeyRound size={24} />
                 </div>
                 <div className="flex-1">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1.5">Secret PIN</p>
                    <p className="text-lg font-black text-neutral-900 tracking-[0.5em]">
                      {showPin ? (driver.pin || '....') : `••••${(driver.pin || '').slice(-2)}`}
                    </p>
                 </div>
              <button
  onClick={() => setShowPin(!showPin)}
  className="text-sm font-bold text-primary bg-primary/10 px-6 py-3 rounded-2xl hover:bg-primary/20 transition-all"
>
  {showPin ? 'HIDE' : 'REVEAL'}
</button>
              </div>
           </div>
        </div>

      {/* Vehicle Section */}
<div className="space-y-3 sm:space-y-4">
  <p className="text-[9px] sm:text-[10px] font-black text-neutral-400 uppercase tracking-[0.25em] px-2">
    Vehicle Equipment
  </p>

  <div className="relative overflow-hidden bg-white text-neutral-900 border border-neutral-200 shadow-sm rounded-2xl p-5 sm:p-8">

    {/* Background glow */}
    <div className="absolute top-0 right-0 w-40 sm:w-52 h-40 sm:h-52 bg-blue-100 rounded-full -mr-20 sm:-mr-24 -mt-20 sm:-mt-24 blur-3xl opacity-60" />

    <div className="relative z-10 space-y-6">

      {/* Top Row */}
      <div className="flex items-start justify-between">

        {/* Left */}
        <div className="space-y-1">
          <p className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
            Registration Model
          </p>
          <h3 className="text-lg sm:text-2xl font-black tracking-tight leading-tight text-neutral-900">
            {driver.vehicleModel}
          </h3>
        </div>

      

      </div>

      {/* Divider (optional but improves alignment) */}
      <div className="h-px bg-neutral-100" />

      {/* Bottom Row */}
      <div className="flex items-end justify-between">

        {/* License Plate */}
        <div className="space-y-2">
          <p className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
            License Plate
          </p>

          <div className="flex items-center bg-neutral-50 rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="w-1.5 sm:w-2 h-full bg-blue-500" />
            <p className="text-lg sm:text-2xl font-black tracking-tight text-neutral-900 uppercase px-3 sm:px-4 py-2">
              {driver.vehicleNumber}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 sm:px-4 py-2 rounded-xl border border-emerald-100 h-fit">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
            Verified
          </span>
        </div>

      </div>

    </div>
  </div>
</div>
  {/* Support Card - Contact Office (App Style) */}
<a
  href="tel:+914223596446"
  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white shadow-sm active:scale-[0.98] transition-all border border-neutral-100 hover:shadow-md"
>
  <div className="flex items-center gap-4">
    
    {/* Icon Circle */}
    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-inner">
      <Phone size={22} />
    </div>

    {/* Text */}
    <div className="text-left">
      <p className="text-base font-semibold text-neutral-900">
        Contact Office
      </p>
      <p className="text-xs font-medium text-neutral-500 mt-0.5">
        24/7 Driver Support Available
      </p>
    </div>
  </div>

  
</a>
      </main>
    </div>
  );
}
