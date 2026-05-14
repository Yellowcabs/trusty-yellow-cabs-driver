import { Trip, Driver } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * SUPABASE ONLY VERSION
 * No backend API
 * No Vercel Functions
 * No Cloud Run
 */

export async function fetchTrips(filters?: {
  status?: Trip['status'];
  driverId?: string;
  limit?: number;
}): Promise<Trip[]> {
  try {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

    let query = supabase.from('trips').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.driverId) {
      query = query.eq('driver_id', filters.driverId);
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(filters?.limit || 50);

    if (error) throw error;

    return (data || []).map((row: any) => ({
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
      status: row.status,
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

  } catch (e: any) {
    console.error('Supabase fetch error:', e.message || e);

    const stored = localStorage.getItem('trusty_trips_db');
    return stored ? JSON.parse(stored) : [];
  }
}

export async function createTripApi(
  trip: Omit<Trip, 'id' | 'status' | 'timestamp'>
): Promise<{ success: boolean; data?: Trip; error?: string }> {

  try {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

    const tripId = 'T' + Math.floor(Math.random() * 100000);

    const newTripRow = {
      id: tripId,
      pickup: trip.pickup,
      pickup_lat: trip.pickupLat,
      pickup_lng: trip.pickupLng,
      drop: trip.drop,
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

  } catch (e: any) {
    console.error('Supabase insert error:', e.message || e);

    return {
      success: false,
      error: e.message || 'Unknown database error'
    };
  }
}

export async function updateTripStatus(
  tripId: string,
  status: Trip['status'],
  driverId?: string,
  extraData?: any
): Promise<{ success: boolean; error?: string }> {

  try {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

    const updateData: any = {
      status,
      ...extraData
    };

    if (driverId) {
      updateData.driver_id = driverId;
    }

    if (status === 'PENDING') {
      updateData.driver_id = null;
    }

    if (status === 'STARTED') {
      updateData.start_time = new Date().toISOString();
    }

    if (status === 'COMPLETED') {
      updateData.end_time = new Date().toISOString();
    }

    const { error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', tripId);

    if (error) throw error;

    return { success: true };

  } catch (e: any) {
    console.error('Supabase update error:', e.message || e);

    return {
      success: false,
      error: e.message
    };
  }
}
export async function updateFcmTokenApi(
  driverId: string,
  token: string | null
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('drivers')
      .update({
        fcm_token: token
      })
      .eq('id', driverId);

    if (error) throw error;

    return true;
  } catch (e: any) {
    console.error('FCM token update error:', e.message || e);
    return false;
  }
}