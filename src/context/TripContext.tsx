import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Trip } from '../types';
import { fetchTrips, updateTripStatus, deleteTripApi, rejectTripApi } from '../services/api';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getDistance } from '../lib/utils';

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
  isActionLoading: string | null;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const { driver } = useAuth();
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const lastTripIdRef = useRef<string | null>(null);

  const showNotification = useCallback((trip: any) => {
    if (!trip) return;
    const title = 'New Trip Request! 🚕';
    const options = {
      body: `From: ${trip.pickup?.split(',')[0] || trip.pickup || 'Unknown'} (₹${trip.fare || 0})\nTo: ${trip.drop?.split(',')[0] || trip.drop || 'Unknown'}`,
      icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
      tag: 'new-trip',
      vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40],
      requireInteraction: true,
      data: { url: window.location.origin + '/requests' }
    };

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        // Try to show via service worker for better background support
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
          });
        } else {
          const n = new Notification(title, options);
          n.onclick = () => {
            window.focus();
            window.location.href = '/requests';
            n.close();
          };
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  const updatePendingTrips = useCallback((trips: Trip[]) => {
    if (!Array.isArray(trips)) return;
    if (!driver?.isOnline) {
      setPendingTrips([]);
      lastTripIdRef.current = null;
      return;
    }

    const now = Date.now();
    const pending = trips.filter(t => {
      if (t.status !== 'PENDING') return false;
      
      // Location Based Assignment
      if (t.targetLocationOnly && t.pickupLat && t.pickupLng && driver?.latitude && driver?.longitude) {
        const distance = getDistance(t.pickupLat, t.pickupLng, driver.latitude, driver.longitude);
        if (distance > (t.targetRadius || 5)) return false;
      }
      // If targetLocationOnly is false, it shows to all (as requested)
      
      if (!t.rejectedBy || t.rejectedBy.length === 0) return true;
      
      // Check if rejected by this driver and if the timeout (60s) has passed
      const myRejection = t.rejectedBy.find(entry => {
        const entryId = entry && entry.includes('|') ? entry.split('|')[0] : entry;
        return entryId === driver.id;
      });
      
      if (!myRejection) return true;
      
      // If it's the old format (just ID), we assume it's permanent for compatibility
      if (!myRejection || !myRejection.includes('|')) return false; 
      
      const parts = myRejection.split('|');
      if (parts.length < 2) return false;
      const [, timestampStr] = parts;
      const timestamp = parseInt(timestampStr, 10);
      
      // Show again if more than 60 seconds have passed (60000 ms)
      return (now - timestamp) > 60000;
    });

    setPendingTrips(prev => {
      // Only update if the list of trip IDs has changed to avoid unnecessary re-renders
      const prevIds = prev.map(p => p.id).join(',');
      const currIds = pending.map(p => p.id).join(',');
      if (prevIds === currIds) return prev;
      return pending;
    });
    
    // Alert for new trips if we have more than before
    if (pending.length > 0 && pending[0].id !== lastTripIdRef.current) {
      // Avoid double alerting on initial mount
      if (lastTripIdRef.current !== null) {
        showNotification(pending[0]);
      }
      lastTripIdRef.current = pending[0].id;
    } else if (pending.length === 0) {
      lastTripIdRef.current = null;
    }
  }, [driver, showNotification]);

  const refreshTrips = useCallback(async () => {
    if (!driver) return;

    try {
      let pending: Trip[] = [], assigned: Trip[] = [];
      
      if (driver.id === 'admin') {
        const results = await Promise.allSettled([
          fetchTrips({ status: 'PENDING', limit: 100 }),
          fetchTrips({ limit: 100 })
        ]);
        pending = results[0].status === 'fulfilled' ? results[0].value : [];
        assigned = results[1].status === 'fulfilled' ? results[1].value : [];
      } else {
        const results = await Promise.allSettled([
          fetchTrips({ status: 'PENDING', limit: 20 }),
          fetchTrips({ driverId: driver.id, limit: 10 })
        ]);
        pending = results[0].status === 'fulfilled' ? results[0].value : [];
        assigned = results[1].status === 'fulfilled' ? results[1].value : [];
      }

      const combinedTrips = [...pending, ...assigned];
      const uniqueTrips = Array.from(new Map(combinedTrips.map(t => [t.id, t])).values());
      
      setAllTrips(uniqueTrips);
      updatePendingTrips(uniqueTrips);
      
      const active = uniqueTrips.find(t => t.driverId === driver.id && !['COMPLETED', 'CANCELLED'].includes(t.status));
      setActiveTrip(active || null);
    } catch (e) {
      console.warn('[TripContext] Refresh failed silently:', e);
    }
  }, [driver, updatePendingTrips]);

  useEffect(() => {
    if (!driver) return;

    refreshTrips();
    
    if (!isSupabaseConfigured) {
      const pollInterval = setInterval(refreshTrips, 30000); // Poll more frequently if realtime is off
      return () => clearInterval(pollInterval);
    }

    const handleChanges = (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      setAllTrips(prevTrips => {
        let updatedTrips = [...prevTrips];
        
        const isRelevant = 
          driver.id === 'admin' || 
          newRecord?.status === 'PENDING' || 
          newRecord?.driver_id === driver.id ||
          oldRecord?.status === 'PENDING' || 
          oldRecord?.driver_id === driver.id;

        if (!isRelevant) return prevTrips;

        if (eventType === 'INSERT') {
          if (!updatedTrips.find(t => t.id === newRecord.id)) {
            const mappedTrip: Trip = {
              id: newRecord.id,
              pickup: newRecord.pickup,
              pickupLat: newRecord.pickup_lat,
              pickupLng: newRecord.pickup_lng,
              drop: newRecord.drop,
              dropLat: newRecord.drop_lat,
              dropLng: newRecord.drop_lng,
              customerName: newRecord.customer_name,
              customerPhone: newRecord.customer_phone,
              fare: Number(newRecord.fare),
              baseFare: newRecord.base_fare ? Number(newRecord.base_fare) : undefined,
              kmsFare: newRecord.kms_fare ? Number(newRecord.kms_fare) : undefined,
              distance: newRecord.distance,
              rideType: newRecord.ride_type,
              status: newRecord.status,
              timestamp: newRecord.timestamp,
              driverId: newRecord.driver_id,
              rejectedBy: newRecord.rejected_by || [],
              releasedBy: newRecord.released_by || [],
              startTime: newRecord.start_time,
              endTime: newRecord.end_time,
              actualStartLat: newRecord.actual_start_lat,
              actualStartLng: newRecord.actual_start_lng,
              actualEndLat: newRecord.actual_end_lat,
              actualEndLng: newRecord.actual_end_lng,
              actualDistance: newRecord.actual_distance,
              targetLocationOnly: newRecord.target_location_only,
              targetRadius: newRecord.target_radius
            };
            updatedTrips = [mappedTrip, ...updatedTrips];
          }
        }
 else if (eventType === 'UPDATE') {
          const index = updatedTrips.findIndex(t => t.id === newRecord.id);
          if (index !== -1) {
            const mappedTrip: Trip = {
              ...updatedTrips[index],
              status: newRecord.status,
              driverId: newRecord.driver_id,
              fare: Number(newRecord.fare),
              rejectedBy: newRecord.rejected_by || [],
              releasedBy: newRecord.released_by || [],
              startTime: newRecord.start_time,
              endTime: newRecord.end_time,
              actualStartLat: newRecord.actual_start_lat,
              actualStartLng: newRecord.actual_start_lng,
              actualEndLat: newRecord.actual_end_lat,
              actualEndLng: newRecord.actual_end_lng,
              actualDistance: newRecord.actual_distance,
              targetLocationOnly: newRecord.target_location_only,
              targetRadius: newRecord.target_radius
            };
            updatedTrips[index] = mappedTrip;
          } else {
            const mappedTrip: Trip = {
              id: newRecord.id,
              pickup: newRecord.pickup,
              pickupLat: newRecord.pickup_lat,
              pickupLng: newRecord.pickup_lng,
              drop: newRecord.drop,
              dropLat: newRecord.drop_lat,
              dropLng: newRecord.drop_lng,
              customerName: newRecord.customer_name,
              customerPhone: newRecord.customer_phone,
              fare: Number(newRecord.fare),
              baseFare: newRecord.base_fare ? Number(newRecord.base_fare) : undefined,
              kmsFare: newRecord.kms_fare ? Number(newRecord.kms_fare) : undefined,
              distance: newRecord.distance,
              rideType: newRecord.ride_type,
              status: newRecord.status,
              timestamp: newRecord.timestamp,
              driverId: newRecord.driver_id,
              rejectedBy: newRecord.rejected_by || [],
              releasedBy: newRecord.released_by || [],
              startTime: newRecord.start_time,
              endTime: newRecord.end_time,
              actualStartLat: newRecord.actual_start_lat,
              actualStartLng: newRecord.actual_start_lng,
              actualEndLat: newRecord.actual_end_lat,
              actualEndLng: newRecord.actual_end_lng,
              actualDistance: newRecord.actual_distance,
              targetLocationOnly: newRecord.target_location_only,
              targetRadius: newRecord.target_radius
            };
            updatedTrips = [mappedTrip, ...updatedTrips];
          }
        } else if (eventType === 'DELETE') {
          updatedTrips = updatedTrips.filter(t => t.id !== oldRecord.id);
        }

        updatePendingTrips(updatedTrips);
        
        const active = updatedTrips.find(t => t.driverId === driver.id && !['COMPLETED', 'CANCELLED'].includes(t.status));
        setActiveTrip(active || null);
        
        return updatedTrips;
      });
    };

    let channels: any[] = [];
    
    if (driver.id === 'admin') {
      const allChannel = supabase
        .channel('all-trips')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, handleChanges)
        .subscribe();
      channels.push(allChannel);
    } else {
      const pendingChannel = supabase
        .channel('pending-trips')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: 'status=eq.PENDING' }, handleChanges)
        .subscribe();
      
      const myChannel = supabase
        .channel('my-trips')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `driver_id=eq.${driver.id}` }, handleChanges)
        .subscribe();
      
      channels.push(pendingChannel, myChannel);
    }

    const pollInterval = setInterval(refreshTrips, driver.id === 'admin' ? 30000 : 5000); 
    
    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
      clearInterval(pollInterval);
    };
  }, [driver, refreshTrips, updatePendingTrips]);

  // Keep the timer for re-evaluating rejected trips local state
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setAllTrips(currentAllTrips => {
        updatePendingTrips(currentAllTrips);
        return currentAllTrips;
      });
    }, 5000); // 5 seconds is enough for checking local rejection timeouts
    
    return () => clearInterval(timerInterval);
  }, [updatePendingTrips]);

  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const acceptTrip = async (tripId: string) => {
    if (!driver || driver.isBlocked || isActionLoading) return;
    setIsActionLoading(tripId);
    try {
      console.log(`[TripAction] Accepting trip: ${tripId}`);
      const result = await updateTripStatus(tripId, 'ACCEPTED', driver.id);
      if (result.success) {
        await refreshTrips();
      } else {
        alert('Could not accept trip: ' + (result.error || 'Unknown error'));
      }
    } finally {
      setIsActionLoading(null);
    }
  };
  
  const releaseTrip = async (tripId: string, reason: string) => {
    if (!driver || driver.isBlocked || isActionLoading) return;
    setIsActionLoading(tripId);
    try {
      const { releaseTripApi } = await import('../services/api');
      const trip = allTrips.find(t => t.id === tripId);
      const result = await releaseTripApi(tripId, driver.id, trip?.releasedBy || [], reason);
      if (result.success) {
        setActiveTrip(null);
        await refreshTrips();
      }
    } finally {
      setIsActionLoading(null);
    }
  };
  
  const rejectTrip = async (tripId: string) => {
    if (!driver || driver.isBlocked || isActionLoading) return;
    setIsActionLoading(tripId);
    try {
      const trip = allTrips.find(t => t.id === tripId);
      if (!trip) return;
      
      console.log(`[TripAction] Rejecting trip: ${tripId}`);
      const result = await rejectTripApi(tripId, driver.id, trip.rejectedBy || []);
      if (result.success) {
        // Remove locally immediately for better UX
        setPendingTrips(prev => prev.filter(t => t.id !== tripId));
        await refreshTrips();
      }
    } finally {
      setIsActionLoading(null);
    }
  };

  const createTrip = async (tripData: Omit<Trip, 'id' | 'status' | 'timestamp'>) => {
    const { createTripApi } = await import('../services/api');
    const result = await createTripApi(tripData);
    if (result.success) {
      await refreshTrips();
    }
    return { success: result.success, error: result.error };
  };

  const updateStatus = async (status: Trip['status'], extraData?: any) => {
    if (!activeTrip || !driver || driver.isBlocked) return;
    const result = await updateTripStatus(activeTrip.id, status, driver.id, extraData);
    if (result.success) {
      await refreshTrips();
    }
  };

  const cancelTrip = async (tripId: string) => {
    const result = await updateTripStatus(tripId, 'CANCELLED');
    if (result.success) {
      await refreshTrips();
    }
    return result;
  };

  const updateTripFare = async (tripId: string, fare: number) => {
    const { updateTripFareApi } = await import('../services/api');
    const result = await updateTripFareApi(tripId, fare);
    if (result.success) {
      await refreshTrips();
    }
    return result;
  };

  return (
    <TripContext.Provider value={{ pendingTrips, activeTrip, allTrips, acceptTrip, rejectTrip, releaseTrip, updateStatus, createTrip, cancelTrip, updateTripFare, refreshTrips, isActionLoading }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrips() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrips must be used within a TripProvider');
  }
  return context;
}
