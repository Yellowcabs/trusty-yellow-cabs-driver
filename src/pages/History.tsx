import React from 'react';
import { useTrips } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Calendar, Clock, Car, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function HistoryPage() {
  const { allTrips } = useTrips();
  const { driver } = useAuth();

  const historyTrips = allTrips
    .filter(
      t =>
        t.driverId === driver?.id &&
        (t.status === 'COMPLETED' || t.status === 'CANCELLED')
    )
    .sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime()
    );

  return (
    <div className="pb-28 min-h-screen bg-gradient-to-b from-red-50 via-white to-white">

      {/* Header */}
      <header className="px-6 pt-10 pb-6">
        <p className="text-[11px] font-extrabold text-red-500 uppercase tracking-[0.2em]">
          Your Journey
        </p>
        <h1 className="text-3xl font-black text-neutral-900 tracking-tight">
          Trip History
        </h1>
      </header>

      <main className="px-6 space-y-5">

        {historyTrips.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-red-200 bg-white/70 backdrop-blur-md p-12 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center text-red-400">
              <Calendar size={28} />
            </div>
            <p className="text-sm font-bold text-neutral-700">
              NO TRIP HISTORY
            </p>
            <p className="text-[11px] uppercase tracking-widest text-neutral-400 mt-2">
              Completed trips will appear here
            </p>
          </div>
        ) : (
  historyTrips.map((trip, index) => (
  <motion.div
    key={trip.id}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="relative rounded-3xl border border-neutral-200 bg-white/90 backdrop-blur-lg shadow-sm hover:shadow-md transition p-4 sm:p-5 space-y-4"
  >
   {/* Top Summary Section */}
<div className="flex justify-between items-center gap-3">

  {/* Left: Trip ID + Status */}
  <div className="flex flex-col gap-1 min-w-0">

    {/* Trip ID (BIG & VISIBLE) */}
    <p className="text-lg font-black text-neutral-900 tracking-tight">
      TRIP #{trip.id?.slice(-4).toUpperCase() || '....'}
    </p>

    {/* Status */}
    <div
      className={cn(
        "inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[11px] font-bold uppercase",
        trip.status === "COMPLETED"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-neutral-200 text-neutral-600"
      )}
    >
      {trip.status === "COMPLETED" && <CheckCircle2 size={12} />}
      {trip.status}
    </div>
  </div>

  {/* Right: Fare (BIG & STRONG) */}
  <div className="text-right shrink-0">
    <p className="text-2xl font-extrabold text-neutral-900">
      ₹{trip.fare > 0 ? trip.fare : "0"}
    </p>

    {trip.fare <= 0 && (
      <p className="text-[11px] text-neutral-500 font-medium">
        Custom Fare
      </p>
    )}


      </div>
    </div>

    {/* Route */}
    <div className="relative pl-5 space-y-4">

      <div className="absolute left-1 top-2 bottom-2 w-[2px] bg-neutral-200 rounded-full" />

      {/* Pickup */}
      <div className="flex items-start gap-3 relative">
        <div className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-white mt-1 z-10" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            Pickup
          </p>
          <p className="text-sm font-semibold leading-tight break-words sm:truncate">
            {trip.pickup}
          </p>
        </div>
      </div>

      {/* Drop */}
      <div className="flex items-start gap-3 relative">
        <div className="w-3 h-3 rounded-full border-2 border-neutral-500 bg-white mt-1 z-10" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            Drop
          </p>
          <p className="text-sm font-semibold leading-tight break-words sm:truncate">
            {trip.drop}
          </p>
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