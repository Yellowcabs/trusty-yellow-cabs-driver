import React, { useState, useEffect } from 'react';
import { Plus, Users, Car, BarChart3, Settings, ShieldCheck, Mail, Phone, MoreVertical, Search, CheckCircle2, Clock, X, Navigation, MapPin, IndianRupee, KeyRound, Star, Trash2, RefreshCw, TrendingUp, ChevronRight, AlertCircle, User } from 'lucide-react';
import { GoogleAutocomplete } from '../components/GoogleAutocomplete';
import { cn } from '../lib/utils';
import { useTrips } from '../context/TripContext';
import { motion, AnimatePresence } from 'motion/react';
import { fetchDrivers, createDriverApi, uploadDriverPhoto, updateDriverBlockedStatus, updateOfficeFeeApi } from '../services/api';
import { Driver } from '../types';
import { LiveMap } from '../components/LiveMap';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'trips' | 'drivers' | 'reports' | 'cancelled' | 'live'>('trips');
  const [tripFilter, setTripFilter] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const [isCancellingTrip, setIsCancellingTrip] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);
  const [tripError, setTripError] = useState<string | null>(null);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const { allTrips, createTrip, cancelTrip, updateTripFare, refreshTrips } = useTrips();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [totalOnlineDrivers, setTotalOnlineDrivers] = useState(0);

  const loadDrivers = async (search?: string) => {
    try {
      const data = await fetchDrivers({ search, limit: search ? 50 : 100 });
      setDrivers(data);
      
      // If we are not searching, we can update the online count from the first 100
      if (!search) {
        setTotalOnlineDrivers(data.filter(d => d.isOnline).length);
      }
    } catch (e) {
      console.error('Error loading drivers:', e);
    }
  };

  const handleToggleBlock = async (driverId: string, currentStatus: boolean) => {
    const success = await updateDriverBlockedStatus(driverId, !currentStatus);
    if (success) {
      loadDrivers(driverSearchQuery);
    } else {
      setDriverError("Failed to update block status");
    }
  };

  const handleUpdateOfficeFee = async (driverId: string, amount: number) => {
    const success = await updateOfficeFeeApi(driverId, amount);
    if (success) {
      loadDrivers(driverSearchQuery);
    } else {
      setDriverError("Failed to update office fee");
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadDrivers(driverSearchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [driverSearchQuery]);

  // Polling for live locations when on map tab or trips tab
  useEffect(() => {
    const interval = setInterval(() => {
      // Only poll when the window is focused and tab is relevant
      if (document.visibilityState === 'visible' && (activeTab === 'live' || activeTab === 'trips')) {
        loadDrivers(driverSearchQuery);
      }
    }, 8000); // Increased frequency to 8 seconds for real-time tracking

    return () => clearInterval(interval);
  }, [activeTab, driverSearchQuery]);

  const filteredTrips = allTrips.filter(t => {
    // Exclude cancelled from main trips view unless we are in the cancelled tab
    if (activeTab === 'trips' && t.status === 'CANCELLED' && tripFilter !== 'CANCELLED') return false;
    
    if (tripFilter === 'ALL') return true;
    return t.status === tripFilter;
  });

  // Trip Form State
  const [pickup, setPickup] = useState('');
  const [pickupLat, setPickupLat] = useState<number | undefined>();
  const [pickupLng, setPickupLng] = useState<number | undefined>();
  const [drop, setDrop] = useState('');
  const [dropLat, setDropLat] = useState<number | undefined>();
  const [dropLng, setDropLng] = useState<number | undefined>();
  const [customerName, setCustomerName] = useState('Valued Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [fare, setFare] = useState('');
  const [baseFare, setBaseFare] = useState('');
  const [kmsFare, setKmsFare] = useState('');
  const [rideType, setRideType] = useState('mini/sedan');
  const [targetLocationOnly, setTargetLocationOnly] = useState(false);
  const [targetRadius, setTargetRadius] = useState('5');
  const [editingFare, setEditingFare] = useState<string | null>(null);
  const [newFareValue, setNewFareValue] = useState('');

  // Driver Form State
  const [dId, setDId] = useState('');
  const [dName, setDName] = useState('');
  const [dPhone, setDPhone] = useState('');
  const [dPin, setDPin] = useState('');
  const [dVModel, setDVModel] = useState('');
  const [dVNumber, setDVNumber] = useState('');
  const [dAvatarUrl, setDAvatarUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshTrips(), loadDrivers(driverSearchQuery)]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleUpdateFare = async (tripId: string) => {
    if (!newFareValue) return;
    const result = await updateTripFare(tripId, Number(newFareValue));
    if (result.success) {
      setEditingFare(null);
      setNewFareValue('');
    } else {
      setTripError(result.error || 'Failed to update fare');
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingTrip(true);
    setTripError(null);

    const result = await createTrip({
      pickup,
      pickupLat,
      pickupLng,
      drop,
      dropLat,
      dropLng,
      customerName,
      customerPhone,
      fare: fare ? Number(fare) : 0,
      distance: 'Live Calculation',
      rideType,
      targetLocationOnly,
      targetRadius: Number(targetRadius),
      // Metadata for special calculation if needed later
      ...(baseFare && { baseFare: Number(baseFare) }),
      ...(kmsFare && { kmsFare: Number(kmsFare) })
    } as any);
    
    setIsAddingTrip(false);
    
    if (result.success) {
      setShowCreateModal(false);
      setPickup(''); setDrop(''); setCustomerName('Valued Customer'); setCustomerPhone(''); setFare('');
      setBaseFare(''); setKmsFare(''); setTargetLocationOnly(false); setTargetRadius('5');
      setPickupLat(undefined); setPickupLng(undefined);
      setDropLat(undefined); setDropLng(undefined);
    } else {
      setTripError(result.error || 'Failed to create trip. Please check your connection.');
    }
  };

  const handleCancelTrip = async (tripId: string) => {
    // We'll proceed with cancellation directly for now to ensure it works in iframes 
    // where confirm() might be blocked, or we could add a custom modal later.
    setIsCancellingTrip(tripId);
    setTripError(null);

    const result = await cancelTrip(tripId);
    setIsCancellingTrip(null);
    
    if (!result.success) {
      setTripError(result.error || 'Failed to cancel trip. Check database permissions.');
      // Auto clear error after 3 seconds
      setTimeout(() => setTripError(null), 3000);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingDriver(true);
    setDriverError(null);
    
    let avatarUrl = dAvatarUrl;
    
    if (selectedFile) {
      setIsUploading(true);
      const uploadedUrl = await uploadDriverPhoto(selectedFile, dId || 'temp');
      setIsUploading(false);
      if (uploadedUrl) {
        avatarUrl = uploadedUrl;
      } else {
        setDriverError('Failed to upload photo. Ensure "avatars" bucket exists in Supabase.');
        setIsAddingDriver(false);
        return;
      }
    }
    
    const result = await createDriverApi({
      id: dId || 'D' + Math.floor(Math.random() * 9000 + 1000),
      name: dName,
      phone: dPhone,
      pin: dPin,
      vehicleModel: dVModel,
      vehicleNumber: dVNumber,
      avatarUrl: avatarUrl
    });
    
    setIsAddingDriver(false);
    if (result.success) {
      setShowDriverModal(false);
      loadDrivers();
      setDId(''); setDName(''); setDPhone(''); setDPin(''); setDVModel(''); setDVNumber(''); setDAvatarUrl('');
      setSelectedFile(null);
    } else {
      setDriverError(result.error || 'Failed to add driver. Please check for duplicate ID/Phone.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <header className="bg-neutral-900 pt-16 pb-20 px-4 sm:px-6 rounded-b-[40px] text-white overflow-hidden relative transition-all duration-500">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3 relative z-10 mb-8 px-2">
          <button 
            onClick={() => window.history.back()}
            className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl backdrop-blur-md active:scale-90"
          >
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Admin</h1>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Management Suite</p>
          </div>
          <div className="flex-1" />
          <button 
            onClick={handleRefresh}
            className={cn(
              "bg-white/10 w-12 h-12 flex items-center justify-center rounded-2xl backdrop-blur-md transition-all active:scale-90",
              isRefreshing && "animate-spin"
            )}
          >
            <RefreshCw size={20} />
          </button>
        </div>

        <div className="flex gap-2 relative z-10 overflow-x-auto no-scrollbar px-2 pb-2">
           <button 
             onClick={() => setActiveTab('trips')}
             className={cn(
               "flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all whitespace-nowrap border-2",
               activeTab === 'trips' ? "bg-white text-neutral-900 border-white shadow-xl" : "bg-white/5 text-white/50 border-white/5"
             )}
           >
             <Car size={20} className="text-primary" /> Trips
           </button>
           <button 
             onClick={() => setActiveTab('drivers')}
             className={cn(
               "flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all whitespace-nowrap border-2",
               activeTab === 'drivers' ? "bg-white text-neutral-900 border-white shadow-xl" : "bg-white/5 text-white/50 border-white/5"
             )}
           >
             <Users size={18} /> Drivers
           </button>
           <button 
             onClick={() => setActiveTab('cancelled')}
             className={cn(
               "flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all whitespace-nowrap border-2",
               activeTab === 'cancelled' ? "bg-white text-neutral-900 border-white shadow-xl" : "bg-white/5 text-white/50 border-white/5"
             )}
           >
             <X size={18} /> Cancelled
           </button>
           <button 
             onClick={() => setActiveTab('live')}
             className={cn(
               "flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all whitespace-nowrap border-2",
               activeTab === 'live' ? "bg-white text-neutral-900 border-white shadow-xl" : "bg-white/5 text-white/50 border-white/5"
             )}
           >
             <Navigation size={18} className="text-secondary rotate-45" /> Live Map
           </button>
           <button 
             onClick={() => setActiveTab('reports')}
             className={cn(
               "flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all whitespace-nowrap border-2",
               activeTab === 'reports' ? "bg-white text-neutral-900 border-white shadow-xl" : "bg-white/5 text-white/50 border-white/5"
             )}
           >
             <BarChart3 size={18} /> Reports
           </button>
        </div>
      </header>

      <main className="px-4 -mt-10 relative z-20 space-y-6">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
           <button 
             onClick={() => { setActiveTab('trips'); setTripFilter('ALL'); }}
             className={cn(
               "flex-shrink-0 w-[180px] sm:w-auto sm:flex-1 glass-card p-5 flex items-center gap-4 text-left transition-all border-none", 
               tripFilter === 'ALL' && activeTab === 'trips' ? "bg-white shadow-xl ring-2 ring-primary/20" : "bg-white/60"
             )}
           >
               <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary flex-shrink-0">
                 <Car size={24} />
               </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest truncate">Live Trips</p>
                <p className="text-3xl font-black text-neutral-900 leading-none mt-1">{allTrips.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}</p>
              </div>
           </button>
           <button 
             onClick={() => setActiveTab('drivers')}
             className={cn(
               "flex-shrink-0 w-[180px] sm:w-auto sm:flex-1 glass-card p-5 flex items-center gap-4 text-left transition-all border-none", 
               activeTab === 'drivers' ? "bg-white shadow-xl ring-2 ring-emerald-500/20" : "bg-white/60"
             )}
           >
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                 <Users size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest truncate">Drivers</p>
                <p className="text-3xl font-black text-neutral-900 leading-none mt-1">{totalOnlineDrivers}</p>
              </div>
           </button>
           <button 
             onClick={() => { setActiveTab('trips'); setTripFilter('PENDING'); }}
             className={cn(
               "flex-shrink-0 w-[180px] sm:w-auto sm:flex-1 glass-card p-5 flex items-center gap-4 text-left transition-all border-none", 
               tripFilter === 'PENDING' && activeTab === 'trips' ? "bg-white shadow-xl ring-2 ring-amber-500/20" : "bg-white/60"
             )}
           >
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 flex-shrink-0">
                 <ShieldCheck size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest truncate">Pending</p>
                <p className="text-3xl font-black text-neutral-900 leading-none mt-1">{allTrips.filter(t => t.status === 'PENDING').length}</p>
              </div>
           </button>
        </div>

        {activeTab === 'trips' && (
          <div className="space-y-4 sm:space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div className="flex flex-col">
                 <h2 className="text-2xl font-black">{tripFilter === 'ALL' ? 'Live Trip Monitor' : `${tripFilter} Trips`}</h2>
                 {tripError && <p className="text-red-500 text-[10px] font-bold animate-pulse">{tripError}</p>}
               </div>
               <div className="flex items-center gap-2 w-full sm:w-auto">
                 {tripFilter !== 'ALL' && (
                   <button 
                     onClick={() => setTripFilter('ALL')}
                     className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-3 sm:py-2 rounded-xl hover:bg-primary/20 flex-1 sm:flex-none"
                   >
                     CLEAR FILTER
                   </button>
                 )}
                 <button 
                   onClick={() => setShowCreateModal(true)}
                   className="bg-primary text-white px-5 sm:px-6 py-4 sm:py-3 rounded-2xl font-bold flex items-center justify-center gap-2 premium-shadow hover:bg-primary-dark transition-colors flex-1 sm:flex-none"
                 >
                   <Plus size={20} /> CREATE NEW TRIP
                 </button>
               </div>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredTrips.length === 0 ? (
                  <div className="col-span-full text-center py-20 glass-card text-neutral-400 font-bold border-dashed border-2">
                    {tripFilter === 'ALL' ? 'No trips found' : `No ${tripFilter} trips found`}
                  </div>
                ) : (
                  filteredTrips.map((trip) => {
                    const assignedDriver = trip.driverId ? drivers.find(d => d.id === trip.driverId) : null;
                    return (
                      <div key={trip.id} className="glass-card p-6 hover:shadow-2xl transition-all border-none ring-1 ring-neutral-100 flex flex-col gap-5">
                        {/* Header: ID and Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] bg-neutral-900 text-white px-2 py-1 rounded font-black tracking-widest uppercase">ID: {trip.id}</span>
                             <span className="text-[10px] text-neutral-400 font-bold">{new Date(trip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            trip.status === 'PENDING' ? "bg-amber-100 text-amber-600" :
                            trip.status === 'ACCEPTED' ? "bg-blue-100 text-blue-600" :
                            trip.status === 'STARTED' ? "bg-primary text-white" :
                            "bg-neutral-100 text-neutral-500"
                          )}>
                            {trip.status}
                          </div>
                        </div>

                        {/* Customer & Call Section */}
                        <div className="bg-neutral-50 rounded-2xl p-4 flex items-center justify-between border border-neutral-100">
                           <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary border border-neutral-100">
                                <User size={24} />
                              </div>
                              <div>
                                 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">CUSTOMER</p>
                                 <p className="text-base font-black text-neutral-900 mt-1">{trip.customerName}</p>
                                 <p className="text-xs font-bold text-neutral-500">{trip.customerPhone}</p>
                              </div>
                           </div>
                           <a 
                             href={`tel:${trip.customerPhone}`}
                             className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-black text-xs hover:bg-emerald-600 active:scale-95 transition-all shadow-md shadow-emerald-200"
                           >
                              <Phone size={14} fill="currentColor" /> CALL
                           </a>
                        </div>

                        {/* Locations */}
                        <div className="space-y-4 px-2">
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center gap-1 mt-1">
                              <div className="w-2.5 h-2.5 rounded-full border-2 border-primary" />
                              <div className="w-0.5 flex-1 bg-neutral-200 rounded-full" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">PICKUP</p>
                              <p className="text-sm font-bold text-neutral-700 leading-snug">{trip.pickup}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center gap-1 mt-1">
                              <div className="w-2.5 h-2.5 bg-primary rounded-sm" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">DROP</p>
                              <p className="text-sm font-bold text-neutral-700 leading-snug">{trip.drop}</p>
                            </div>
                          </div>
                        </div>

                         {/* Fare and Vehicle Info */}
                        <div className="grid grid-cols-2 gap-4 mt-2">
                           <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 relative group/fare">
                              <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-1">FARE DETAILS</p>
                              {editingFare === trip.id ? (
                                <div className="flex flex-col gap-2">
                                  <input 
                                    type="number"
                                    value={newFareValue}
                                    onChange={(e) => setNewFareValue(e.target.value)}
                                    className="w-full bg-white border border-primary/20 rounded-lg px-2 py-1 text-sm font-black text-primary outline-none"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => handleUpdateFare(trip.id)}
                                      className="flex-1 bg-primary text-white text-[9px] font-black py-1 rounded-lg uppercase"
                                    >
                                      Save
                                    </button>
                                    <button 
                                      onClick={() => { setEditingFare(null); setNewFareValue(''); }}
                                      className="flex-1 bg-neutral-200 text-neutral-500 text-[9px] font-black py-1 rounded-lg uppercase"
                                    >
                                      X
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between">
                                    {trip.fare > 0 ? (
                                      <p className="text-2xl font-black text-primary leading-none">₹{trip.fare}</p>
                                    ) : (trip.baseFare || trip.kmsFare) ? (
                                      <div className="space-y-0.5">
                                        {trip.baseFare && <p className="text-sm font-black text-primary leading-none">Base: ₹{trip.baseFare}</p>}
                                        {trip.kmsFare && <p className="text-sm font-black text-primary leading-none">Rate: ₹{trip.kmsFare}/km</p>}
                                      </div>
                                    ) : (
                                      <p className="text-2xl font-black text-primary leading-none">₹0</p>
                                    )}
                                    <button 
                                      onClick={() => { setEditingFare(trip.id); setNewFareValue(trip.fare.toString()); }}
                                      className="opacity-0 group-hover/fare:opacity-100 transition-opacity p-1.5 bg-primary/20 text-primary rounded-lg"
                                    >
                                      <Settings size={12} />
                                    </button>
                                  </div>
                                  <p className="text-[10px] font-bold text-primary/60 mt-1 uppercase leading-none">{trip.rideType}</p>
                                </>
                              )}
                           </div>

                           <div className="bg-neutral-900 text-white rounded-2xl p-4">
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">DRIVER INFO</p>
                              {assignedDriver ? (
                                <div>
                                   <p className="text-sm font-black truncate">{assignedDriver.name}</p>
                                   <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[9px] bg-white/10 px-1 py-0.5 rounded font-mono font-bold leading-none">{assignedDriver.id}</span>
                                      <span className="text-[9px] text-white/60 font-medium truncate">{assignedDriver.vehicleNumber}</span>
                                   </div>
                                </div>
                              ) : (
                                <p className="text-xs font-bold text-white/40 italic">Waiting for assignment...</p>
                              )}
                           </div>
                        </div>

                        {/* Actions and Footer Alerts */}
                        <div className="flex items-center gap-2">
                          <button 
                            disabled={isCancellingTrip === trip.id || trip.status === 'CANCELLED'}
                            onClick={() => handleCancelTrip(trip.id)}
                            className={cn(
                              "flex-1 h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95",
                              trip.status === 'CANCELLED' 
                                ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" 
                                : "bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white"
                            )}
                          >
                             {isCancellingTrip === trip.id ? (
                               <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                             ) : (
                               <><Trash2 size={16} /> CANCEL TRIP</>
                             )}
                          </button>
                        </div>

                        {trip.releasedBy && trip.releasedBy.length > 0 && (
                          <div className="p-4 bg-red-50 rounded-2xl border border-red-100 border-dashed">
                             <p className="text-[10px] font-black text-red-600 flex items-center gap-1 mb-2 uppercase tracking-tight">
                               <AlertCircle size={12} /> {trip.releasedBy.length} TIMES RELEASED BY DRIVERS
                             </p>
                             <div className="flex flex-col gap-2">
                                {trip.releasedBy.map((r, idx) => {
                                  const d = drivers.find(drv => drv.id === r.driverId);
                                  return (
                                    <div key={idx} className="bg-white/50 p-3 rounded-xl border border-red-100/50 flex items-center justify-between gap-4">
                                       <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                             <p className="text-[11px] font-black text-neutral-900">{d?.name || 'Unknown'}</p>
                                             <span className="text-[8px] bg-neutral-100 px-1 py-0.5 rounded font-mono font-bold">{r.driverId}</span>
                                          </div>
                                          <p className="text-[10px] text-neutral-500 italic mt-0.5 line-clamp-1" title={r.reason}>"{r.reason}"</p>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-[9px] font-black text-red-500">{d?.vehicleNumber}</p>
                                          <p className="text-[8px] text-neutral-400 font-bold">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                       </div>
                                    </div>
                                  );
                                })}
                             </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        )}

        {activeTab === 'cancelled' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
               <div className="flex flex-col">
                 <h2 className="text-2xl font-black">History (Cancelled)</h2>
                 <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">Trips that were manually cancelled</p>
               </div>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {allTrips.filter(t => t.status === 'CANCELLED').length === 0 ? (
                  <div className="col-span-full text-center py-20 glass-card text-neutral-400 font-bold border-dashed border-2">No cancelled trips found</div>
                ) : (
                  allTrips.filter(t => t.status === 'CANCELLED').map((trip) => {
                    const assignedDriver = trip.driverId ? drivers.find(d => d.id === trip.driverId) : null;
                    return (
                      <div key={trip.id} className="glass-card p-5 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 items-center">
                              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                                <X size={24} />
                              </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <p className="text-base font-black">{trip.customerName}</p>
                                     <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded font-mono font-bold leading-none">{trip.id}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                    <span className="truncate max-w-[120px]">{trip.pickup.split(',')[0]}</span>
                                    <span>→</span>
                                    <span className="truncate max-w-[120px]">{trip.drop.split(',')[0]}</span>
                                </div>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-600">
                                {trip.status}
                              </div>
                              <p className="text-lg font-black mt-1 text-primary leading-none">₹{trip.fare}</p>
                          </div>
                        </div>

                        {assignedDriver && (
                          <div className="bg-neutral-50 rounded-2xl p-4 flex items-center justify-between border border-neutral-100">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center overflow-hidden">
                                  {assignedDriver.avatarUrl ? (
                                    <img src={assignedDriver.avatarUrl} alt="Driver" className="w-full h-full object-cover" />
                                  ) : (
                                    <User size={20} className="text-neutral-400" />
                                  )}
                                </div>
                                <div>
                                   <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">LAST ASSIGNED</p>
                                   <div className="flex items-center gap-2 mt-1">
                                      <p className="text-sm font-black text-neutral-900">{assignedDriver.name}</p>
                                   </div>
                                </div>
                             </div>
                             <p className="text-[10px] font-bold text-neutral-400">Cancelled</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div className="flex-1 w-full">
                  <h2 className="text-2xl font-black">Driver Fleet</h2>
                  <div className="mt-4 relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors">
                      <Search size={18} />
                    </div>
                    <input 
                      type="text"
                      placeholder="Search Driver ID or Vehicle Number..."
                      value={driverSearchQuery}
                      onChange={(e) => setDriverSearchQuery(e.target.value)}
                      className="w-full bg-white border-2 border-neutral-100 py-4 pl-12 pr-4 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all shadow-sm"
                    />
                  </div>
               </div>
               <button 
                 onClick={() => setShowDriverModal(true)}
                 className="bg-neutral-900 text-white px-6 py-4 sm:py-3 rounded-2xl font-bold flex items-center justify-center gap-2 premium-shadow active:scale-95 transition-all w-full sm:w-auto sm:mt-10"
                >
                 <Plus size={20} /> ADD NEW DRIVER
               </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivers.length === 0 ? (
                  <div className="col-span-full text-center py-20 glass-card text-neutral-400 font-bold border-dashed border-2">
                    No drivers found matching your search.
                  </div>
                ) : (
                  drivers.map((driver) => (
                      <div key={driver.id} className={cn(
                        "glass-card p-6 relative overflow-hidden group transition-all duration-300 hover:shadow-xl border-none ring-1 ring-neutral-100",
                        driver.isBlocked && "bg-red-50/30 ring-red-100 opacity-90"
                      )}>
                         {/* Status Badge Top Left */}
                         <div className="absolute top-0 left-0">
                            <div className={cn(
                              "px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-br-xl shadow-sm",
                              driver.isBlocked ? "bg-red-500 text-white" : (driver.isOnline ? "bg-emerald-500 text-white" : "bg-neutral-400 text-white")
                            )}>
                              {driver.isBlocked ? 'Blocked' : (driver.isOnline ? 'Online' : 'Offline')}
                            </div>
                         </div>

                         {/* Rating Top Right */}
                         <div className="absolute top-3 right-3">
                            <div className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black flex items-center gap-1 border border-amber-100 shadow-sm">
                               <Star size={10} fill="currentColor" /> {(driver.rating || 4.9).toFixed(1)}
                            </div>
                         </div>

                         <div className="flex gap-5 items-start mt-4">
                            <div className="relative">
                               <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center border-2 border-white shadow-md overflow-hidden flex-shrink-0">
                                  {driver.avatarUrl ? (
                                    <img src={driver.avatarUrl} alt={driver.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <User size={32} className="text-neutral-300" />
                                  )}
                               </div>
                               {driver.isOnline && !driver.isBlocked && (
                                 <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                               )}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex flex-col">
                                  <h3 className="text-lg font-black text-neutral-900 truncate pr-12">{driver.name}</h3>
                                  <div className="flex items-center gap-2 mt-0.5">
                                     <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-mono font-black border border-neutral-200">{driver.id}</span>
                                  </div>
                               </div>
                            </div>
                         </div>
                         
                         <div className="mt-6 pt-5 border-t border-dashed border-neutral-100 grid grid-cols-2 gap-6">
                            <div>
                               <div className="flex items-center gap-1.5 mb-1">
                                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.1em]">Vehicle Detail</p>
                               </div>
                               <p className="text-sm font-black text-neutral-800">{driver.vehicleNumber}</p>
                            </div>
                            <div className="text-right">
                               <div className="flex items-center justify-end gap-1.5 mb-1">
                                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.1em]">Contact Info</p>
                                  <div className="w-1.5 h-1.5 bg-emerald-400/40 rounded-full" />
                               </div>
                               <a 
                                 href={`tel:${driver.phone}`}
                                 className="inline-flex items-center gap-2 text-sm font-black text-neutral-800 hover:text-emerald-600 transition-colors"
                               >
                                 {driver.phone}
                                 <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shadow-sm border border-emerald-100">
                                   <Phone size={10} strokeWidth={3} />
                                 </div>
                               </a>
                            </div>
                         </div>

                         <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="bg-neutral-50/50 p-3 rounded-2xl border border-neutral-100">
                               <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none">Rides Done</p>
                               <p className="text-base font-black text-neutral-900 mt-1">{driver.completedRides}</p>
                            </div>
                            <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 text-right">
                               <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">Earnings</p>
                               <p className="text-base font-black text-emerald-600 mt-1">₹{driver.totalEarnings}</p>
                            </div>
                         </div>

                         {/* Office Fee Section */}
                         <div className="mt-4 pt-4 border-t border-neutral-100">
                            <div className="flex items-center justify-between mb-2">
                               <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Office / Convenience Fee</p>
                               <span className={cn(
                                 "text-[10px] font-black px-2 py-0.5 rounded-full",
                                 (driver.officeFee || 0) > 0 ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-400"
                               )}>
                                 ₹{driver.officeFee || 0} PENDING
                               </span>
                            </div>
                            <div className="flex gap-2">
                               <div className="relative flex-1">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">₹</span>
                                  <input 
                                    type="number"
                                    defaultValue={driver.officeFee}
                                    onBlur={(e) => {
                                       const val = Number(e.target.value);
                                       if (val !== driver.officeFee) {
                                          handleUpdateOfficeFee(driver.id, val);
                                       }
                                    }}
                                    className="w-full bg-neutral-50 border border-neutral-100 pl-6 pr-3 py-2 rounded-xl text-xs font-bold focus:border-primary outline-none"
                                    placeholder="Enter Fee..."
                                  />
                               </div>
                               <button 
                                 onClick={(e) => {
                                    const input = e.currentTarget.previousSibling?.lastChild as HTMLInputElement;
                                    handleUpdateOfficeFee(driver.id, Number(input.value));
                                 }}
                                 className="px-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all shadow-sm"
                               >
                                 Update
                               </button>
                            </div>
                         </div>

                         {/* Dedicated Actions Row */}
                         <div className="mt-5 pt-5 border-t border-neutral-100 flex gap-3">
                            <button 
                              onClick={() => handleToggleBlock(driver.id, !!driver.isBlocked)}
                              className={cn(
                                "flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm border",
                                driver.isBlocked 
                                  ? "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50" 
                                  : "bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:text-white"
                              )}
                            >
                               {driver.isBlocked ? (
                                 <><CheckCircle2 size={16} /> UNBLOCK DRIVER</>
                               ) : (
                                 <><AlertCircle size={16} /> BLOCK DRIVER</>
                               )}
                            </button>
                         </div>
                      </div>
                  ))
                )}
             </div>
          </div>
        )}
        {activeTab === 'live' && (
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <h2 className="text-2xl font-black">Live Fleet Tracking</h2>
                 <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">
                   Auto-refresh: 15s
                 </p>
              </div>
              <LiveMap drivers={drivers} />
           </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
               <div className="flex flex-col">
                 <h2 className="text-2xl font-black">Business Intelligence</h2>
                 <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">Live Activity & Daily Performance</p>
               </div>
               <div className="p-3 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                  Real-Time Pulse
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-6 bg-emerald-50/50 border-emerald-100 ring-emerald-50/50">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Revenue</p>
                   <p className="text-3xl font-black text-neutral-900 mt-1">₹{allTrips.filter(t => t.status === 'COMPLETED').reduce((acc, curr) => acc + curr.fare, 0)}</p>
                   <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                      <TrendingUp size={12} /> Live aggregated total
                   </div>
                </div>
                <div className="glass-card p-6 bg-blue-50/50 border-blue-100 ring-blue-50/50">
                   <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Completed Rides</p>
                   <p className="text-3xl font-black text-neutral-900 mt-1">{allTrips.filter(t => t.status === 'COMPLETED').length}</p>
                   <div className="text-[10px] font-bold text-blue-400 mt-2 uppercase">Successful deliveries</div>
                </div>
                <div className="glass-card p-6 bg-primary/5 border-primary/10 ring-primary/5">
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest">Avg. Ticket Size</p>
                   <p className="text-3xl font-black text-neutral-900 mt-1">₹{allTrips.length > 0 ? Math.round(allTrips.reduce((acc, curr) => acc + curr.fare, 0) / allTrips.length) : 0}</p>
                   <div className="text-[10px] font-bold text-primary/40 mt-2 uppercase">Per booking average</div>
                </div>
                <div className="glass-card p-6 bg-red-50/50 border-red-100 ring-red-50/50">
                   <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Trip Releases</p>
                   <p className="text-3xl font-black text-red-600 mt-1">{allTrips.reduce((acc, curr) => acc + (curr.releasedBy?.length || 0), 0)}</p>
                   <div className="text-[10px] font-bold text-red-400 mt-2 uppercase">Driver cancellations</div>
                </div>
             </div>

             <div className="glass-card p-8 border-none ring-1 ring-neutral-100 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <h3 className="text-lg font-black">Daily Performance (Last 7 Days)</h3>
                      <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">Unit volume per day</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-primary rounded-full shadow-sm shadow-primary/20" />
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Bookings</span>
                      </div>
                   </div>
                </div>
                
                <div className="h-64 flex items-end gap-3 sm:gap-6 overflow-hidden px-2">
                   {[65, 45, 80, 55, 95, 75, 40].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end gap-3 group">
                         <div className="relative h-full flex flex-col justify-end">
                            <div 
                              style={{ height: `${h}%` }} 
                              className="bg-primary/20 rounded-2xl group-hover:bg-primary transition-all duration-500 relative"
                            >
                               <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl whitespace-nowrap scale-50 group-hover:scale-100">
                                  {Math.round(h * 1.5)} TRIPS
                               </div>
                               <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl" />
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
                <div className="flex justify-between mt-6 px-1">
                   {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <span key={day} className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{day}</span>
                   ))}
                </div>
             </div>

             {/* Efficiency Metrics */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-6 flex flex-col gap-6">
                   <h3 className="text-base font-black uppercase tracking-tight">Driver Efficiency</h3>
                   <div className="space-y-4">
                      {drivers.slice(0, 3).map((d, i) => (
                        <div key={d.id} className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center font-black text-sm text-neutral-400 border border-neutral-200">
                              #{i+1}
                           </div>
                           <div className="flex-1">
                              <div className="flex justify-between items-end mb-1">
                                 <p className="text-xs font-black text-neutral-800">{d.name}</p>
                                 <p className="text-[10px] font-black text-emerald-500">₹{d.totalEarnings}</p>
                              </div>
                              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (d.completedRides / 20) * 100)}%` }}
                                    className="h-full bg-emerald-500 rounded-full"
                                 />
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="glass-card p-6 flex flex-col gap-6">
                   <h3 className="text-base font-black uppercase tracking-tight">Cancellation Analytics</h3>
                   <div className="flex items-center justify-center h-full py-4">
                      <div className="text-center">
                         <p className="text-4xl font-black text-red-500">{allTrips.filter(t => t.status === 'CANCELLED').length}</p>
                         <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">Total Cancelled Records</p>
                         <div className="mt-4 inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black">
                            <AlertCircle size={14} /> Attention required
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Driver Creation Modal */}
      <AnimatePresence>
        {showDriverModal && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDriverModal(false)}
              className="absolute inset-0 bg-neutral-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] p-8 relative z-10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                 <div>
                    <h2 className="text-2xl font-black text-neutral-900">New Driver</h2>
                    <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">Onboard a new partner</p>
                 </div>
                 <button 
                  onClick={() => { setShowDriverModal(false); setDriverError(null); }} 
                  className="p-3 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-colors"
                >
                    <X size={20} />
                 </button>
              </div>

              {driverError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold relative z-10">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                   {driverError}
                </div>
              )}

              <form onSubmit={handleCreateDriver} className="space-y-4 relative z-10">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Driver ID</label>
                       <input 
                          type="text" required value={dId} onChange={e => setDId(e.target.value)}
                          placeholder="e.g. D1001" 
                          className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Full Name</label>
                       <input 
                          type="text" required value={dName} onChange={e => setDName(e.target.value)}
                          placeholder="Driver Full Name" 
                          className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Phone (User ID)</label>
                       <div className="relative">
                          <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                          <input 
                             type="tel" required value={dPhone} onChange={e => setDPhone(e.target.value)}
                             placeholder="Phone Number" 
                             className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-12 pr-4 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                          />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Login PIN</label>
                       <div className="relative">
                          <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                          <input 
                             type="password" required value={dPin} onChange={e => setDPin(e.target.value)}
                             placeholder="****" 
                             className="w-full bg-neutral-50 border border-neutral-100 py-4 pl-12 pr-4 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Vehicle Model</label>
                       <input 
                          type="text" required value={dVModel} onChange={e => setDVModel(e.target.value)}
                          placeholder="e.g. Maruti Ciaz" 
                          className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Vehicle Number</label>
                       <input 
                          type="text" required value={dVNumber} onChange={e => setDVNumber(e.target.value)}
                          placeholder="e.g. TN 01 AB 1234" 
                          className="w-full bg-neutral-50 border border-neutral-100 p-4 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                       />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Driver Photo</label>
                    <div className="flex items-center gap-4">
                       <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-neutral-200">
                          {selectedFile ? (
                             <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-full object-cover" />
                          ) : dAvatarUrl ? (
                             <img src={dAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                             <User size={32} className="text-neutral-300" />
                          )}
                       </div>
                       <div className="flex-1 space-y-2">
                          <input 
                             type="file" 
                             accept="image/*"
                             onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                             className="hidden"
                             id="driver-photo-upload"
                          />
                          <label 
                             htmlFor="driver-photo-upload"
                             className="inline-block bg-white border border-neutral-200 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-neutral-50"
                          >
                             Choose Image
                          </label>
                          <p className="text-[9px] text-neutral-400 font-medium leading-none">Accepted formats: JPG, PNG, WEBP</p>
                       </div>
                    </div>
                 </div>

                 <button 
                   type="submit"
                   disabled={isAddingDriver || isUploading}
                   className={cn(
                     "w-full py-5 text-white rounded-3xl font-black text-lg shadow-xl active:scale-[0.98] transition-all mt-6",
                     isAddingDriver || isUploading ? "bg-neutral-400 cursor-not-allowed" : "bg-neutral-900"
                   )}
                 >
                    {isAddingDriver || isUploading ? (isUploading ? 'UPLOADING PHOTO...' : 'ONBOARDING...') : 'ONBOARD DRIVER'}
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Trip Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[40px] p-8 relative z-10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-8 relative z-10">
                 <div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Create Trip</h2>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">Manual dispatch entry</p>
                 </div>
                 <button 
                  onClick={() => { setShowCreateModal(false); setTripError(null); }} 
                  className="p-3 bg-neutral-100 rounded-2xl hover:bg-neutral-200 transition-colors"
                >
                    <X size={20} />
                 </button>
              </div>

              {tripError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold relative z-10">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                   {tripError}
                </div>
              )}

              <form onSubmit={handleCreateTrip} className="space-y-6 relative z-10">
                 {/* Customer Section */}
                 <div className="space-y-3">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-1">Customer Details</p>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-1">Name</label>
                          <input 
                             type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)}
                             placeholder="e.g. John Doe" 
                             className="w-full bg-neutral-50 border border-neutral-100 p-3.5 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                          />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-1">Phone</label>
                          <input 
                             type="tel" required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                             placeholder="+91..." 
                             className="w-full bg-neutral-50 border border-neutral-100 p-3.5 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                          />
                       </div>
                    </div>
                 </div>

                 {/* Locations Section */}
                 <div className="space-y-3">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-1">Route</p>
                    <div className="space-y-2">
                       <div className="space-y-1">
                          <GoogleAutocomplete 
                            onPlaceSelect={(place) => {
                              setPickup(place.formatted_address || place.name || '');
                              if (place.geometry?.location) {
                                setPickupLat(place.geometry.location.lat());
                                setPickupLng(place.geometry.location.lng());
                              }
                            }}
                            placeholder="Pickup Location..."
                            defaultValue={pickup}
                            className="w-full bg-neutral-50 border border-neutral-100 py-3.5 pl-12 pr-4 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                            icon={<MapPin size={18} className="text-primary" />}
                          />
                       </div>

                       <div className="space-y-1">
                          <GoogleAutocomplete 
                            onPlaceSelect={(place) => {
                              setDrop(place.formatted_address || place.name || '');
                              if (place.geometry?.location) {
                                setDropLat(place.geometry.location.lat());
                                setDropLng(place.geometry.location.lng());
                              }
                            }}
                            placeholder="Destination..."
                            defaultValue={drop}
                            className="w-full bg-neutral-50 border border-neutral-100 py-3.5 pl-12 pr-4 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                            icon={<Navigation size={18} className="text-neutral-900" />}
                          />
                       </div>
                    </div>
                 </div>

                 {/* Fare & Type Section */}
                 <div className="space-y-3">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-1">Fare & Vehicle</p>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-1">Total Fare (₹)</label>
                          <div className="relative">
                             <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                             <input 
                                type="number" value={fare} onChange={e => setFare(e.target.value)}
                                placeholder="0" 
                                className="w-full bg-neutral-50 border border-neutral-100 py-3.5 pl-10 pr-4 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                             />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-1">Vehicle Class</label>
                          <select 
                             value={rideType} onChange={e => setRideType(e.target.value)}
                             className="w-full bg-neutral-50 border border-neutral-100 p-3.5 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none appearance-none transition-all"
                          >
                             <option value="mini/sedan">Mini/Sedan</option>
                             <option value="sedan">Premium Sedan</option>
                             <option value="suv">SUV</option>
                             <option value="suv+">SUV Plus</option>
                             <option value="innova">Innova</option>
                             <option value="tempotravaller">Tempo Traveller</option>
                             <option value="urbania">Urbania</option>
                             <option value="touristbus">Tourist Bus</option>
                             <option value="coustom">Custom</option>
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-1">Base Fare (₹)</label>
                          <div className="relative">
                             <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                             <input 
                                type="number" value={baseFare} onChange={e => setBaseFare(e.target.value)}
                                placeholder="100" 
                                className="w-full bg-neutral-50 border border-neutral-100 py-3.5 pl-10 pr-4 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                             />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest ml-1">KMS Fare (₹/km)</label>
                          <div className="relative">
                             <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                             <input 
                                type="number" value={kmsFare} onChange={e => setKmsFare(e.target.value)}
                                placeholder="15" 
                                className="w-full bg-neutral-50 border border-neutral-100 py-3.5 pl-10 pr-4 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all"
                             />
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Dispatch Logic Section */}
                 <div className="space-y-3">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-1">Dispatch Mode</p>
                    <div className="flex flex-col gap-2">
                       <button 
                         type="button"
                         onClick={() => setTargetLocationOnly(!targetLocationOnly)}
                         className={cn(
                           "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border-2 transition-all flex items-center justify-center gap-3",
                           targetLocationOnly 
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                            : "bg-neutral-50 text-neutral-400 border-neutral-100 hover:border-neutral-200"
                         )}
                       >
                          {targetLocationOnly ? <MapPin size={14} /> : <BarChart3 size={14} />}
                          {targetLocationOnly ? 'Nearby Drivers Only' : 'Broadcast to All'}
                       </button>
                       
                       {targetLocationOnly && (
                         <motion.div 
                           initial={{ opacity: 0, y: -10 }} 
                           animate={{ opacity: 1, y: 0 }}
                           className="flex items-center gap-3 bg-primary/5 p-3 rounded-2xl border border-primary/10"
                         >
                            <label className="text-[9px] font-black text-primary uppercase tracking-widest whitespace-nowrap">Radius (KM):</label>
                            <input 
                              type="number"
                              value={targetRadius}
                              onChange={e => setTargetRadius(e.target.value)}
                              className="w-full bg-white border border-primary/20 rounded-xl px-3 py-1.5 text-xs font-black text-primary outline-none focus:ring-2 ring-primary/10"
                            />
                         </motion.div>
                       )}
                    </div>
                 </div>

                 <button 
                   type="submit"
                   disabled={isAddingTrip}
                   className={cn(
                     "w-full py-5 text-white rounded-3xl font-black text-lg premium-shadow active:scale-[0.98] transition-all mt-4",
                     isAddingTrip ? "bg-neutral-400 cursor-not-allowed" : "bg-neutral-900 shadow-xl"
                   )}
                 >
                    {isAddingTrip ? 'DEPATCHING...' : 'DISPATCH NOW'}
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
