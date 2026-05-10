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
             <p className="mt-4 text-[10px] font-black bg-neutral-900 text-white px-3 py-1.5 rounded-xl uppercase tracking-[0.2em] inline-block">#{driver.id.toUpperCase()}</p>
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
                      {showPin ? driver.pin : `••••${driver.pin.slice(-2)}`}
                    </p>
                 </div>
                 <button 
                  onClick={() => setShowPin(!showPin)}
                  className="text-[10px] font-black text-primary hover:text-primary/80 bg-primary/5 px-4 py-2 rounded-xl transition-all"
                 >
                   {showPin ? 'HIDE' : 'REVEAL'}
                 </button>
              </div>
           </div>
        </div>

        {/* Vehicle Section */}
        <div className="space-y-4">
           <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] px-2">VEHICLE EQUIPMENT</p>
           
           <div className="glass-card p-8 bg-neutral-900 text-white overflow-hidden relative border-none shadow-2xl shadow-neutral-900/20">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full -mr-24 -mt-24 blur-3xl opacity-50" />
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                 <div>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none mb-2">Registration Model</p>
                    <h3 className="text-2xl font-black tracking-tight">{driver.vehicleModel}</h3>
                 </div>
                 <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-xl border border-white/10">
                    <Car size={28} className="text-primary" />
                 </div>
              </div>

              <div className="flex items-end justify-between relative z-10">
                 <div>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none mb-3">License Plate</p>
                    <div className="inline-flex items-center bg-white rounded-lg p-1.5 pr-4 border-l-[10px] border-primary">
                       <p className="text-2xl font-black tracking-tight text-neutral-900 uppercase ml-3">{driver.vehicleNumber}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-2xl backdrop-blur-xl border border-emerald-500/20">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Support Card - Contact Office */}
        <a 
          href="tel:+919876543210" 
          className="w-full glass-card p-6 flex items-center justify-between hover:bg-primary/5 transition-all border-dashed border-2 border-primary/20 group"
        >
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-transform group-active:scale-90">
                 <Phone size={24} />
              </div>
              <div className="text-left">
                 <p className="text-lg font-black text-neutral-900 tracking-tight">Contact Office</p>
                 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">24/7 Driver Support</p>
              </div>
           </div>
           <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-all">
              <Phone size={18} fill="currentColor" />
           </div>
        </a>
      </main>
    </div>
  );
}
