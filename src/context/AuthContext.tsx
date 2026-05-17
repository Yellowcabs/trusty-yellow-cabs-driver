import React, { createContext, useContext, useState, useEffect } from 'react';
import { Driver } from '../types';
import { getDriverByLogin, updateDriverOnlineStatus } from '../services/api';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  driver: Driver | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (identifier: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  toggleOnline: (status: boolean) => Promise<boolean>;
  refreshDriverProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDriverProfile = async () => {
    if (!driver?.id || !driver?.pin) return;
    try {
      const freshProfile = await getDriverByLogin(driver.id, driver.pin);
      if (freshProfile) {
        setDriver(freshProfile);
        localStorage.setItem('trusty_driver_session', JSON.stringify(freshProfile));
      }
    } catch (e) {
      console.error('Failed to sync profile markers natively:', e);
    }
  };

  useEffect(() => {
    async function initializeAuth() {
      try {
        const stored = localStorage.getItem('trusty_driver_session');
        if (stored) {
          const parsedDriver = JSON.parse(stored);
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            const currentProfile = await getDriverByLogin(parsedDriver.id, parsedDriver.pin);
            if (currentProfile) {
              setDriver(currentProfile);
              localStorage.setItem('trusty_driver_session', JSON.stringify(currentProfile));
            } else {
              setDriver(parsedDriver);
            }
          } else {
            const currentProfile = await getDriverByLogin(parsedDriver.id, parsedDriver.pin);
            if (currentProfile) {
              setDriver(currentProfile);
            } else {
              localStorage.removeItem('trusty_driver_session');
            }
          }
        }
      } catch (e) {
        console.error('Auth initialization cache fault:', e);
      } finally {
        setIsLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        console.log('Native authorization refreshed securely.');
        if (session?.user && driver) {
          const syncData = await getDriverByLogin(driver.id, driver.pin);
          if (syncData) {
            setDriver(syncData);
            localStorage.setItem('trusty_driver_session', JSON.stringify(syncData));
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [driver?.id]);

  const login = async (identifier: string, pin: string) => {
    try {
      setIsLoading(true);
      
      // Admin layout routing check
      if (identifier.toLowerCase() === 'admin' && pin === '1122') {
        // FIX: Added placeholder strings for vehicleModel and vehicleNumber to perfectly 
        // fulfill the explicit type constraints mandated by your Driver structure definition contract.
        const adminUser: Driver = {
          id: 'admin',
          name: 'System Administrator',
          phone: '0000000000',
          pin: '1122',
          isOnline: true,
          rating: 5.0,
          totalEarnings: 0,
          completedRides: 0,
          isBlocked: false,
          officeFee: 0,
          vehicleModel: 'Admin Panel',    // Added parameter
          vehicleNumber: 'ADMIN-CORE'     // Added parameter
        };
        setDriver(adminUser);
        localStorage.setItem('trusty_driver_session', JSON.stringify(adminUser));
        return { success: true };
      }

      const foundDriver = await getDriverByLogin(identifier, pin);
      if (!foundDriver) {
        return { success: false, error: 'Invalid Phone Number, ID, or PIN' };
      }

      if (foundDriver.isBlocked) {
        return { success: false, error: 'Your account has been suspended by administration.' };
      }

      await supabase.auth.signInAnonymously();

      setDriver(foundDriver);
      localStorage.setItem('trusty_driver_session', JSON.stringify(foundDriver));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Database connection failure' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (driver && driver.id !== 'admin') {
      await updateDriverOnlineStatus(driver.id, false);
    }
    await supabase.auth.signOut();
    setDriver(null);
    localStorage.removeItem('trusty_driver_session');
    localStorage.removeItem('trusty_trips_db');
  };

  const toggleOnline = async (status: boolean) => {
    if (!driver || driver.id === 'admin') return false;
    
    const success = await updateDriverOnlineStatus(driver.id, status);
    if (success) {
      const updated = { ...driver, isOnline: status };
      setDriver(updated);
      localStorage.setItem('trusty_driver_session', JSON.stringify(updated));
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        driver,
        isAuthenticated: !!driver,
        isLoading,
        isAdmin: driver?.id === 'admin',
        login,
        logout,
        toggleOnline,
        refreshDriverProfile
      }}
    >
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