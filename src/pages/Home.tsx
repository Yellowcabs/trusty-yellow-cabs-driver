import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Power, Wallet, Star, Navigation, ArrowUpRight, TrendingUp, Bell, ChevronRight, Car, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripContext';
import { cn } from '../lib/utils';
import { isSupabaseConfigured } from '../lib/supabase';
import { AlertCircle } from 'lucide-react';

export function HomePage() {
  const { driver, logout, toggleOnline } = useAuth();
  const { pendingTrips, allTrips } = useTrips();
  const navigate = useNavigate();

  const handleToggleOnline = async () => {
    if (driver?.isBlocked) return;
    await toggleOnline(!driver?.isOnline);
  };

  useEffect(() => {
    // If blocked, force offline
    if (driver?.isBlocked && driver?.isOnline) {
      toggleOnline(false);
    }
  }, [driver?.isBlocked]);

  // Calculate earnings and rides today
  const today = new Date().setHours(0, 0, 0, 0);
  const myCompletedTripsToday = allTrips.filter(t => 
    t.driverId === driver?.id && 
    t.status === 'COMPLETED' && 
    new Date(t.timestamp || '').setHours(0, 0, 0, 0) === today
  );

  const ridesTodayCount = myCompletedTripsToday.length;

  return (
    <div className={cn("pb-32 page-enter-active", driver?.isBlocked && "grayscale-[0.5]")}>
      {/* Blocked Overlay */}
      {driver?.isBlocked && (
        <div className="fixed inset-0 z-[100] bg-red-600/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center text-white">
           <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <AlertCircle size={48} className="text-white" />
           </div>
           <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">Account Blocked</h2>
           <p className="text-white/80 font-medium mb-8 leading-relaxed max-w-[280px]">
             Your driver account has been suspended by the administration. You cannot accept any trips.
           </p>
           <button 
             onClick={() => logout()}
             className="w-full bg-white text-red-600 py-4 rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl"
           >
             LOGOUT
           </button>
           <p className="mt-8 text-white/40 text-[10px] font-black uppercase tracking-widest leading-none">
             Contact support for more information
           </p>
        </div>
      )}

      {/* Top Banner */}
      <header className="bg-primary pt-12 pb-24 px-6 rounded-b-[40px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-light rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />
        
        <div className="flex justify-between items-center relative z-10">
          <div>
            <p className="text-white/70 text-sm font-bold uppercase tracking-widest">Hi,</p>
            <h1 className="text-white text-3xl font-black mt-1">{driver?.name?.split(' ')[0] || 'Driver'}</h1>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => navigate('/requests')}
               className="bg-white/20 backdrop-blur-md p-2.5 rounded-xl text-white relative active:scale-95 transition-all"
             >
               <Bell size={22} />
               {pendingTrips.length > 0 && (
                 <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-primary animate-pulse" />
               )}
             </button>
             <div 
               onClick={() => navigate('/profile')}
               className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 overflow-hidden cursor-pointer active:scale-95 transition-all"
             >
               {driver?.avatarUrl ? (
                 <img src={driver.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                  <User size={24} className="text-white/70" />
               )}
             </div>
          </div>
        </div>

        {/* Status Toggle Bar */}
        <div className="mt-8 flex justify-between items-center bg-white/15 backdrop-blur-md p-1.5 rounded-[22px] border border-white/20 relative z-10 shadow-2xl">
          <button 
             onClick={() => !driver?.isOnline && handleToggleOnline()}
             className={cn(
               "flex-1 py-3.5 rounded-[18px] text-sm font-black transition-all duration-500 flex items-center justify-center gap-2",
               driver?.isOnline ? "bg-emerald-500 text-white premium-shadow" : "text-white/40"
             )}
          >
            <Power size={18} />
            ONLINE
          </button>
          <button 
             onClick={() => driver?.isOnline && handleToggleOnline()}
             className={cn(
               "flex-1 py-3.5 rounded-[18px] text-sm font-black transition-all duration-500 flex items-center justify-center gap-2",
               !driver?.isOnline ? "bg-white text-primary premium-shadow" : "text-white/40"
             )}
          >
            <Power size={18} />
            OFFLINE
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 -mt-12 space-y-6 relative z-10">
        {!isSupabaseConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-xl flex gap-4 items-start animate-in zoom-in-95 duration-150">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600 flex-shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-black text-amber-900 text-sm">Database Configuration Required</h3>
              <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
                Supabase credentials (URL and API Key) are missing. Please add them to your environment variables in the Secrets panel to enable real-time features.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Action Section */}
        <section className="space-y-4">
           {driver?.id === 'admin' && (
             <div className="glass-card p-6 bg-neutral-900/80 text-white premium-shadow border-none ring-1 ring-white/10 backdrop-blur-xl">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                          <ShieldCheck size={14} /> System Administrator
                       </div>
                       <h2 className="text-xl font-black">Admin Management</h2>
                       <p className="text-xs text-white/50 font-medium">Create trips and manage active fleet</p>
                    </div>
                    <button 
                       onClick={() => navigate('/admin')}
                       className="bg-primary text-white px-5 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all premium-shadow shadow-primary/20"
                    >
                       GO TO ADMIN
                    </button>
                </div>
             </div>
           )}

           
           {driver?.isOnline && pendingTrips.length > 0 ? (
             <div 
               onClick={() => navigate('/requests')}
               className="glass-card p-5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all border-none ring-1 ring-white/30"
             >
                <div className="space-y-1">
                   <div className="flex items-center gap-2">
                     <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                     <p className="text-sm font-black text-neutral-900 leading-none">You have {pendingTrips.length} new requests</p>
                   </div>
                   <p className="text-xs text-neutral-500 font-medium ml-4">Accept before they expire</p>
                </div>
                <button className="bg-primary text-white p-2 rounded-xl premium-shadow">
                   <ChevronRight size={20} />
                </button>
             </div>
           ) : (
             <div className="glass-card p-8 text-center border-none ring-1 ring-neutral-200/50">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-neutral-100">
                   {driver?.isOnline ? <Car size={32} className="text-primary" /> : <div className="text-2xl">💤</div>}
                </div>
                <p className="text-sm font-black text-neutral-900">
                   {driver?.isOnline ? 'Waiting for customers...' : 'YOU ARE OFFLINE'}
                </p>
                <p className="text-[10px] uppercase font-bold text-neutral-400 mt-2 tracking-widest">
                   {driver?.isOnline ? 'Auto Refresh Active' : 'Switch to online to receive trips'}
                </p>
             </div>
           )}
        </section>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
           <div className="glass-card p-6 flex flex-col justify-between min-h-[140px] hover:bg-white/60 transition-colors group">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 group-hover:bg-amber-100 transition-colors">
                 <Star className="text-amber-500" size={24} fill="currentColor" />
              </div>
              <div>
                <p className="text-3xl font-black text-neutral-900 tracking-tight">{(driver?.rating || 4.9).toFixed(1)}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Avg Rating</p>
                </div>
              </div>
           </div>
           <div className="glass-card p-6 flex flex-col justify-between min-h-[140px] hover:bg-white/60 transition-colors group">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                 <Navigation className="text-emerald-500" size={24} />
              </div>
              <div>
                <p className="text-3xl font-black text-neutral-900 tracking-tight">{ridesTodayCount}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Rides Today</p>
                </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
