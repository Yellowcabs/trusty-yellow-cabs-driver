import React, { useMemo, useState, useEffect } from 'react';
import { Map, AdvancedMarker, InfoWindow, useMap, APIProvider } from '@vis.gl/react-google-maps';
import { Driver } from '../types';
import { User, Navigation, Car } from 'lucide-react';

interface LiveMapProps {
  drivers: Driver[];
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '24px'
};

const center = {
  lat: 11.0168, // Coimbatore / Tamil Nadu default
  lng: 76.9558
};

// Helper component to handle map bounds inside the Map context
function MapControl({ drivers }: { drivers: Driver[] }) {
  const map = useMap();

  useEffect(() => {
    if (map && drivers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      drivers.forEach((driver) => {
        if (driver.latitude && driver.longitude) {
          bounds.extend({ lat: driver.latitude, lng: driver.longitude });
        }
      });
      
      if (drivers.length > 1) {
        map.fitBounds(bounds, 80);
      } else if (drivers.length === 1) {
        map.panTo({ lat: drivers[0].latitude!, lng: drivers[0].longitude! });
        map.setZoom(15);
      }
    }
  }, [map, drivers]);

  return null;
}

export function LiveMap({ drivers }: LiveMapProps) {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const activeDrivers = useMemo(() => {
    // Return all drivers that have location and are online
    return drivers.filter(d => d.latitude && d.longitude && d.isOnline && !d.isBlocked);
  }, [drivers]);

  return (
    <div className="glass-card p-4 border-none shadow-2xl relative overflow-hidden">
      <div className="absolute top-8 left-8 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-neutral-100 flex items-center gap-3">
         <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
         <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
            {activeDrivers.length} Online Drivers Live
         </p>
      </div>

      <Map
        style={mapContainerStyle}
        defaultCenter={center}
        defaultZoom={12}
        mapId="live-tracking-map"
        disableDefaultUI={false}
        fullscreenControl={true}
        zoomControl={true}
        gestureHandling={'greedy'}
      >
        <MapControl drivers={activeDrivers} />

        {activeDrivers.map((driver) => (
          <AdvancedMarker
            key={driver.id}
            position={{ lat: driver.latitude!, lng: driver.longitude! }}
            onClick={() => setSelectedDriver(driver)}
          >
            <div className="relative group cursor-pointer">
               {/* Label - visible on hover or if selected */}
               <div className={cn(
                 "absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-3 py-1.5 rounded-xl shadow-2xl transition-all whitespace-nowrap pointer-events-none z-20",
                 selectedDriver?.id === driver.id ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
               )}>
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none">{driver.name}</p>
                  <p className="text-[8px] text-white/60 mt-1 font-bold">{driver.vehicleNumber}</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900 rotate-45 -mt-1" />
               </div>
               
               {/* Car Icon Marker */}
               <div className={cn(
                 "w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white transition-all transform hover:scale-110 relative",
                 driver.rideType?.includes('suv') ? "bg-amber-500" : "bg-emerald-600",
                 selectedDriver?.id === driver.id && "ring-4 ring-primary ring-offset-2 scale-110"
               )}>
                  <Car size={24} className="text-white fill-white/20" />
                  
                  {/* Directional Arrow if heading is available */}
                  {driver.heading !== undefined && (
                    <div 
                      className="absolute -top-1 -right-1 bg-white p-1 rounded-full shadow-lg text-neutral-900 border border-neutral-100"
                      style={{ transform: `rotate(${driver.heading}deg)` }}
                    >
                      <Navigation size={10} fill="currentColor" />
                    </div>
                  )}
               </div>

               {/* Pulse effect for better visibility */}
               <div className="absolute inset-0 bg-emerald-500 rounded-2xl animate-ping -z-10 opacity-20" />
            </div>
          </AdvancedMarker>
        ))}

        {selectedDriver && (
          <InfoWindow
            position={{ lat: selectedDriver.latitude!, lng: selectedDriver.longitude! }}
            onCloseClick={() => setSelectedDriver(null)}
            headerContent={<div className="text-[10px] font-black uppercase tracking-widest">Driver Details</div>}
          >
            <div className="p-2 min-w-[220px]">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center overflow-hidden border border-neutral-200">
                    {selectedDriver.avatarUrl ? (
                      <img src={selectedDriver.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={28} className="text-neutral-300" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-neutral-900 uppercase leading-none">{selectedDriver.name}</h4>
                    <p className="text-[10px] font-bold text-neutral-400 mt-2 uppercase tracking-widest">{selectedDriver.vehicleNumber}</p>
                    <p className="text-[9px] font-black text-primary mt-1 uppercase bg-primary/5 px-2 py-0.5 rounded-full inline-block">{selectedDriver.rideType || 'Standard'}</p>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-neutral-50 p-2.5 rounded-2xl border border-neutral-100">
                    <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1.5">Completed</p>
                    <p className="text-sm font-black text-neutral-900">{selectedDriver.completedRides} Rides</p>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-100">
                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1.5">Earnings</p>
                    <p className="text-sm font-black text-emerald-600">₹{selectedDriver.totalEarnings}</p>
                  </div>
               </div>

               <div className="flex justify-between items-center text-[10px] bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                  <span className="text-neutral-400 font-bold uppercase tracking-widest">DRIVE STATUS</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200" />
                    <span className="text-emerald-500 font-black uppercase tracking-widest">ONLINE</span>
                  </div>
               </div>
               
               <div className="mt-4 flex gap-2">
                  <a 
                    href={`tel:${selectedDriver.phone}`}
                    className="flex-1 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    Contact Driver
                  </a>
               </div>

               <p className="text-[8px] text-neutral-400 text-center pt-3 mt-3 border-t border-neutral-100 italic font-medium">
                 GPS Last Seen: {selectedDriver.lastSeen ? new Date(selectedDriver.lastSeen).toLocaleTimeString() : 'Active Now'}
               </p>
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
