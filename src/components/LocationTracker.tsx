import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateLocationApi } from '../services/api';
// 1. Import Geolocation from Capacitor instead of using navigator.geolocation
import { Geolocation, Position } from '@capacitor/geolocation';

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

    // Capacitor tracking uses a string id instead of a number
    let watchId: string | null = null;
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

    // 2. Adjust handler to match Capacitor's callback type
    const handleLocationChange = (position: Position | null) => {
      if (!position) return;
      
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

    const handleError = (error: any) => {
      console.error('Location error:', error?.message || error);
      setAccuracy(-1);
    };

    // 3. Native function to request runtime permissions and start watching
    const startNativeTracking = async () => {
      try {
        // Check current native permission status
        const permStatus = await Geolocation.checkPermissions();
        
        let locationPermission = permStatus.location;

        // If not granted, trigger the native Android pop-up permission dialog
        if (locationPermission !== 'granted') {
          const requestStatus = await Geolocation.requestPermissions({
            permissions: ['location']
          });
          locationPermission = requestStatus.location;
        }

        if (locationPermission !== 'granted') {
          console.error("Location permission denied by driver.");
          setAccuracy(-2); // Specific permission error
          alert("This taxi driver application requires GPS location permissions to track and receive ride requests.");
          return;
        }

        // Native watch position setup
        watchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          },
          (position, err) => {
            if (err) {
              handleError(err);
            } else {
              handleLocationChange(position);
            }
          }
        );

        requestWakeLock();
      } catch (err) {
        console.error("Error setting up native geolocation tracking:", err);
        setAccuracy(-1);
      }
    };

    // Initialize the permission check and tracker
    startNativeTracking();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // 4. Use Capacitor's native method to clear tracking
      if (watchId !== null) {
        Geolocation.clearWatch({ id: watchId }).catch(err => console.error(err));
      }
      if (wakeLock !== null && wakeLock.release) {
        try { wakeLock.release(); } catch(e) {}
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [driver?.id, isAdmin, driver?.isOnline]);

  if (!accuracy) return null;

  return null;
}