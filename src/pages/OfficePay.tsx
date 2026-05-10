import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { IndianRupee, ShieldCheck, CheckCircle2, ChevronRight, AlertCircle, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export function OfficePayPage() {
  const { driver } = useAuth();
  const fee = driver?.officeFee || 0;
  const upiId = "123mdcreation@okaxis";
  const name = "DHIWAKAR M";
  const supportPhone = "919876543210"; // From Profile.tsx contact

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${fee}&cu=INR&tn=Office%20Fee`;
  const whatsappUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(`Hi Admin, I have paid my Office Fee of ₹${fee}. My Driver ID is #${driver?.id?.toUpperCase()}. Please verify the payment proof attached.`)}`;

  return (
    <div className="pb-32 page-enter-active">
      {/* Header */}
      <header className="bg-primary pt-12 pb-24 px-6 rounded-b-[40px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center text-white">
           <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/30">
              <IndianRupee size={32} />
           </div>
           <h1 className="text-3xl font-black uppercase tracking-tight">Office Pay</h1>
           <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Settle your account fees</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 -mt-12 space-y-6 relative z-10">
         {/* Status Card */}
         <div className="glass-card p-8 flex flex-col items-center text-center premium-shadow border-none">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Total amount due</p>
            <div className="flex items-center gap-1 mb-4">
               <span className="text-2xl font-black text-neutral-900">₹</span>
               <span className="text-5xl font-black text-neutral-900">{fee}.00</span>
            </div>
            
            {fee > 0 ? (
              <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 border border-amber-100">
                 <AlertCircle size={16} /> PAYMENT PENDING
              </div>
            ) : (
              <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 border border-emerald-100">
                 <CheckCircle2 size={16} /> ACCOUNT CLEAR
              </div>
            )}
         </div>

         {fee > 0 && (
           <>
             {/* QR Code Section */}
             <div className="glass-card p-6 border-none ring-1 ring-neutral-200/50">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center">
                      <ShieldCheck size={20} />
                   </div>
                   <div>
                      <h2 className="text-sm font-black text-neutral-900 uppercase">Secure UPI Pay</h2>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Fast & Verified Transaction</p>
                   </div>
                </div>

                <div className="bg-neutral-50 rounded-[32px] p-6 border-2 border-dashed border-neutral-200 flex flex-col items-center mb-6">
                   <div className="w-48 h-48 bg-white rounded-3xl flex items-center justify-center shadow-inner mb-4 overflow-hidden relative p-4 group">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`} 
                        alt="Office Fee QR"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                   </div>
                   <p className="text-[10px] font-black text-neutral-400 tracking-[0.1em] uppercase mb-1">Scan QR to Pay</p>
                   <p className="text-[10px] text-neutral-500 font-black mb-3 uppercase tracking-wide">Beneficiary: {name}</p>
                   <p className="text-xs font-black text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/20 select-all cursor-pointer shadow-sm active:scale-95 transition-all">
                      {upiId}
                   </p>
                </div>

                {/* Mobile Tap to Pay */}
                <div className="space-y-3">
                   <a 
                     href={upiUrl}
                     className="w-full h-16 bg-neutral-900 text-white rounded-[24px] font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-neutral-900/20"
                   >
                     <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" className="h-5 brightness-0 invert" alt="GPay" />
                     TAP TO PAY
                   </a>

                   <a 
                     href={whatsappUrl}
                     target="_blank"
                     rel="noreferrer"
                     className="w-full h-14 bg-emerald-500 text-white rounded-[21px] font-black text-xs uppercase tracking-[0.1em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                   >
                     <MessageCircle size={20} fill="currentColor" />
                     SEND PROOF ON WHATSAPP
                   </a>

                   <p className="text-center text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed pt-2">
                      Automatically opens UPI apps or WhatsApp<br />on your mobile device
                   </p>
                </div>
             </div>

             <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10 flex gap-4 items-start">
                <div className="bg-primary/10 p-2 rounded-xl text-primary flex-shrink-0">
                   <AlertCircle size={20} />
                </div>
                <div>
                   <h3 className="text-xs font-black text-primary uppercase">Important Notice</h3>
                   <p className="text-[10px] text-primary/70 font-bold mt-1 leading-relaxed">
                      After making the payment, please allow up to 1-2 hours for the admin to manually verify and update your office fee status.
                   </p>
                </div>
             </div>
           </>
         )}

         {fee === 0 && (
            <div className="py-20 text-center space-y-4 opacity-40">
               <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={40} className="text-neutral-400" />
               </div>
               <p className="text-sm font-black text-neutral-600">Great job! All dues are settled.</p>
            </div>
         )}
      </main>
    </div>
  );
}
