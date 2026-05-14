import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { Trip, Driver } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Helper to get base URL for API calls in Capacitor
const getBaseUrl = () => {
  if (Capacitor.isNativePlatform()) {
    return 'https://trusty-yellow-cabs-driver.vercel.app';
  }
  return '';
};

/**
 * Fetch trips with a preference for Supabase to ensure real-time consistency.
 * Added cache: 'no-store' to prevent stale responses on mobile.
 */
export async function fetchTrips(filters?: { status?: Trip['status']; driverId?: string; limit?: number }): Promise<Trip[]> {
  try {
    // If Supabase is configured, use it directly for state-sensitive data
    if (isSupabaseConfigured) {
      let query = supabase.from('trips').select('*');
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.driverId) query = query.eq('driver_id', filters.driverId);

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(filters?.limit || 50);

      if (!error && data) {
        return data.map(row => ({
          id: row.id,
          pickup: row.pickup,
          pickupLat: row.pickup_lat,
          pickupLng: row.pickup_lng,
          drop: row.drop,
          dropLat: row.drop_lat,
          dropLng: row.drop_lng,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          fare: Number(row.fare),
          baseFare: row.base_fare ? Number(row.base_fare) : undefined,
          kmsFare: row.kms_fare ? Number(row.kms_fare) : undefined,
          distance: row.distance,
          rideType: row.ride_type,
          status: row.status as Trip['status'],
          timestamp: row.timestamp,
          driverId: row.driver_id,
          rejectedBy: row.rejected_by || [],
          releasedBy: row.released_by || [],
          startTime: row.start_time,
          endTime: row.end_time,
          actualStartLat: row.actual_start_lat,
          actualStartLng: row.actual_start_lng,
          actualEndLat: row.actual_end_lat,
          actualEndLng: row.actual_end_lng,
          actualDistance: row.actual_distance,
          targetLocationOnly: row.target_location_only,
          targetRadius: row.target_radius
        }));
      }
    }

    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.driverId) params.append('driver_id', filters.driverId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const url = `${getBaseUrl()}/api/trips${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (e) {
    console.error('Fetch trips error:', e);
    return [];
  }
}

export async function createTripApi(trip: Omit<Trip, 'id' | 'status' | 'timestamp'>): Promise<{ success: boolean; data?: Trip; error?: string }> {
  try {
    const tripId = 'T' + Math.floor(Math.random() * 100000);
    const newTripRow = {
      id: tripId,
      pickup: trip.pickup,
      pickup_lat: trip.pickupLat,
      pickup_lng: trip.pickupLng,
      "drop": trip.drop,
      drop_lat: trip.dropLat,
      drop_lng: trip.dropLng,
      customer_name: trip.customerName,
      customer_phone: trip.customerPhone,
      fare: trip.fare,
      base_fare: trip.baseFare,
      kms_fare: trip.kmsFare,
      distance: trip.distance,
      ride_type: trip.rideType,
      status: 'PENDING',
      target_location_only: trip.targetLocationOnly || false,
      target_radius: trip.targetRadius || 5
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('trips')
        .insert([newTripRow])
        .select()
        .single();

      if (error) throw error;
      return {
        success: true,
        data: {
          ...trip,
          id: data.id,
          status: 'PENDING',
          timestamp: data.timestamp
        }
      };
    }

    const response = await fetch(`${getBaseUrl()}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTripRow)
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
    return { success: false, error: 'Failed to create trip' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateTripStatus(tripId: string, status: Trip['status'], driverId?: string, extraData?: any): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');

    const updateData: any = { status, ...extraData };
    if (driverId) updateData.driver_id = driverId;
    if (status === 'PENDING') updateData.driver_id = null;
    if (status === 'STARTED') updateData.start_time = new Date().toISOString();
    if (status === 'COMPLETED') updateData.end_time = new Date().toISOString();

    const { error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', tripId);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function fetchDrivers(filters?: { isOnline?: boolean; search?: string; limit?: number }): Promise<Driver[]> {
  try {
    if (isSupabaseConfigured) {
      let query = supabase.from('drivers').select('*');
      if (filters?.isOnline !== undefined) query = query.eq('is_online', filters.isOnline);
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,id.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 50);

      if (!error && data) {
        return data.map(row => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          pin: row.pin,
          vehicleModel: row.vehicle_model,
          vehicleNumber: row.vehicle_number,
          isOnline: row.is_online,
          rating: Number(row.rating),
          totalEarnings: Number(row.total_earnings),
          completedRides: row.completed_rides,
          avatarUrl: row.avatar_url,
          isBlocked: row.is_blocked,
          officeFee: Number(row.office_fee || 0),
          latitude: row.latitude,
          longitude: row.longitude,
          heading: row.heading,
          lastSeen: row.last_seen,
          fcmToken: row.fcm_token
        }));
      }
    }

    const response = await fetch(`${getBaseUrl()}/api/drivers`, { cache: 'no-store' });
    if (response.ok) return await response.json();
    return [];
  } catch (e) {
    console.error('Fetch drivers error:', e);
    return [];
  }
}

export async function createDriverApi(driverData: Omit<Driver, 'rating' | 'totalEarnings' | 'completedRides' | 'isOnline'>): Promise<{ success: boolean; data?: Driver; error?: string }> {
  const newDriverRow = {
    id: driverData.id,
    name: driverData.name,
    phone: driverData.phone,
    pin: driverData.pin,
    vehicle_model: driverData.vehicleModel,
    vehicle_number: driverData.vehicleNumber,
    is_online: false,
    rating: 5.0,
    total_earnings: 0,
    completed_rides: 0,
    avatar_url: driverData.avatarUrl,
    is_blocked: false,
    office_fee: 0
  };

  try {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('drivers')
      .insert([newDriverRow])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        ...driverData,
        isOnline: false,
        rating: 5.0,
        totalEarnings: 0,
        completedRides: 0,
        isBlocked: false,
        officeFee: 0
      }
    };
  } catch (e: any) {
    console.error('Supabase create driver error:', e.message || e);
    return {
      success: false,
      error: e.message || 'Unknown database error'
    };
  }
}

export async function getDriverByLogin(identifier: string, pin: string): Promise<Driver | null> {
  try {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .or(`id.eq.${identifier},phone.eq.${identifier}`)
      .eq('pin', pin)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      pin: data.pin,
      vehicleModel: data.vehicle_model,
      vehicleNumber: data.vehicle_number,
      isOnline: data.is_online,
      rating: Number(data.rating),
      totalEarnings: Number(data.total_earnings),
      completedRides: data.completed_rides,
      avatarUrl: data.avatar_url,
      isBlocked: data.is_blocked,
      officeFee: Number(data.office_fee || 0),
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading,
      lastSeen: data.last_seen,
      fcmToken: data.fcm_token
    };
  } catch (e) {
    return null;
  }
}

export async function updateLocationApi(driverId: string, lat: number, lng: number, heading?: number): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase
      .from('drivers')
      .update({
        latitude: lat,
        longitude: lng,
        heading,
        last_seen: new Date().toISOString()
      })
      .eq('id', driverId);
    return !error;
  } catch {
    return false;
  }
}

export async function updateDriverOnlineStatus(driverId: string, isOnline: boolean): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase
      .from('drivers')
      .update({ is_online: isOnline })
      .eq('id', driverId);
    return !error;
  } catch {
    return false;
  }
}

export async function updateTripFareApi(tripId: string, fare: number): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('trips')
      .update({ fare })
      .eq('id', tripId);
    return { success: !error, error: error?.message };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function releaseTripApi(tripId: string, driverId: string, currentReleasedBy: any[], reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const newReleasedBy = [...(currentReleasedBy || []), { driverId, timestamp: new Date().toISOString(), reason }];
    const { error } = await supabase
      .from('trips')
      .update({ status: 'PENDING', driver_id: null, released_by: newReleasedBy })
      .eq('id', tripId);
    return { success: !error, error: error?.message };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function rejectTripApi(tripId: string, driverId: string, currentRejectedBy: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const rejectionEntry = `${driverId}|${Date.now()}`;
    const newRejectedBy = [...(currentRejectedBy || []).filter(e => !e.startsWith(driverId)), rejectionEntry];
    const { error } = await supabase
      .from('trips')
      .update({ rejected_by: newRejectedBy })
      .eq('id', tripId);
    return { success: !error, error: error?.message };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteTripApi(tripId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    return { success: !error, error: error?.message };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function uploadDriverPhoto(file: File, driverId: string): Promise<string | null> {
  try {
    if (!isSupabaseConfigured) return null;
    const fileName = `${driverId}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export async function updateDriverBlockedStatus(driverId: string, isBlocked: boolean): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('drivers').update({ is_blocked: isBlocked }).eq('id', driverId);
    return !error;
  } catch {
    return false;
  }
}

export async function updateOfficeFeeApi(driverId: string, amount: number): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('drivers').update({ office_fee: amount }).eq('id', driverId);
    return !error;
  } catch {
    return false;
  }
}

export async function updateFcmTokenApi(driverId: string, token: string | null): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase.from('drivers').update({ fcm_token: token }).eq('id', driverId);
    return !error;
  } catch {
    return false;
  }
}
