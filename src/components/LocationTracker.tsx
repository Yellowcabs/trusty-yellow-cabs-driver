import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateLocationApi } from '../services/api';

export function LocationTracker() {
  const { driver, isAdmin } = useAuth();
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_INTERVAL = 8000; // 8 seconds for responsive tracking
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    // Only track if logged in as a driver (and not the admin user)
    if (!driver || isAdmin || driver.id === 'admin' || !driver.isOnline) {
      setAccuracy(null);
      return;
    }

    let watchId: number | null = null;
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock.request) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          console.warn('Wake Lock failed:', err.message);
        }
      }
    };

    const handleLocationChange = (position: GeolocationPosition) => {
      const now = Date.now();
      const { latitude, longitude, heading, accuracy: locAccuracy } = position.coords;
      
      setAccuracy(locAccuracy);

      // Only update if interval passed or if it's the very first update
      if (now - lastUpdateRef.current >= UPDATE_INTERVAL || lastUpdateRef.current === 0) {
        // Only accept reasonably accurate positions (under 80m for mobile GPS)
        if (locAccuracy < 80) {
          updateLocationApi(driver.id, latitude, longitude, heading || undefined);
          lastUpdateRef.current = now;
        } else if (lastUpdateRef.current === 0) {
          // Fallback for first position if GPS is still warming up
          updateLocationApi(driver.id, latitude, longitude, heading || undefined);
          lastUpdateRef.current = now;
        }
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('Location error:', error.message);
      if (error.code === error.PERMISSION_DENIED) {
        setAccuracy(-2); // Specific permission error
      } else {
        setAccuracy(-1);
      }
    };

    // Start tracking with high accuracy settings optimized for mobile
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(handleLocationChange, handleError, {
        enableHighAccuracy: true,
        timeout: 15000, // Slightly longer timeout for deep building starts
        maximumAge: 0   // Force fresh GPS data, no caching
      });
      requestWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (wakeLock !== null && wakeLock.release) {
        try { wakeLock.release(); } catch(e) {}
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [driver?.id, isAdmin, driver?.isOnline]);

  if (!accuracy) return null;

  return null;
}
