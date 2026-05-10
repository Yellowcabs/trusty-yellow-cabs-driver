import React, { useState, useEffect } from 'react';
import { cn } from './lib/utils';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TripProvider, useTrips } from './context/TripContext';
import { LoginPage } from './pages/Login';
import { HomePage } from './pages/Home';
import { RequestsPage } from './pages/Requests';
import { AdminPage } from './pages/Admin';
import { HistoryPage } from './pages/History';
import { ProfilePage } from './pages/Profile';
import { OfficePayPage } from './pages/OfficePay';
import { BottomNav } from './components/BottomNav';
import { ActiveTripScreen } from './components/ActiveTripScreen';
import { LocationTracker } from './components/LocationTracker';
import { Car } from 'lucide-react';

import { APIProvider } from '@vis.gl/react-google-maps';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function Layout() {
  const location = useLocation();
  const { activeTrip } = useTrips();
  const hideNav = location.pathname === '/login';
  const isAdminPage = location.pathname === '/admin';

  return (
    <div className="min-h-screen bg-neutral-50 relative overflow-hidden flex flex-col md:flex-row">
      {!hideNav && <BottomNav />}
      
      <main className={cn(
        "flex-1 w-full transition-all duration-150",
        !hideNav && "md:ml-64 p-0"
      )}>
        <div className={cn(
          "mx-auto",
          hideNav ? "w-full" : "max-w-6xl"
        )}>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
              <Route path="/requests" element={<PrivateRoute><RequestsPage /></PrivateRoute>} />
              <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
              <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/office-pay" element={<PrivateRoute><OfficePayPage /></PrivateRoute>} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
      
      {/* Active Trip Overlay - Persistent */}
      <AnimatePresence>
         {activeTrip && !isAdminPage && (
           <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="w-full max-w-lg bg-neutral-50 rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-150">
               <ActiveTripScreen />
             </div>
           </div>
         )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'geometry']}>
      <AuthProvider>
        <TripProvider>
          <LocationTracker />
          <BrowserRouter>
            <Layout />
          </BrowserRouter>
        </TripProvider>
      </AuthProvider>
    </APIProvider>
  );
}
