import React from 'react';
import { useTrips } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Calendar, MapPin, IndianRupee, CheckCircle2, Clock, Car } from 'lucide-react';
import { cn } from '../lib/utils';

export function HistoryPage() {
  const { allTrips } = useTrips();
  const { driver } = useAuth();

  const historyTrips = allTrips
    .filter(t => t.driverId === driver?.id && (t.status === 'COMPLETED' || t.status === 'CANCELLED'))
    .sort((a, b) => {
        // If they have timestamps, sort by them. 
        // Based on Trip type in types.ts (usually has timestamp)
        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });

  return (
    <div className="pb-32 page-enter-active">
      <header className="px-6 pt-12 pb-6">
        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Your Journey</p>
        <h1 className="text-3xl font-black text-neutral-900">Trip History</h1>
      </header>

      <main className="px-6 space-y-4">
        {historyTrips.length === 0 ? (
          <div className="bg-neutral-100 p-12 rounded-[32px] text-center border border-dashed border-neutral-300">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 premium-shadow text-neutral-300">
              <Calendar size={28} />
            </div>
            <p className="text-sm font-black text-neutral-600">NO TRIP HISTORY</p>
            <p className="text-[10px] uppercase font-bold text-neutral-400 mt-2 tracking-widest">Completed trips will appear here</p>
          </div>
        ) : (
          historyTrips.map((trip, index) => (
            <motion.div 
              key={trip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card p-5 space-y-4 relative overflow-hidden"
            >
              {/* Status Badge */}
              <div className="flex justify-between items-start">
                 <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        trip.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
                    )}>
                        <Car size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                           <p className="font-black text-neutral-900">{trip.customerName}</p>
                           <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded font-mono font-bold leading-none">#{trip.id.slice(-4).toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                           <Clock size={10} /> {new Date(trip.timestamp || '').toLocaleDateString()}
                        </div>
                    </div>
                 </div>
                 <div className="text-right">
                    {trip.fare > 0 ? (
                      <p className="text-lg font-black text-primary leading-none">₹{trip.fare}</p>
                    ) : (trip.baseFare || trip.kmsFare) ? (
                      <div className="flex flex-col items-end leading-none">
                        {trip.baseFare !== undefined && (
                          <p className="text-[10px] font-black text-primary">Base Fare {trip.baseFare}</p>
                        )}
                        {trip.kmsFare !== undefined && (
                          <p className="text-[10px] font-black text-primary">{trip.kmsFare}/km</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-lg font-black text-primary leading-none">₹0</p>
                    )}
                    <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase mt-1",
                        trip.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                    )}>
                        {trip.status === 'COMPLETED' ? <CheckCircle2 size={8} /> : null}
                        {trip.status}
                    </div>
                 </div>
              </div>

              {/* Route Info */}
              <div className="space-y-3 relative">
                 <div className="absolute left-[7px] top-[14px] bottom-[14px] w-[2px] bg-neutral-100" />
                 
                 <div className="flex items-start gap-4 relative">
                    <div className="w-4 h-4 rounded-full bg-white border-4 border-primary mt-1 relative z-10" />
                    <div className="flex-1">
                       <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Pickup</p>
                       <p className="text-xs font-bold text-neutral-900 mt-1 truncate">{trip.pickup}</p>
                    </div>
                 </div>

                 <div className="flex items-start gap-4 relative">
                    <div className="w-4 h-4 rounded-full bg-white border-4 border-emerald-500 mt-1 relative z-10" />
                    <div className="flex-1">
                       <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Drop</p>
                       <p className="text-xs font-bold text-neutral-900 mt-1 truncate">{trip.drop}</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          ))
        )}
      </main>
    </div>
  );
}
