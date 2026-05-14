import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Trip } from '../types';
import { fetchTrips, updateTripStatus, rejectTripApi } from '../services/api';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getDistance } from '../lib/utils';
import { App } from '@capacitor/app';

interface TripContextType {
  pendingTrips: Trip[];
  activeTrip: Trip | null;
  allTrips: Trip[];
  acceptTrip: (tripId: string) => Promise<void>;
  rejectTrip: (tripId: string) => Promise<void>;
  releaseTrip: (tripId: string, reason: string) => Promise<void>;
  updateStatus: (status: Trip['status'], extraData?: any) => Promise<void>;
  createTrip: (trip: Omit<Trip, 'id' | 'status' | 'timestamp'>) => Promise<{ success: boolean; error?: string }>;
  cancelTrip: (tripId: string) => Promise<{ success: boolean; error?: string }>;
  updateTripFare: (tripId: string, fare: number) => Promise<{ success: boolean; error?: string }>;
  refreshTrips: () => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const { driver } = useAuth();
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const driverRef = useRef(driver);
  const lastTripIdRef = useRef<string | null>(null);

  useEffect(() => {
    driverRef.current = driver;
  }, [driver]);

  const showNotification = useCallback((trip: any) => {
    // Only show if the app is not in the foreground or on specific logic
    const title = 'New Trip Request! 🚕';
    const options = {
      body: `From: ${trip.pickup.split(',')[0]} (₹${trip.fare})\nTo: ${trip.drop.split(',')[0]}`,
      icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
      tag: 'new-trip',
      vibrate: [500, 110, 500, 110, 450, 110],
      requireInteraction: true,
    };

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }, []);

  const updateLocalTripState = useCallback((trips: Trip[]) => {
    const currentDriver = driverRef.current;
    if (!currentDriver) return;

    // 1. Identify Pending Trips for this driver
    const now = Date.now();
    const pending = trips.filter(t => {
      if (t.status !== 'PENDING') return false;
      
      // Radius filtering
      if (t.targetLocationOnly && t.pickupLat && t.pickupLng && currentDriver.latitude && currentDriver.longitude) {
        const distance = getDistance(t.pickupLat, t.pickupLng, currentDriver.latitude, currentDriver.longitude);
        if (distance > (t.targetRadius || 5)) return false;
      }

      // Rejection filtering
      if (!t.rejectedBy || t.rejectedBy.length === 0) return true;
      const myRejection = t.rejectedBy.find(entry => entry.startsWith(currentDriver.id));
      if (!myRejection) return true;
      if (!myRejection.includes('|')) return false;
      
      const [, timestampStr] = myRejection.split('|');
      return (now - parseInt(timestampStr, 10)) > 60000; // 60s timeout
    });

    setPendingTrips(pending);

    // 2. Identify Active Trip
    // An active trip is anything assigned to this driver that isn't COMPLETED or CANCELLED
    const active = trips.find(t =>
      t.driverId === currentDriver.id &&
      !['COMPLETED', 'CANCELLED'].includes(t.status)
    );
    
    setActiveTrip(active || null);

    // 3. Notification Logic
    if (pending.length > 0 && pending[0].id !== lastTripIdRef.current) {
      if (lastTripIdRef.current !== null) showNotification(pending[0]);
      lastTripIdRef.current = pending[0].id;
    } else if (pending.length === 0) {
      lastTripIdRef.current = null;
    }
  }, [showNotification]);

  const refreshTrips = useCallback(async () => {
    const d = driverRef.current;
    if (!d) return;

    try {
      const [pendingData, myData] = await Promise.all([
        fetchTrips({ status: 'PENDING', limit: 20 }),
        fetchTrips({ driverId: d.id, limit: 10 })
      ]);

      const combined = [...pendingData, ...myData];
      const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());

      setAllTrips(unique);
      updateLocalTripState(unique);
    } catch (e) {
      console.error('Failed to refresh trips:', e);
    }
  }, [updateLocalTripState]);

  useEffect(() => {
    if (!driver?.id) return;

    // Initial load
    refreshTrips();

    // Foreground sync
    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) refreshTrips();
    });

    // Polling fallback (crucial for mobile when subscriptions drop)
    const pollInterval = setInterval(refreshTrips, 15000);

    // Real-time Subscriptions
    let channels: any[] = [];
    if (isSupabaseConfigured) {
      const handlePayload = () => refreshTrips(); // Simple & robust: just refresh all state on any change
      
      const pendingChannel = supabase.channel('trips-pending')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: 'status=eq.PENDING' }, handlePayload)
        .subscribe();

      const myChannel = supabase.channel('trips-mine')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `driver_id=eq.${driver.id}` }, handlePayload)
        .subscribe();

      channels.push(pendingChannel, myChannel);
    }

    return () => {
      appStateListener.then(h => h.remove());
      clearInterval(pollInterval);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [driver?.id, refreshTrips]);

  const acceptTrip = async (tripId: string) => {
    if (!driver) return;
    const res = await updateTripStatus(tripId, 'ACCEPTED', driver.id);
    if (res.success) await refreshTrips();
  };

  const updateStatus = async (status: Trip['status'], extraData?: any) => {
    if (!activeTrip || !driver) return;
    const res = await updateTripStatus(activeTrip.id, status, driver.id, extraData);
    if (res.success) await refreshTrips();
  };

  const releaseTrip = async (tripId: string, reason: string) => {
    if (!driver) return;
    const { releaseTripApi } = await import('../services/api');
    const trip = allTrips.find(t => t.id === tripId);
    const res = await releaseTripApi(tripId, driver.id, trip?.releasedBy || [], reason);
    if (res.success) await refreshTrips();
  };

  const rejectTrip = async (tripId: string) => {
    if (!driver) return;
    const trip = allTrips.find(t => t.id === tripId);
    if (!trip) return;
    const res = await rejectTripApi(tripId, driver.id, trip.rejectedBy || []);
    if (res.success) await refreshTrips();
  };

  const createTrip = async (tripData: any) => {
    const { createTripApi } = await import('../services/api');
    const res = await createTripApi(tripData);
    if (res.success) await refreshTrips();
    return res;
  };

  const cancelTrip = async (tripId: string) => {
    const res = await updateTripStatus(tripId, 'CANCELLED');
    if (res.success) await refreshTrips();
    return res;
  };

  const updateTripFare = async (tripId: string, fare: number) => {
    const { updateTripFareApi } = await import('../services/api');
    const res = await updateTripFareApi(tripId, fare);
    if (res.success) await refreshTrips();
    return res;
  };

  return (
    <TripContext.Provider value={{
      pendingTrips, activeTrip, allTrips,
      acceptTrip, rejectTrip, releaseTrip,
      updateStatus, createTrip, cancelTrip,
      updateTripFare, refreshTrips
    }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrips() {
  const context = useContext(TripContext);
  if (context === undefined) throw new Error('useTrips must be used within a TripProvider');
  return context;
}
