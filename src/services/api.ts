/**
 * GOOGLE APPS SCRIPT (Copy this into your Google Apps Script associated with the Sheet)
 * 
 * const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
 * 
 * function doGet(e) {
 *   const action = e.parameter.action;
 *   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 *   
 *   if (action === 'getTrips') {
 *     const sheet = ss.getSheetByName('Trips');
 *     const data = sheet.getDataRange().getValues();
 *     const headers = data.shift();
 *     const trips = data.map(row => {
 *       const trip = {};
 *       headers.forEach((h, i) => trip[h] = row[i]);
 *       return trip;
 *     });
 *     return ContentService.createTextOutput(JSON.stringify(trips)).setMimeType(ContentService.MimeType.JSON);
 *   }
 *   
 *   if (action === 'getDrivers') {
 *     const sheet = ss.getSheetByName('Drivers');
 *     const data = sheet.getDataRange().getValues();
 *     const headers = data.shift();
 *     const drivers = data.map(row => {
 *       const d = {};
 *       headers.forEach((h, i) => d[h] = row[i]);
 *       return d;
 *     });
 *     return ContentService.createTextOutput(JSON.stringify(drivers)).setMimeType(ContentService.MimeType.JSON);
 *   }
 *   
 *   // Handle post actions (accept, update status, etc) via doPost or doGet with action param
 * }
 */

import { Trip, Driver } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * SUPABASE SQL SCHEMA (Run this in Supabase SQL Editor)
 * 
 * -- 1. Trips Table
 * CREATE TABLE trips (
 *   id TEXT PRIMARY KEY,
 *   pickup TEXT NOT NULL,
 *   pickup_lat DOUBLE PRECISION,
 *   pickup_lng DOUBLE PRECISION,
 *   "drop" TEXT NOT NULL,
 *   drop_lat DOUBLE PRECISION,
 *   drop_lng DOUBLE PRECISION,
 *   customer_name TEXT NOT NULL,
 *   customer_phone TEXT NOT NULL,
 *   fare NUMERIC NOT NULL,
 *   base_fare NUMERIC,
 *   kms_fare NUMERIC,
 *   distance TEXT,
 *   ride_type TEXT,
 *   status TEXT DEFAULT 'PENDING',
 *   driver_id TEXT,
 *   rejected_by TEXT[] DEFAULT '{}',
 *   released_by JSONB DEFAULT '[]',
 *   timestamp TIMESTAMPTZ DEFAULT NOW(),
 *   start_time TIMESTAMPTZ,
 *   end_time TIMESTAMPTZ,
 *   actual_start_lat DOUBLE PRECISION,
 *   actual_start_lng DOUBLE PRECISION,
 *   actual_end_lat DOUBLE PRECISION,
 *   actual_end_lng DOUBLE PRECISION,
 *   actual_distance NUMERIC,
 *   target_location_only BOOLEAN DEFAULT FALSE,
 *   target_radius INTEGER DEFAULT 5
 * );
 * 
 * -- Update existing table if needed:
 * -- ALTER TABLE trips ADD COLUMN actual_start_lat DOUBLE PRECISION;
 * -- ALTER TABLE trips ADD COLUMN actual_start_lng DOUBLE PRECISION;
 * -- ALTER TABLE trips ADD COLUMN actual_end_lat DOUBLE PRECISION;
 * -- ALTER TABLE trips ADD COLUMN actual_end_lng DOUBLE PRECISION;
 * -- ALTER TABLE trips ADD COLUMN actual_distance NUMERIC;
 * -- ALTER TABLE trips ADD COLUMN pickup_lat DOUBLE PRECISION;
 * -- ALTER TABLE trips ADD COLUMN pickup_lng DOUBLE PRECISION;
 * -- ALTER TABLE trips ADD COLUMN drop_lat DOUBLE PRECISION;
 * -- ALTER TABLE trips ADD COLUMN drop_lng DOUBLE PRECISION;
 * -- ALTER TABLE trips ADD COLUMN target_location_only BOOLEAN DEFAULT FALSE;
 * -- ALTER TABLE trips ADD COLUMN target_radius INTEGER DEFAULT 5;
 * 
 * -- 2. Drivers Table
 * CREATE TABLE drivers (
 *   id TEXT PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   phone TEXT UNIQUE NOT NULL,
 *   pin TEXT NOT NULL,
 *   vehicle_model TEXT,
 *   vehicle_number TEXT,
 *   is_online BOOLEAN DEFAULT FALSE,
 *   rating NUMERIC DEFAULT 5.0,
 *   total_earnings NUMERIC DEFAULT 0,
 *   completed_rides INTEGER DEFAULT 0,
 *   avatar_url TEXT,
 *   is_blocked BOOLEAN DEFAULT FALSE,
 *   office_fee NUMERIC DEFAULT 0,
 *   latitude DOUBLE PRECISION,
 *   longitude DOUBLE PRECISION,
 *   last_seen TIMESTAMPTZ,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Update existing table if needed:
 * -- ALTER TABLE drivers ADD COLUMN IF NOT EXISTS office_fee NUMERIC DEFAULT 0;
 * -- ALTER TABLE drivers ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
 * -- ALTER TABLE drivers ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
 * -- ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
 * 
 * -- 3. Row Level Security (RLS) Policies
 * -- Run these to fix the "violates row-level security policy" error
 * ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
 * 
 * -- Drivers Policies
 * CREATE POLICY "Public read drivers" ON drivers FOR SELECT USING (true);
 * CREATE POLICY "Public insert drivers" ON drivers FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Public update drivers" ON drivers FOR UPDATE USING (true);
 * 
 * -- Trips Policies
 * CREATE POLICY "Public read trips" ON trips FOR SELECT USING (true);
 * CREATE POLICY "Public insert trips" ON trips FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Public update trips" ON trips FOR UPDATE USING (true);
 * CREATE POLICY "Public delete trips" ON trips FOR DELETE USING (true);
 * 
 * -- Add office_fee to existing drivers table
 * ALTER TABLE drivers ADD COLUMN IF NOT EXISTS office_fee NUMERIC DEFAULT 0;
 * 
 * -- Add fcm_token to drivers table for push notifications
 * ALTER TABLE drivers ADD COLUMN IF NOT EXISTS fcm_token TEXT;
 */
export async function verifyDriverSessionApi(driverId: string, pin: string): Promise<Driver | null> {
  try {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .eq('pin', pin)
      .single();

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
    console.error('Session verify error:', e);
    return null;
  }
}

export async function fetchTrips(filters?: { status?: Trip['status']; driverId?: string; limit?: number }): Promise<Trip[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.driverId) params.append('driver_id', filters.driverId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const queryStr = params.toString();
    const url = `/api/trips${queryStr ? '?' + queryStr : ''}`;

    // Try to fetch from backend first
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data.map((row: any) => ({
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

    // Fallback to direct client-side Supabase
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

    let query = supabase.from('trips').select('*');
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.driverId) query = query.eq('driver_id', filters.driverId);

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(filters?.limit || 50);

    if (error) throw error;

    return (data || []).map(row => ({
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
  } catch (e: any) {
    console.error('Supabase fetch error:', e.message || e);
    const stored = localStorage.getItem('trusty_trips_db');
    return stored ? JSON.parse(stored) : [];
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

    // Try backend first
    const response = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTripRow)
    });

    if (response.ok) {
      const data = await response.json();
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

    // Fallback to client-side
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

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

export async function updateTripFareApi(tripId: string, fare: number): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('trips')
      .update({ fare })
      .eq('id', tripId);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('Supabase update fare error:', e.message || e);
    return { success: false, error: e.message };
  }
}

export async function updateTripStatus(tripId: string, status: Trip['status'], driverId?: string, extraData?: any): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const updateData: any = { status, ...extraData };
    if (driverId) updateData.driver_id = driverId;
    if (status === 'PENDING') {
      updateData.driver_id = null;
    }
    if (status === 'STARTED') updateData.start_time = new Date().toISOString();
    if (status === 'COMPLETED') updateData.end_time = new Date().toISOString();

    const { error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', tripId);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('Supabase update error:', e.message || e);
    return { success: false, error: e.message };
  }
}

export async function releaseTripApi(tripId: string, driverId: string, currentReleasedBy: any[], reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const releaseEntry = {
      driverId,
      timestamp: new Date().toISOString(),
      reason
    };
    
    const newReleasedBy = [...(currentReleasedBy || []), releaseEntry];

    const { error } = await supabase
      .from('trips')
      .update({ 
        status: 'PENDING', 
        driver_id: null,
        released_by: newReleasedBy 
      })
      .eq('id', tripId);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('Supabase release error:', e.message || e);
    return { success: false, error: e.message };
  }
}

export async function rejectTripApi(tripId: string, driverId: string, currentRejectedBy: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const timestamp = Date.now().toString();
    const rejectionEntry = `${driverId}|${timestamp}`;
    
    // Remove any existing rejection entry for this driver (handle both old plain ID and new ID|timestamp)
    const filteredRejections = (currentRejectedBy || []).filter(entry => {
      const entryId = entry.includes('|') ? entry.split('|')[0] : entry;
      return entryId !== driverId;
    });
    
    const newRejectedBy = [...filteredRejections, rejectionEntry];

    const { error } = await supabase
      .from('trips')
      .update({ rejected_by: newRejectedBy })
      .eq('id', tripId);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('Supabase reject error:', e.message || e);
    return { success: false, error: e.message };
  }
}

export async function deleteTripApi(tripId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('Supabase delete error:', e.message || e);
    return { success: false, error: e.message };
  }
}

export async function fetchDrivers(filters?: { isOnline?: boolean; search?: string; limit?: number }): Promise<Driver[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.isOnline !== undefined) params.append('is_online', filters.isOnline.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const queryStr = params.toString();
    const url = `/api/drivers${queryStr ? '?' + queryStr : ''}`;

    // Try to fetch from backend first
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data.map((row: any) => ({
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

    // Fallback to direct client-side Supabase
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

    let query = supabase.from('drivers').select('*');
    if (filters?.isOnline !== undefined) query = query.eq('is_online', filters.isOnline);
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,id.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,vehicle_number.ilike.%${filters.search}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 50);

    if (error) throw error;

    return (data || []).map(row => ({
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
      lastSeen: row.last_seen
    }));
  } catch (e: any) {
    console.error('Supabase fetch drivers error:', e.message || e);
    const stored = localStorage.getItem('trusty_drivers_db');
    return stored ? JSON.parse(stored) : [];
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

export async function updateDriverOnlineStatus(driverId: string, isOnline: boolean): Promise<boolean> {
  try {
    // Try backend first
    const response = await fetch(`/api/drivers/${driverId}/online`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline })
    });

    if (response.ok) return true;

    // Fallback to client-side Supabase
    if (!isSupabaseConfigured) return false;

    const { error } = await supabase
      .from('drivers')
      .update({ is_online: isOnline })
      .eq('id', driverId);

    if (error) throw error;
    return true;
  } catch (e: any) {
    console.error('Supabase update driver status error:', e.message || e);
    return false;
  }
}

export async function getDriverByLogin(identifier: string, pin: string): Promise<Driver | null> {
  try {
    if (!isSupabaseConfigured) return null;
    // Try login by ID
    let { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', identifier)
      .eq('pin', pin)
      .single();

    // If ID fails, try login by Phone
    if (error || !data) {
      const { data: phoneData, error: phoneError } = await supabase
        .from('drivers')
        .select('*')
        .eq('phone', identifier)
        .eq('pin', pin)
        .single();
      
      data = phoneData;
      error = phoneError;
    }

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
  } catch (e: any) {
    console.error('Supabase login error:', e.message || e);
    return null;
  }
}

export async function updateLocationApi(driverId: string, lat: number, lng: number, heading?: number): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) return false;
    const updateData: any = { 
      latitude: lat, 
      longitude: lng,
      last_seen: new Date().toISOString()
    };
    
    if (heading !== undefined) {
      updateData.heading = heading;
    }

    const { error } = await supabase
      .from('drivers')
      .update(updateData)
      .eq('id', driverId);

    if (error) throw error;
    return true;
  } catch (e: any) {
    if (e.message?.includes('last_seen') || e.message?.includes('latitude') || e.message?.includes('heading')) {
      console.error('MISSING COLUMNS: Please add latitude (float8), longitude (float8), last_seen (timestamptz), and heading (float8) columns to your drivers table in Supabase.');
    } else {
      console.error('Supabase update location error:', e.message || e);
    }
    return false;
  }
}

export async function uploadDriverPhoto(file: File, driverId: string): Promise<string | null> {
  try {
    if (!isSupabaseConfigured) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${driverId}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`; // Just put in root of bucket or a subfolder

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (e) {
    console.error('Error uploading photo:', e);
    return null;
  }
}

export async function updateDriverBlockedStatus(driverId: string, isBlocked: boolean): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase
      .from('drivers')
      .update({ is_blocked: isBlocked })
      .eq('id', driverId);

    if (error) throw error;
    return true;
  } catch (e: any) {
    console.error('Supabase update driver blocked status error:', e.message || e);
    return false;
  }
}

export async function updateOfficeFeeApi(driverId: string, amount: number): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase
      .from('drivers')
      .update({ office_fee: amount })
      .eq('id', driverId);

    if (error) throw error;
    return true;
  } catch (e: any) {
    console.error('Supabase update office fee error:', e.message || e);
    return false;
  }
}

export async function updateFcmTokenApi(driverId: string, token: string | null): Promise<boolean> {
  try {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase
      .from('drivers')
      .update({ fcm_token: token })
      .eq('id', driverId);

    if (error) throw error;
    return true;
  } catch (e: any) {
    console.error('Supabase update fcm token error:', e.message || e);
    return false;
  }
}
