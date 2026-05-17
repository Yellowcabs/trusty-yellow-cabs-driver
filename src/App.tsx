import React, { useEffect } from 'react';
import { cn } from './lib/utils';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import { NotificationManager } from './components/NotificationManager';

import { APIProvider } from '@vis.gl/react-google-maps';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, driver, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || driver?.id !== 'admin') {
    return <Navigate to="/login?admin=true" />;
  }
  return <>{children}</>;
}

// FIX: Native Redirect Guard Component. This monitors real-time context database 
// updates and routes the driver exactly where they need to be, bypassing UI freeze scenarios.
function RouteGuard({ children }: { children: React.ReactNode }) {
  const { activeTrip } = useTrips();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isAdminPage = location.pathname === '/admin';
    // If a trip becomes active, immediately break out of the list route and push the map page path
    if (activeTrip && !isAdminPage && location.pathname !== '/active-trip') {
      navigate('/active-trip', { replace: true });
    }
    // If a trip ends, securely push the driver back to the main home area
    else if (!activeTrip && location.pathname === '/active-trip') {
      navigate('/', { replace: true });
    }
  }, [activeTrip, location.pathname, navigate]);

  return <>{children}</>;
}

function Layout() {
  const location = useLocation();
  const hideNav = location.pathname === '/login' || location.pathname === '/active-trip';

  return (
    <div className="min-h-screen bg-neutral-50 relative overflow-hidden flex flex-col md:flex-row">
      {/* Hide navigation entirely during active trips to maximize map viewport workspace */}
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
              {/* Wrapped driver pages inside our explicit native state layout RouteGuard */}
              <Route path="/" element={<PrivateRoute><RouteGuard><HomePage /></RouteGuard></PrivateRoute>} />
              <Route path="/requests" element={<PrivateRoute><RouteGuard><RequestsPage /></RouteGuard></PrivateRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="/history" element={<PrivateRoute><RouteGuard><HistoryPage /></RouteGuard></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><RouteGuard><ProfilePage /></RouteGuard></PrivateRoute>} />
              <Route path="/office-pay" element={<PrivateRoute><RouteGuard><OfficePayPage /></RouteGuard></PrivateRoute>} />
              
              {/* FIX: Moved ActiveTripScreen into its own clean routing path instead of a floating fixed viewport overlay */}
              <Route path="/active-trip" element={<PrivateRoute><RouteGuard><ActiveTripScreen /></RouteGuard></PrivateRoute>} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'geometry']}>
      <AuthProvider>
        <TripProvider>
          <NotificationManager />
          <LocationTracker />
          <BrowserRouter>
            <Layout />
          </BrowserRouter>
        </TripProvider>
      </AuthProvider>
    </APIProvider>
  );
}