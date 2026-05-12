import React, { createContext, useContext, useState, useEffect } from 'react';
import { Driver } from '../types';

import { fcmService } from '../services/fcmService';

interface AuthContextType {
  driver: Driver | null;
  login: (id: string, pin: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  toggleOnline: (status: boolean) => Promise<void>;
  refreshDriverStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedDriver = localStorage.getItem('trusty_driver');
    if (savedDriver) {
      setDriver(JSON.parse(savedDriver));
      // Refresh status on load if possible
      refreshDriverStatus(JSON.parse(savedDriver).id);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (driver?.id && driver.id !== 'admin' && !driver.isBlocked) {
      const interval = setInterval(() => {
        refreshDriverStatus();
      }, 30000); // Check every 30 seconds

      // Background-friendly Location Watcher
      let watchId: any = null;
      let wakeLock: any = null;
      let silentAudio: HTMLAudioElement | null = null;
      const isCapacitor = typeof window !== 'undefined' && ((window as any).Capacitor || (window as any).webkit?.messageHandlers?.bridge);

      // Silent audio hack to keep process alive in background/locked states
      const startSilentAudio = () => {
        if (silentAudio) return;
        // 1 second of silence (WAV data URI)
        silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP7/AAD+Pw==');
        silentAudio.loop = true;
        silentAudio.volume = 0.01; 
        
        // Media Session API - makes browser think music is playing to keep process alive
        if ('mediaSession' in navigator) {
          (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
            title: 'Trusty Cab - Tracking Active',
            artist: driver?.name,
            album: 'Background Service',
            artwork: [
              { src: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png', sizes: '512x512', type: 'image/png' }
            ]
          });
          
          // Action handlers to satisfy media session
          (navigator as any).mediaSession.setActionHandler('play', () => silentAudio?.play());
          (navigator as any).mediaSession.setActionHandler('pause', () => silentAudio?.pause());
        }

        silentAudio.play().catch(e => console.log('Silent audio play blocked:', e));
      };

      const requestWakeLock = async () => {
        try {
          if ('wakeLock' in navigator) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
            console.log('Wake Lock is active');
          }
        } catch (err: any) {
          console.error(`Wake Lock Error: ${err.name}, ${err.message}`);
        }
      };

      const startTracking = async () => {
        // Essential for background tracking - keep screen/process alive
        try {
          requestWakeLock();
          startSilentAudio();
        } catch (e) {
          console.warn('Could not start keep-alive mechanisms:', e);
        }

        if (isCapacitor) {
          try {
            const { Geolocation } = await import('@capacitor/geolocation');
            
            // Check/Request permissions
            const perm = await Geolocation.checkPermissions();
            if (perm.location !== 'granted') {
              await Geolocation.requestPermissions();
            }

            watchId = await Geolocation.watchPosition(
              {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000
              },
              async (pos, err) => {
                if (err) {
                  console.error('Capacitor Geolocation Error:', err);
                  return;
                }
                if (pos) {
                  const { latitude, longitude, heading, accuracy } = pos.coords;
                  console.log(`Capacitor Loc: ${latitude}, ${longitude} (acc: ${accuracy}m) status: ${driver?.isOnline ? 'ONLINE' : 'OFFLINE'}`);
                  
                  try {
                    const { updateLocationApi } = await import('../services/api');
                    await updateLocationApi(driver.id, latitude, longitude, heading || undefined);
                    setDriver(prev => prev ? { ...prev, latitude, longitude, heading: heading || undefined } : null);
                  } catch (e) {
                    console.error('Failed to update location API:', e);
                  }
                }
              }
            );
          } catch (e) {
            console.error('Failed to start Capacitor Geolocation:', e);
            fallbackToWebGeolocation();
          }
        } else {
          fallbackToWebGeolocation();
        }
      };

      const fallbackToWebGeolocation = () => {
        if ('geolocation' in navigator) {
          watchId = navigator.geolocation.watchPosition(
            async (pos) => {
              const { latitude, longitude, heading, accuracy } = pos.coords;
              console.log(`Web Loc: ${latitude}, ${longitude} (acc: ${accuracy}m) status: ${driver?.isOnline ? 'ONLINE' : 'OFFLINE'}`);
              
              try {
                const { updateLocationApi } = await import('../services/api');
                await updateLocationApi(driver.id, latitude, longitude, heading || undefined);
                setDriver(prev => prev ? { ...prev, latitude, longitude, heading: heading || undefined } : null);
              } catch (e) {
                console.error('Failed to update location API:', e);
              }
            },
            (err) => console.error('Web Tracking Error:', err),
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 10000
            }
          );
        }
      };

      startTracking();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(interval);
        if (watchId !== null) {
          if (isCapacitor) {
            import('@capacitor/geolocation').then(({ Geolocation }) => {
              Geolocation.clearWatch({ id: watchId });
            });
          } else {
            navigator.geolocation.clearWatch(watchId);
          }
        }
        if (wakeLock !== null) {
          wakeLock.release().then(() => { wakeLock = null; });
        }
        if (silentAudio) {
          silentAudio.pause();
          silentAudio = null;
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [driver?.id, driver?.isOnline, driver?.isBlocked]);

  const refreshDriverStatus = async (forcedId?: string) => {
    const driverId = forcedId || driver?.id;
    if (!driverId || driverId === 'admin') return;
    
    const { fetchDrivers } = await import('../services/api');
    const allDrivers = await fetchDrivers();
    const current = allDrivers.find(d => d.id === driverId);
    
    if (current) {
      setDriver(current);
      localStorage.setItem('trusty_driver', JSON.stringify(current));
    }
  };

  const login = async (id: string, pin: string) => {
    // Special case for hardcoded admin - Never hit DB for admin
    if (id === 'admin') {
      if (pin === 'admin123') {
        const adminDriver: Driver = {
          id: 'admin',
          name: 'System Admin',
          phone: '0000',
          pin: 'admin123',
          vehicleModel: 'Office',
          vehicleNumber: 'ADMIN-01',
          isOnline: true,
          rating: 5,
          totalEarnings: 0,
          completedRides: 0,
          isBlocked: false,
          officeFee: 0
        };
        setDriver(adminDriver);
        localStorage.setItem('trusty_driver', JSON.stringify(adminDriver));
        return true;
      }
      return false; // Wrong pin for admin, don't try DB
    }

    const { getDriverByLogin } = await import('../services/api');
    // Try fetching from Supabase for all other users
    const dbDriver = await getDriverByLogin(id, pin);
    if (dbDriver) {
      if (dbDriver.isBlocked) return false;
      
      setDriver(dbDriver);
      localStorage.setItem('trusty_driver', JSON.stringify(dbDriver));
      return true;
    }

    return false;
  };

  const logout = () => {
    fcmService.stopTripSound();
    setDriver(null);
    localStorage.removeItem('trusty_driver');
  };

  const toggleOnline = async (status: boolean) => {
    if (!driver || driver.isBlocked) return;
    const { updateDriverOnlineStatus } = await import('../services/api');
    const success = await updateDriverOnlineStatus(driver.id, status);
    if (success) {
      const updatedDriver = { ...driver, isOnline: status };
      setDriver(updatedDriver);
      localStorage.setItem('trusty_driver', JSON.stringify(updatedDriver));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      driver, 
      login, 
      logout, 
      isAuthenticated: !!driver, 
      isLoading, 
      isAdmin: driver?.id === 'admin',
      toggleOnline, 
      refreshDriverStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
