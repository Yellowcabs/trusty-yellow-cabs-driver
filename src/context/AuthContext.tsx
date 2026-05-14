import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Driver } from '../types';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  const driverIdRef = useRef<string | null>(null);

  useEffect(() => {
    driverIdRef.current = driver?.id || null;
  }, [driver?.id]);

  const refreshDriverStatus = useCallback(async (forcedId?: string) => {
    const driverId = forcedId || driverIdRef.current;
    if (!driverId || driverId === 'admin') {
      if (driverId === 'admin' && !driver) {
        // Recover admin session if lost but id is known
         const { value } = await Preferences.get({ key: 'trusty_driver' });
         if (value) setDriver(JSON.parse(value));
      }
      return;
    }

    try {
      const { fetchDrivers } = await import('../services/api');
      const allDrivers = await fetchDrivers();
      const current = allDrivers.find(d => d.id === driverId);

      if (current) {
        // If driver was blocked remotely, logout immediately
        if (current.isBlocked) {
          logout();
          return;
        }

        setDriver(current);
        await Preferences.set({
          key: 'trusty_driver',
          value: JSON.stringify(current),
        });
      } else {
        // Driver no longer exists in DB
        logout();
      }
    } catch (e) {
      console.error('Failed to refresh driver status:', e);
    }
  }, [driver]);

  useEffect(() => {
    const loadDriver = async () => {
      setIsLoading(true);
      const { value } = await Preferences.get({ key: 'trusty_driver' });
      if (value) {
        const parsed = JSON.parse(value);
        // Set local state first for immediate UI responsiveness
        setDriver(parsed);
        // BUT immediately revalidate from server to ensure state isn't stale
        await refreshDriverStatus(parsed.id);
      }
      setIsLoading(false);
    };
    loadDriver();

    // Re-verify status every time app comes to foreground
    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && driverIdRef.current) {
        refreshDriverStatus(driverIdRef.current);
      }
    });

    // Periodic background sync for driver status (online status, blocked status)
    const interval = setInterval(() => {
      if (driverIdRef.current) {
        refreshDriverStatus();
      }
    }, 30000); // Every 30 seconds

    return () => {
      appStateListener.then(h => h.remove());
      clearInterval(interval);
    };
  }, [refreshDriverStatus]);

  // Supabase Real-time Sync for Driver Profile
  useEffect(() => {
    if (!driver?.id || driver.id === 'admin' || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`driver-sync-${driver.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${driver.id}`,
        },
        (payload) => {
          const updated = payload.new;
          if (updated.is_blocked) {
            logout();
            return;
          }

          setDriver((prev) => {
            if (!prev) return null;
            const synced = {
              ...prev,
              name: updated.name,
              phone: updated.phone,
              vehicleModel: updated.vehicle_model,
              vehicleNumber: updated.vehicle_number,
              isOnline: updated.is_online,
              rating: Number(updated.rating),
              totalEarnings: Number(updated.total_earnings),
              completedRides: updated.completed_rides,
              isBlocked: updated.is_blocked,
              officeFee: Number(updated.office_fee || 0),
            };
            
            Preferences.set({
              key: 'trusty_driver',
              value: JSON.stringify(synced),
            });
            
            return synced;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.id]);

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
        await Preferences.set({
          key: 'trusty_driver',
          value: JSON.stringify(adminDriver),
        });
        return true;
      }
      return false;
    }

    const { getDriverByLogin } = await import('../services/api');
    const dbDriver = await getDriverByLogin(id, pin);
    if (dbDriver) {
      if (dbDriver.isBlocked) return false;
      
      setDriver(dbDriver);
      await Preferences.set({
        key: 'trusty_driver',
        value: JSON.stringify(dbDriver),
      });
      return true;
    }

    return false;
  };

  const logout = async () => {
    fcmService.stopTripSound();
    setDriver(null);
    driverIdRef.current = null;
    await Preferences.remove({ key: 'trusty_driver' });
  };

  const toggleOnline = async (status: boolean) => {
    if (!driver || driver.isBlocked) return;
    const { updateDriverOnlineStatus } = await import('../services/api');
    const success = await updateDriverOnlineStatus(driver.id, status);
    if (success) {
      const updatedDriver = { ...driver, isOnline: status };
      setDriver(updatedDriver);
      await Preferences.set({
        key: 'trusty_driver',
        value: JSON.stringify(updatedDriver),
      });
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
