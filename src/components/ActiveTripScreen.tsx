import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Phone, MessageSquare, Navigation, ArrowRight, CheckCircle2, ChevronRight, PhoneCall, AlertCircle, Car, User, X, Star, OctagonX, Milestone, MessageCircle } from 'lucide-react';
import { useTrips } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { cn, getDistance } from '../lib/utils';

import { CustomerSilhouette } from './CustomerSilhouette';

export function ActiveTripScreen() {
  const { driver } = useAuth();
  const { activeTrip, updateStatus, releaseTrip } = useTrips();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [liveDistance, setLiveDistance] = useState(0);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customFare, setCustomFare] = useState(0);

  // Screen Wake Lock to prevent sleeping during active trip
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error(`${(err as Error).name}, ${(err as Error).message}`);
      }
    };

    if (activeTrip?.status === 'STARTED') {
      requestWakeLock();
    }

    return () => {
      if (wakeLock) wakeLock.release().then(() => wakeLock = null);
    };
  }, [activeTrip?.status]);

  // Sync customFare when activeTrip changes or modal opens
  React.useEffect(() => {
    if (activeTrip?.fare) {
      setCustomFare(activeTrip.fare);
    }
  }, [activeTrip?.id, activeTrip?.fare]);

  useEffect(() => {
    if (activeTrip?.status === 'STARTED' && activeTrip.actualStartLat && activeTrip.actualStartLng && driver?.latitude && driver?.longitude) {
      const d = getDistance(activeTrip.actualStartLat, activeTrip.actualStartLng, driver.latitude, driver.longitude);
      setLiveDistance(Number(d.toFixed(2)));
    }
  }, [driver?.latitude, driver?.longitude, activeTrip?.status, activeTrip?.actualStartLat, activeTrip?.actualStartLng]);

  if (!activeTrip) return null;

  const handleStatusUpdate = async (status: typeof activeTrip.status) => {
    let extraData: any = {};
    
    if (status === 'STARTED') {
      if (driver?.latitude && driver?.longitude) {
        extraData.actual_start_lat = driver.latitude;
        extraData.actual_start_lng = driver.longitude;
      }
    }

    if (status === 'COMPLETED' && !showPaymentModal) {
      // Calculate final fare based on actual distance
      if (driver?.latitude && driver?.longitude && activeTrip.actualStartLat && activeTrip.actualStartLng) {
        const distance = getDistance(
          activeTrip.actualStartLat,
          activeTrip.actualStartLng,
          driver.latitude,
          driver.longitude
        );
        
        const roundedDistance = Number(distance.toFixed(2));
        setCalculatedDistance(roundedDistance);

        // Calculate fare: base + (kms * kmsFare)
        const base = activeTrip.baseFare || 0;
        const rate = activeTrip.kmsFare || 0;
        
        // IfkmsFare is set but baseFare is 0, still use the kms logic
        // If neither are set and total fare is 0, default to 0
        const calculatedFare = Math.max(0, Math.round(base + (roundedDistance * rate)));
        
        // If rate card is present, override the dispatch total fare
        if (activeTrip.baseFare || activeTrip.kmsFare) {
          setCustomFare(calculatedFare);
        } else {
          setCustomFare(activeTrip.fare);
        }
      } else {
        setCustomFare(activeTrip.fare);
      }
      
      setShowPaymentModal(true);
      return;
    }

    setIsUpdating(true);
    
    // Final check for payment modal values
    if (status === 'COMPLETED' && showPaymentModal) {
      extraData.fare = customFare;
      if (driver?.latitude && driver?.longitude) {
        extraData.actual_end_lat = driver.latitude;
        extraData.actual_end_lng = driver.longitude;
        if (activeTrip.actualStartLat && activeTrip.actualStartLng) {
          const distance = getDistance(activeTrip.actualStartLat, activeTrip.actualStartLng, driver.latitude, driver.longitude);
          extraData.actual_distance = Number(distance.toFixed(2));
        }
      }
    }

    await updateStatus(status, extraData);
    setIsUpdating(false);
    if (status === 'COMPLETED') {
      setShowPaymentModal(false);
    }
  };

  const handleRelease = async () => {
    if (!releaseReason.trim()) return;
    setIsUpdating(true);
    await releaseTrip(activeTrip.id, releaseReason);
    setIsUpdating(false);
    setShowReleaseModal(false);
  };

  const getStatusButton = () => {
    switch (activeTrip.status) {
      case 'ACCEPTED':
        return (
          <button 
            disabled={isUpdating}
            onClick={() => handleStatusUpdate('ARRIVED')}
            className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-black text-lg premium-shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isUpdating ? 'Updating...' : 'I HAVE ARRIVED'}
            <MapPin size={24} />
          </button>
        );
      case 'ARRIVED':
        return (
          <button 
            disabled={isUpdating}
            onClick={() => handleStatusUpdate('STARTED')}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg premium-shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isUpdating ? 'Starting...' : 'START TRIP'}
            <ArrowRight size={24} />
          </button>
        );
      case 'STARTED':
        if (showEndConfirmation) {
          return (
            <div className="flex gap-2">
              <button 
                disabled={isUpdating}
                onClick={() => setShowEndConfirmation(false)}
                className="w-1/3 py-4 bg-neutral-200 text-neutral-600 rounded-2xl font-black text-sm active:scale-[0.98] transition-all"
              >
                CANCEL
              </button>
              <button 
                disabled={isUpdating}
                onClick={() => handleStatusUpdate('COMPLETED')}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg premium-shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isUpdating ? 'Ending...' : 'YES, FINISH'}
                <CheckCircle2 size={24} />
              </button>
            </div>
          );
        }
        return (
          <button 
            disabled={isUpdating}
            onClick={() => setShowEndConfirmation(true)}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg premium-shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            END TRIP
            <CheckCircle2 size={24} />
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-50 overflow-y-auto pb-20 no-scrollbar">
      {/* Header / Map Placeholder */}
      <div className="h-56 sm:h-72 bg-neutral-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent p-5 text-white z-10">
 <div className="relative">
  <button
    onClick={() => setShowReleaseModal(true)}
    className="absolute top-12 left-1/2 -translate-x-1/2 px-4 py-4 bg-white/10 backdrop-blur-xl rounded-full text-sm font-black tracking-widest border border-white/20 flex items-center gap-2 hover:bg-white/20 transition-all uppercase"
  >
    <X size={14} strokeWidth={3} /> RELEASE TRIP
  </button>
</div>
        </div>
       <div className="relative w-full h-full overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-red-400 to-red-700 opacity-80" />
</div>
     
      
      </div>

      <div className="px-4 sm:px-6 -mt-8 relative z-20">
        <div className="glass-card p-6 shadow-2xl shadow-neutral-900/10 border-white/80">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-neutral-100 rounded-3xl flex items-center justify-center border-2 border-white shadow-sm overflow-hidden text-neutral-400">
                  <CustomerSilhouette className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest">{activeTrip.customerName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-amber-500 font-black text-xs bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                      <Star size={20} fill="currentColor" /> 5.0
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <a 
                href={`tel:${activeTrip.customerPhone}`}
                className="flex-1 h-16 rounded-2xl bg-green-500 text-white flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-emerald-600/20 font-black"
              >
                <PhoneCall size={20} fill="currentColor" />
                CALL NOW
              </a>
              <a 
                href={`https://wa.me/${(activeTrip.customerPhone || '').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="w-16 h-16 rounded-2xl bg-green-500 text-white flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-green-500/20"
              >
                  <MessageCircle size={35} />
              </a>
            </div>
          </div>

          <div className="space-y-4 py-4 border-t border-neutral-100">
             <div className="flex gap-3">
               <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                 <div className="w-2 h-2 rounded-full bg-primary" />
               </div>
               <p className="text-sm font-bold text-neutral-600">{activeTrip.pickup}</p>
             </div>
             <div className="flex gap-3">
               <div className="w-6 h-6 rounded-full bg-neutral-900 flex items-center justify-center flex-shrink-0">
                 <div className="w-2 h-2 rounded-sm bg-white" />
               </div>
               <p className="text-sm font-bold text-neutral-600">{activeTrip.drop}</p>
             </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-6 border-t border-dashed border-neutral-200">
             <div>
               <p className="text-xs font-bold text-neutral-400">
                 {activeTrip.status === 'STARTED' ? 'LIVE FARE' : activeTrip.fare > 0 ? 'TOTAL FARE' : (activeTrip.baseFare || activeTrip.kmsFare) ? 'RATE CARD' : 'TOTAL FARE'}
               </p>
               {activeTrip.fare > 0 ? (
                 <div className="flex flex-col">
                   <p className="text-3xl font-black text-primary leading-none mt-1">₹{activeTrip.status === 'STARTED' ? Math.round((activeTrip.baseFare || 0) + (liveDistance * (activeTrip.kmsFare || 0))) : activeTrip.fare}</p>
                   {activeTrip.status === 'STARTED' && (
                     <div className="flex items-center gap-1 mt-2 text-primary font-black text-[10px] bg-primary/10 px-2 py-1 rounded-lg w-fit">
                        <Milestone size={12} />
                        {liveDistance} KM
                     </div>
                   )}
                 </div>
               ) : (activeTrip.baseFare || activeTrip.kmsFare) ? (
                 <div className="flex flex-col mt-1">
                   {activeTrip.baseFare !== undefined && (
                     <p className="text-xl font-black text-primary leading-tight">Base Fare {activeTrip.baseFare}</p>
                   )}
                   {activeTrip.kmsFare !== undefined && (
                     <p className="text-xl font-black text-primary leading-tight">{activeTrip.kmsFare}/km</p>
                   )}
                 </div>
               ) : (
                 <p className="text-3xl font-black text-primary leading-none mt-1">₹0</p>
               )}
             </div>
          <div className="text-right">
  <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-500 uppercase">
    RIDE TYPE
  </p>

  <p className="mt-1 text-sm font-bold tracking-wide text-neutral-900 uppercase">
    {activeTrip.rideType}
  </p>
</div>
          </div>
        </div>

       <div className="mt-8 space-y-4">
  {getStatusButton()}

  <a 
    href="tel:+914223596446"
    className="w-full py-4 text-red-600 font-bold text-sm bg-red-50 rounded-2xl flex items-center justify-center gap-2 premium-shadow active:scale-[0.98] transition-all"
  >
    <Phone size={18} />
    CONTACT OFFICE EMERGENCY
  </a>
</div>
      </div>

      {/* Release Reason Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-[40px] overflow-hidden shadow-2xl relative"
            >
              <div className="bg-primary p-6 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <CheckCircle2 size={32} className="mx-auto mb-2" />
                <h3 className="text-xl font-black uppercase tracking-tight">Trip Finished</h3>
                <p className="text-white/70 text-[10px] font-bold mt-0.5 tracking-widest uppercase">Collect Payment</p>
              </div>

              <div className="p-6 space-y-5">
                <div className="text-center">
                  {calculatedDistance !== null && (
                    <div className="flex items-center justify-center gap-2 mb-3 bg-neutral-50 py-2 px-4 rounded-2xl border border-neutral-100 inline-flex mx-auto">
                      <Milestone size={16} className="text-primary" />
                      <span className="text-xs font-black text-neutral-600">{calculatedDistance} KM TRAVELED</span>
                    </div>
                  )}
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Final Amount</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl font-black text-neutral-900">₹</span>
                    <input 
                      type="number" 
                      value={customFare} 
                      onChange={(e) => setCustomFare(Number(e.target.value))}
                      className="w-24 text-3xl font-black text-neutral-900 border-b-2 border-neutral-100 focus:border-primary outline-none text-center bg-transparent"
                    />
                  </div>
                </div>

                <div className="bg-neutral-50 rounded-[32px] p-5 border-2 border-dashed border-neutral-200 flex flex-col items-center">
                   <div className="w-36 h-36 bg-white rounded-2xl flex items-center justify-center shadow-inner mb-3 overflow-hidden relative p-3 group">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=123mdcreation@okaxis&pn=DHIWAKAR%20M&am=${customFare}&cu=INR&tn=Trip%20Payment`)}`} 
                        alt="Payment QR"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                   </div>
                   <p className="text-[9px] font-black text-neutral-400 tracking-[0.1em] uppercase mb-1">Scan for UPI</p>
                   <p className="text-[10px] text-neutral-500 font-black mb-2 uppercase tracking-wide">A/C: DHIWAKAR M</p>
                  <p
  className="text-xs font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/30 select-all cursor-pointer shadow-sm hover:bg-primary/20 transition"
  title="Click to copy"
>
  123mdcreation@okaxis
</p>
                </div>

                <div className="pt-2">
                   <button 
                     onClick={() => handleStatusUpdate('COMPLETED')}
                     disabled={isUpdating}
                     className="w-full h-14 bg-neutral-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-black/10"
                   >
                     {isUpdating ? 'FINISHING...' : 'FINALIZE TRIP'}
                   </button>
                </div>
              </div>
              
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/10 rounded-full flex items-center justify-center text-white backdrop-blur-md"
              >
                 <X size={20} strokeWidth={3} />
              </button>
            </motion.div>
          </div>
        )}

        {showReleaseModal && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[32px] p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <OctagonX size={32} />
                </div>
                <h3 className="text-2xl font-black tracking-tight">Release Trip?</h3>
                <p className="text-sm text-neutral-500 font-medium px-4">
                  Releasing an accepted trip is tracked by the admin. Please provide a valid reason.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {['Vehicle issue', 'Customer not reachable', 'Personal emergency', 'Other'].map(r => (
                    <button 
                      key={r}
                      onClick={() => setReleaseReason(r)}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold text-sm transition-all border-2",
                        releaseReason === r ? "bg-primary border-primary text-white" : "bg-neutral-50 border-neutral-100 text-neutral-600"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {releaseReason === 'Other' && (
                  <textarea 
                    autoFocus
                    placeholder="Type your reason here..."
                    className="w-full p-4 bg-neutral-50 border-2 border-neutral-100 rounded-2xl text-sm font-bold focus:border-primary outline-none h-24 no-scrollbar"
                    onChange={(e) => setReleaseReason(e.target.value)}
                  />
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowReleaseModal(false)}
                  className="flex-1 py-4 bg-neutral-100 text-neutral-500 rounded-2xl font-black text-sm active:scale-95 transition-all"
                >
                  GO BACK
                </button>
                <button 
                  disabled={isUpdating || !releaseReason}
                  onClick={handleRelease}
                  className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black text-sm premium-shadow active:scale-95 transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'RELEASING...' : 'CONFIRM RELEASE'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
