import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Clock, Navigation, CheckCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trip } from '../types';
import { cn } from '../lib/utils';

interface TripCardProps {
  trip: Trip;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  className?: string;
}

export function TripCard({ trip, onAccept, onReject, className }: TripCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={cn("glass-card overflow-hidden premium-shadow relative", className)}
    >
      {/* Animated glow for new trips */}
      <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-1 rounded">
              {trip.rideType}
            </span>
            <div className="flex items-center gap-1 mt-2 text-neutral-500 text-xs">
              <Clock size={14} />
              <span>{trip.distance} • Now</span>
            </div>
          </div>
          <div className="text-right">
            {trip.fare > 0 ? (
              <>
                <span className="text-2xl font-black text-primary font-sans leading-none block">
                  ₹{trip.fare}
                </span>
                <span className="text-[10px] text-neutral-400 font-medium">Estimated Fare</span>
              </>
            ) : (trip.baseFare || trip.kmsFare) ? (
              <div className="flex flex-col items-end">
                <div className="flex flex-col items-end leading-tight">
                  {trip.baseFare !== undefined && (
                    <span className="text-sm font-black text-primary">Base Fare {trip.baseFare}</span>
                  )}
                  {trip.kmsFare !== undefined && (
                    <span className="text-sm font-black text-primary">{trip.kmsFare}/km</span>
                  )}
                </div>
                <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest mt-1">Rate Card</span>
              </div>
            ) : (
              <>
                <span className="text-2xl font-black text-primary font-sans leading-none block">
                  ₹0
                </span>
                <span className="text-[10px] text-neutral-400 font-medium">Estimated Fare</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4 relative">
          {/* Vertical line connector */}
          <div className="absolute left-[7px] top-[24px] bottom-[24px] w-[2px] bg-neutral-100" />
          
          <div className="flex gap-3 items-start">
            <div className="mt-1 w-4 h-4 rounded-full border-2 border-primary bg-white z-10 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-tight leading-none mb-1">Pick up</p>
              <p className="text-sm font-semibold truncate leading-tight">{trip.pickup}</p>
            </div>
          </div>
          
          <div className="flex gap-3 items-start">
            <div className="mt-1 w-4 h-4 border-2 border-neutral-900 bg-neutral-900 z-10 rounded-sm" />
            <div>
              <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-tight leading-none mb-1">Drop off</p>
              <p className="text-sm font-semibold truncate leading-tight">{trip.drop}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-neutral-50 flex gap-3">
        <button 
          onClick={() => onReject?.(trip.id)}
          className="flex-1 py-3.5 rounded-xl font-bold text-neutral-400 bg-neutral-200/50 text-sm active:scale-95 transition-transform"
        >
          Reject
        </button>
        <button 
          onClick={() => onAccept?.(trip.id)}
          className="flex-[2] py-3.5 rounded-xl font-black text-white bg-primary premium-shadow text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          ACCEPT RIDE
          <ChevronRight size={18} />
        </button>
      </div>
      
      {/* Swipe instruction hint */}
      <div className="h-1 bg-primary/20 w-1/3 mx-auto mt-[-1px] rounded-full" />
    </motion.div>
  );
}
