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
    const isCapacitor = typeof window !== 'undefined' && ((window as any).Capacitor || (window as any).webkit?.messageHandlers?.bridge || navigator.userAgent.includes('Capacitor'));

    // Silent audio hack to keep process alive in background
    const startSilentAudio = () => {
      if (silentAudio) return;
      try {
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
      } catch (e) {
        console.warn('Audio setup failed', e);
      }
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
      if (!pos || !pos.coords) return;
      const { latitude, longitude, heading, accuracy: locAccuracy } = pos.coords;
      const now = Date.now();
      
      setAccuracy(locAccuracy);

      if (now - lastUpdateRef.current >= UPDATE_INTERVAL || lastUpdateRef.current === 0) {
        if (locAccuracy < 150) { // Accept reasonable accuracy for drivers
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
          
          if (!Geolocation) throw new Error('Geolocation plugin not found');

          console.log('[Geo] Requesting perms...');
          const perms = await Geolocation.checkPermissions().catch(() => ({ location: 'prompt' }));
          
          if (perms.location !== 'granted') {
            const req = await Geolocation.requestPermissions().catch(e => {
              console.warn('[Geo] Permission request failed', e);
              return { location: 'denied' };
            }) as any;
            if (req.location !== 'granted') {
               console.warn('[Geo] Permission still denied after request');
               // On Android, "Allow all the time" needs manual user action if not prompted.
               // We don't block here, we let the watch attempt run as foreground if allowed.
            }
          }

          console.log('[Geo] Starting watch...');
          watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
            (pos, err) => {
              if (err) {
                console.error('Capacitor Geo Error:', err);
                // If it's a permission error, maybe fallback
              }
              else if (pos) {
                handlePosition(pos);
              }
            }
          ).catch(e => {
             console.error('[Geo] watchPosition Exception:', e);
             return null;
          });
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
