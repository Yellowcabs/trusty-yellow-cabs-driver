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
      try {
        const parsed = JSON.parse(savedDriver);
        if (parsed && parsed.id) {
          setDriver(parsed);
          // Refresh status on load if possible
          refreshDriverStatus(parsed.id);
        }
      } catch (e) {
        console.error('[Auth] Failed to parse saved driver:', e);
        localStorage.removeItem('trusty_driver');
      }
    }
    setIsLoading(false);
  }, []);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [lastToggleTime, setLastToggleTime] = useState(0);

  useEffect(() => {
    if (driver?.id && driver.id !== 'admin' && !driver.isBlocked && !isUpdatingStatus) {
      const interval = setInterval(() => {
        // Only refresh if we haven't toggled recently (within 15 seconds)
        if (Date.now() - lastToggleTime > 15000) {
          refreshDriverStatus();
        }
      }, 30000); // Check every 30 seconds

      return () => {
        clearInterval(interval);
      };
    }
  }, [driver?.id, driver?.isOnline, driver?.isBlocked, isUpdatingStatus, lastToggleTime]);

  useEffect(() => {
    const handleForeground = () => {
      console.log('[Auth] Detected foreground, refreshing status...');
      // Only refresh if we haven't toggled recently
      if (Date.now() - lastToggleTime > 15000) {
        refreshDriverStatus();
      }
    };
    window.addEventListener('app-foreground', handleForeground);
    return () => window.removeEventListener('app-foreground', handleForeground);
  }, [driver?.id, lastToggleTime]);

  const refreshDriverStatus = async (forcedId?: string) => {
    const driverId = forcedId || driver?.id;
    if (!driverId || driverId === 'admin' || isUpdatingStatus) return;
    
    try {
      const { fetchDrivers } = await import('../services/api');
      const allDrivers = await fetchDrivers();
      const current = allDrivers.find(d => d.id === driverId);
      
      if (current) {
        // SECURITY: If we're currently online locally, and the server says offline,
        // we trust the local state if it's very recent (the backend is likely lagging)
        if (driver?.isOnline && !current.isOnline && (Date.now() - lastToggleTime < 15000)) {
           console.log('[Auth] Ignoring server offline status due to recent manual toggle');
           return;
        }

        setDriver(current);
        localStorage.setItem('trusty_driver', JSON.stringify(current));
      }
    } catch (e) {
      console.warn('[Auth] Status refresh failed', e);
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
    try {
      const dbDriver = await getDriverByLogin(id, pin);
      if (dbDriver) {
        if (dbDriver.isBlocked) return false;
        
        setDriver(dbDriver);
        localStorage.setItem('trusty_driver', JSON.stringify(dbDriver));
        return true;
      }
    } catch (e) {
      console.error('[Auth] Login error:', e);
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
    console.log(`[Auth] Toggling Online Status: ${status}`);
    
    setIsUpdatingStatus(true);
    setLastToggleTime(Date.now());
    const { updateDriverOnlineStatus } = await import('../services/api');
    
    try {
      const success = await updateDriverOnlineStatus(driver.id, status);
      if (success) {
        console.log('[Auth] Toggle Success');
        const updatedDriver = { ...driver, isOnline: status };
        setDriver(updatedDriver);
        localStorage.setItem('trusty_driver', JSON.stringify(updatedDriver));
      } else {
        console.error('[Auth] Toggle Failed');
        // On failure, we sync back from server
        await refreshDriverStatus();
      }
    } catch (err) {
      console.error('[Auth] Toggle Exception:', err);
    } finally {
      // Delay unsetting updating flag to let server settle
      setTimeout(() => setIsUpdatingStatus(false), 5000);
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
