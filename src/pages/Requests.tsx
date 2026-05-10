import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Navigation, Info, BellRing } from 'lucide-react';
import { useTrips } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { TripCard } from '../components/TripCard';

export function RequestsPage() {
  const { driver } = useAuth();
  const { pendingTrips, acceptTrip, rejectTrip } = useTrips();
  const [permission, setPermission] = React.useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied');

  if (driver?.isBlocked) {
    return (
      <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-8 text-center text-white">
        <h2 className="text-3xl font-black mb-2">ACCESS DENIED</h2>
        <p className="text-white/80 font-medium">Your account is blocked.</p>
      </div>
    );
  }

  const requestPermission = () => {
    if (typeof Notification !== 'undefined') {
      Notification.requestPermission().then(setPermission);
    }
  };

  return (
    <div className="pb-32 page-enter-active">
      <header className="px-6 pt-12 pb-6 flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Near You</p>
          <h1 className="text-3xl font-black text-neutral-900">Trip Requests</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
            {permission !== 'granted' && (
              <button 
                onClick={requestPermission}
                className="flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full text-[10px] font-black animate-bounce"
              >
                <BellRing size={14} />
                ENABLE ALERTS
              </button>
            )}
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[10px] font-black">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              ACTIVE RADAR
            </div>
        </div>
      </header>

      <main className="px-6 space-y-6">
        <AnimatePresence mode="popLayout">
          {pendingTrips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingTrips.map((trip: any) => (
                <div key={trip.id}>
                  <TripCard 
                    trip={trip} 
                    onAccept={acceptTrip}
                    onReject={rejectTrip} 
                  />
                </div>
              ))}
            </div>
          ) : (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="flex flex-col items-center justify-center pt-20"
            >
               <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center premium-shadow mb-6 relative">
                 <Search size={32} className="text-primary/20" />
                 <motion.div 
                    animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 border-2 border-primary rounded-full"
                 />
               </div>
               <h3 className="text-xl font-bold text-neutral-900">Searching for trips...</h3>
               <p className="text-sm text-neutral-400 mt-2 font-medium">Sit tight, we're scanning your area.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {pendingTrips.length > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
             <Info className="text-blue-500 flex-shrink-0" size={20} />
             <p className="text-xs text-blue-700 font-bold leading-tight">
               Fastest fingers first! Trip requests are sent to multiple drivers simultaneously.
             </p>
          </div>
        )}
      </main>

      {/* Notifications and Audio are handled by TripProvider context */}
    </div>
  );
}
