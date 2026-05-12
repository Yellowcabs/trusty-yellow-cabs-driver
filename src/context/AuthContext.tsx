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
    if (driver?.id && driver.id !== 'admin' && driver.isOnline && !driver.isBlocked) {
      const interval = setInterval(() => {
        refreshDriverStatus();
      }, 30000); // Check every 30 seconds

      // Background-friendly Location Watcher
      let watchId: number | null = null;
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude, heading } = pos.coords;
            const { updateLocationApi } = await import('../services/api');
            await updateLocationApi(driver.id, latitude, longitude, heading || undefined);
            
            // Sync local state if accuracy is good
            setDriver(prev => prev ? { ...prev, latitude, longitude, heading: heading || undefined } : null);
          },
          (err) => console.error('Location Error:', err),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }

      return () => {
        clearInterval(interval);
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
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
