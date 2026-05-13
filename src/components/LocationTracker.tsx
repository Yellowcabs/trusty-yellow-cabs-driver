import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function LocationTracker() {
  const { driver, isAdmin } = useAuth();

  const lastUpdateRef = useRef<number>(0);

  const UPDATE_INTERVAL = 10000;

  const [accuracy, setAccuracy] =
    useState<number | null>(null);

  useEffect(() => {

    if (
      !driver ||
      isAdmin ||
      driver.id === 'admin' ||
      !driver.isOnline
    ) {
      setAccuracy(null);
      return;
    }

    let watchId: any = null;

    let wakeLock: any = null;

    let silentAudio: HTMLAudioElement | null =
      null;

    const isCapacitor =
      typeof window !== 'undefined' &&
      (
        (window as any).Capacitor ||
        navigator.userAgent.includes('Capacitor')
      );

    // KEEP APP ACTIVE
    const startSilentAudio = () => {
      try {

        if (silentAudio) return;

        silentAudio = new Audio(
          'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP7/AAD+Pw=='
        );

        silentAudio.loop = true;

        silentAudio.volume = 0.01;

        silentAudio.play().catch(() => {});

      } catch (e) {
        console.log('Silent audio failed', e);
      }
    };

    // WAKE LOCK
    const requestWakeLock = async () => {
      try {

        if ('wakeLock' in navigator) {
          wakeLock = await (
            navigator as any
          ).wakeLock.request('screen');
        }

      } catch (e) {
        console.log('WakeLock failed', e);
      }
    };

    // SEND LOCATION
    const handlePosition = async (
      pos: any
    ) => {

      try {

        if (!pos?.coords) return;

        const {
          latitude,
          longitude,
          heading,
          accuracy: locAccuracy
        } = pos.coords;

        setAccuracy(locAccuracy);

        const now = Date.now();

        if (
          now - lastUpdateRef.current <
          UPDATE_INTERVAL
        ) {
          return;
        }

        if (locAccuracy > 150) {
          console.log(
            'Low GPS accuracy skipped'
          );
          return;
        }

        lastUpdateRef.current = now;

        try {

          const { updateLocationApi } =
            await import('../services/api');

          await updateLocationApi(
            driver.id,
            latitude,
            longitude,
            heading || undefined
          );

          console.log(
            '[LOCATION UPDATED]',
            latitude,
            longitude
          );

        } catch (e) {
          console.log(
            'Location API failed',
            e
          );
        }

      } catch (e) {
        console.log(
          'Handle position failed',
          e
        );
      }
    };

    // FALLBACK WEB GPS
    const fallbackToWeb = () => {

      if (!navigator.geolocation) {
        console.log(
          'Web geolocation unavailable'
        );
        return;
      }

      watchId =
        navigator.geolocation.watchPosition(
          handlePosition,

          (err) => {
            console.log(
              'Web GPS Error',
              err
            );
          },

          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 5000
          }
        );
    };

    // START TRACKING
    const startTracking = async () => {

      requestWakeLock();

      startSilentAudio();

      // CAPACITOR APK
      if (isCapacitor) {

        try {

          const { Geolocation } =
            await import(
              '@capacitor/geolocation'
            );

          // CHECK PERMISSION
          let perms =
            await Geolocation.checkPermissions();

          // REQUEST IF NEEDED
          if (
            perms.location !== 'granted'
          ) {

            perms =
              await Geolocation.requestPermissions();

          }

          console.log(
            '[LOCATION PERMISSION]',
            perms.location
          );

          // CONTINUE EVEN IF LIMITED
          watchId =
            await Geolocation.watchPosition(
              {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 5000
              },

              (
                position,
                error
              ) => {

                if (error) {
                  console.log(
                    'Capacitor GPS Error',
                    error
                  );
                  return;
                }

                if (position) {
                  handlePosition(position);
                }
              }
            );

          console.log(
            '[GPS WATCH STARTED]'
          );

        } catch (e) {

          console.log(
            'Capacitor GPS failed',
            e
          );

          fallbackToWeb();
        }

      } else {

        fallbackToWeb();

      }
    };

    startTracking();

    // RE-ACTIVATE SCREEN WAKE
    const handleVisibility = () => {

      if (
        document.visibilityState ===
        'visible'
      ) {
        requestWakeLock();
      }
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );

    // CLEANUP
    return () => {

      try {

        if (watchId !== null) {

          if (isCapacitor) {

            import(
              '@capacitor/geolocation'
            ).then(
              ({ Geolocation }) => {

                Geolocation.clearWatch({
                  id: watchId
                });

              }
            );

          } else {

            navigator.geolocation.clearWatch(
              watchId
            );

          }
        }

      } catch (e) {
        console.log(
          'Clear watch failed',
          e
        );
      }

      try {

        if (wakeLock?.release) {
          wakeLock.release();
        }

      } catch (e) {}

      try {

        if (silentAudio) {
          silentAudio.pause();
          silentAudio = null;
        }

      } catch (e) {}

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
    };

  }, [
    driver?.id,
    driver?.isOnline,
    isAdmin
  ]);

  return null;
}