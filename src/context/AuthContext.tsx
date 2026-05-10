import React, { createContext, useContext, useState, useEffect } from 'react';
import { Driver } from '../types';

interface AuthContextType {
  driver: Driver | null;
  login: (id: string, pin: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
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
    if (driver?.id && driver.id !== 'admin') {
      const interval = setInterval(() => {
        refreshDriverStatus();
      }, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [driver?.id]);

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
    const { getDriverByLogin } = await import('../services/api');
    
    // Special case for hardcoded admin until DB is ready
    if (id === 'admin' && pin === 'admin123') {
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

    // Try fetching from Supabase
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
    <AuthContext.Provider value={{ driver, login, logout, isAuthenticated: !!driver, isLoading, toggleOnline, refreshDriverStatus }}>
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
