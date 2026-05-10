export type TripStatus = 'PENDING' | 'ACCEPTED' | 'ARRIVED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  pin: string; // This is the login password/PIN
  vehicleModel: string;
  vehicleNumber: string;
  rideType?: string;
  isOnline: boolean;
  rating: number;
  totalEarnings: number;
  completedRides: number;
  avatarUrl?: string;
  isBlocked?: boolean;
  officeFee?: number;
  latitude?: number;
  longitude?: number;
  heading?: number;
  lastSeen?: string;
}

export interface Trip {
  id: string;
  pickup: string;
  pickupLat?: number;
  pickupLng?: number;
  drop: string;
  dropLat?: number;
  dropLng?: number;
  customerName: string;
  customerPhone: string;
  fare: number;
  baseFare?: number;
  kmsFare?: number;
  distance: string;
  rideType: string;
  status: TripStatus;
  timestamp: string;
  driverId?: string;
  rejectedBy?: string[];
  releasedBy?: { driverId: string; timestamp: string; reason: string }[];
  startTime?: string;
  endTime?: string;
  actualStartLat?: number;
  actualStartLng?: number;
  actualEndLat?: number;
  actualEndLng?: number;
  actualDistance?: number;
  targetLocationOnly?: boolean; // if true, only show to drivers within targetRadius
  targetRadius?: number; // in km
}

export interface Earning {
  date: string;
  amount: number;
  rides: number;
}
