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
  refreshDriverStatus: (forcedId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* -------------------- INIT AUTH (FIXED) -------------------- */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedDriver = localStorage.getItem('trusty_driver');

        if (savedDriver) {
          const parsed = JSON.parse(savedDriver);
          setDriver(parsed);

          // IMPORTANT: wait refresh to avoid race condition
          await refreshDriverStatus(parsed.id);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        localStorage.removeItem('trusty_driver');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  /* -------------------- LOCATION + BACKGROUND TRACKING -------------------- */
  useEffect(() => {
    if (!driver?.id || driver.id === 'admin' || driver.isBlocked) return;

    const interval = setInterval(() => {
      refreshDriverStatus();
    }, 30000);

    let watchId: number | null = null;

    if ('geolocation' in navigator && driver?.isOnline) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude, heading, accuracy } = pos.coords;

          try {
            const { updateLocationApi } = await import('../services/api');
            await updateLocationApi(driver.id, latitude, longitude, heading || undefined);

            setDriver(prev =>
              prev
                ? { ...prev, latitude, longitude, heading: heading || undefined }
                : null
            );
          } catch (e) {
            console.error('Location update failed:', e);
          }
        },
        (err) => console.error('GPS Error:', err),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    }

    return () => {
      clearInterval(interval);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [driver?.id]);

  /* -------------------- REFRESH DRIVER -------------------- */
  const refreshDriverStatus = async (forcedId?: string) => {
    const driverId = forcedId || driver?.id;
    if (!driverId || driverId === 'admin') return;

    try {
      const { fetchDrivers } = await import('../services/api');
      const allDrivers = await fetchDrivers();

      const current = allDrivers.find(d => d.id === driverId);

      if (current) {
        setDriver(current);
        localStorage.setItem('trusty_driver', JSON.stringify(current));
      }
    } catch (e) {
      console.error('refreshDriverStatus error:', e);
    }
  };

  /* -------------------- LOGIN -------------------- */
  const login = async (id: string, pin: string) => {
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
      return false;
    }

    const { getDriverByLogin } = await import('../services/api');
    const dbDriver = await getDriverByLogin(id, pin);

    if (dbDriver && !dbDriver.isBlocked) {
      setDriver(dbDriver);
      localStorage.setItem('trusty_driver', JSON.stringify(dbDriver));
      return true;
    }

    return false;
  };

  /* -------------------- LOGOUT -------------------- */
  const logout = () => {
    fcmService.stopTripSound();
    setDriver(null);
    localStorage.removeItem('trusty_driver');
  };

  /* -------------------- TOGGLE ONLINE -------------------- */
  const toggleOnline = async (status: boolean) => {
    if (!driver || driver.isBlocked) return;

    try {
      const { updateDriverOnlineStatus } = await import('../services/api');
      const success = await updateDriverOnlineStatus(driver.id, status);

      if (success) {
        const updated = { ...driver, isOnline: status };
        setDriver(updated);
        localStorage.setItem('trusty_driver', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('toggleOnline error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        driver,
        login,
        logout,
        isAuthenticated: !!driver,
        isLoading,
        isAdmin: driver?.id === 'admin',
        toggleOnline,
        refreshDriverStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* -------------------- HOOK -------------------- */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}