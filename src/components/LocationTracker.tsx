import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function LocationTracker() {
  const { driver, isAdmin } = useAuth();
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_INTERVAL = 10000; // 10 seconds for balanced performance
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    // Only track if logged in as a driver (and not the admin user) and is online
    if (!driver || isAdmin || driver.id === 'admin' || !driver.isOnline) {
      setAccuracy(null);
      return;
    }

    let watchId: any = null;
    let wakeLock: any = null;
    let silentAudio: HTMLAudioElement | null = null;
    const isCapacitor = typeof window !== 'undefined' && ((window as any).Capacitor || (window as any).webkit?.messageHandlers?.bridge);

    // Silent audio hack to keep process alive in background
    const startSilentAudio = () => {
      if (silentAudio) return;
      silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP7/AAD+Pw==');
      silentAudio.loop = true;
      silentAudio.volume = 0.01;
      
      if ('mediaSession' in navigator) {
        (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
          title: 'Trusty Cab - Service Active',
          artist: driver.name,
          artwork: [{ src: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png', sizes: '512x512', type: 'image/png' }]
        });
      }
      silentAudio.play().catch(e => console.log('Silent audio blocked:', e));
    };

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.warn('Wake Lock failed:', err.message);
      }
    };

    const handlePosition = async (pos: any) => {
      if (!pos) return;
      const { latitude, longitude, heading, accuracy: locAccuracy } = pos.coords;
      const now = Date.now();
      
      setAccuracy(locAccuracy);

      if (now - lastUpdateRef.current >= UPDATE_INTERVAL || lastUpdateRef.current === 0) {
        if (locAccuracy < 100) { // Accept reasonable accuracy
          try {
            const { updateLocationApi } = await import('../services/api');
            await updateLocationApi(driver.id, latitude, longitude, heading || undefined);
            lastUpdateRef.current = now;
          } catch (e) {
            console.error('Update location error:', e);
          }
        }
      }
    };

    const startTracking = async () => {
      requestWakeLock();
      startSilentAudio();

      if (isCapacitor) {
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          
          await Geolocation.requestPermissions();
          
          watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
            (pos, err) => {
              if (err) console.error('Capacitor Geo Error:', err);
              else handlePosition(pos);
            }
          );
        } catch (e) {
          console.error('Capacitor Geo failed, fallback:', e);
          fallbackToWeb();
        }
      } else {
        fallbackToWeb();
      }
    };

    const fallbackToWeb = () => {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          handlePosition,
          (err) => console.error('Web Geo Error:', err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
      }
    };

    startTracking();

    const handleVis = () => { if (document.visibilityState === 'visible') requestWakeLock(); };
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      if (watchId !== null) {
        if (isCapacitor) {
          import('@capacitor/geolocation').then(({ Geolocation }) => {
            Geolocation.clearWatch({ id: watchId });
          });
        } else {
          navigator.geolocation.clearWatch(watchId);
        }
      }
      if (wakeLock?.release) wakeLock.release();
      if (silentAudio) { silentAudio.pause(); silentAudio = null; }
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [driver?.id, isAdmin, driver?.isOnline]);

  return null;
}
