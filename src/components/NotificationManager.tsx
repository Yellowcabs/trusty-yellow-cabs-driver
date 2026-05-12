import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripContext';
import { fcmService } from '../services/fcmService';
import { VolumeX, Volume2, BellRing } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationManager: React.FC = () => {
  const { driver, isAuthenticated } = useAuth();
  const { pendingTrips } = useTrips();
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);

  // Handle FCM registration
  useEffect(() => {
    if (isAuthenticated && driver && driver.id !== 'admin') {
      fcmService.requestPermission(driver.id);
      fcmService.setupForegroundListener();

      const handleFirstInteraction = () => {
        fcmService.unlockAudio().then(() => {
          setIsAudioBlocked(false);
        });
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      };

      window.addEventListener('click', handleFirstInteraction);
      window.addEventListener('touchstart', handleFirstInteraction);

      return () => {
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      };
    }
  }, [isAuthenticated, driver]);

  // Handle trip sound logic based on local state (polled trips)
  useEffect(() => {
    if (isAuthenticated && driver && driver.isOnline && pendingTrips.length > 0) {
      // If there are pending trips, try to play sound
      fcmService.startTripSound();
      
      // Check if it's actually playing after a short delay
      setTimeout(() => {
        if (!fcmService.getIsSoundPlaying()) {
          setIsAudioBlocked(true);
        }
      }, 500);
    } else {
      fcmService.stopTripSound();
      setIsAudioBlocked(false);
    }
  }, [pendingTrips, driver?.isOnline, isAuthenticated, driver]);

  const handleEnableSound = () => {
    fcmService.unlockAudio().then(() => {
      setIsAudioBlocked(false);
      if (pendingTrips.length > 0) {
        fcmService.startTripSound();
      }
    });
  };

  return (
    <AnimatePresence>
      {isAudioBlocked && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-24 left-6 right-6 z-[100]"
        >
          <button 
            onClick={handleEnableSound}
            className="w-full bg-amber-500 text-white p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-bounce"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <VolumeX size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-black leading-none mb-1 uppercase tracking-tight">Sound Blocked</p>
                <p className="text-[10px] font-bold text-white/70 uppercase">Tap to hear new trip alerts</p>
              </div>
            </div>
            <div className="bg-white text-amber-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">
               ENABLE
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
