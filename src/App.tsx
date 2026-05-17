import React, { useEffect } from 'react';
import { cn } from './lib/utils';
// FIX: Swapped BrowserRouter with HashRouter to prevent Android WebViews from locking route history states
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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

// FIX: Native Redirect Guard to automatically switch viewports 
// on live active trip updates without getting trapped by browser cache.
function RouteGuard({ children }: { children: React.ReactNode }) {
  const { activeTrip } = useTrips();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isAdminPage = location.pathname === '/admin';
    
    if (activeTrip && !isAdminPage && location.pathname !== '/active-trip') {
      console.log('Trip match verified. Routing driver directly to map workspace.');
      navigate('/active-trip', { replace: true });
    }
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
              
              <Route path="/" element={<PrivateRoute><RouteGuard><HomePage /></RouteGuard></PrivateRoute>} />
              <Route path="/requests" element={<PrivateRoute><RouteGuard><RequestsPage /></RouteGuard></PrivateRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="/history" element={<PrivateRoute><RouteGuard><HistoryPage /></RouteGuard></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><RouteGuard><ProfilePage /></RouteGuard></PrivateRoute>} />
              <Route path="/office-pay" element={<PrivateRoute><RouteGuard><OfficePayPage /></RouteGuard></PrivateRoute>} />
              
              {/* FIX: Declared ActiveTripScreen as its own clean sub-page path instead of an overlay layout container */}
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
          <HashRouter>
            <Layout />
          </HashRouter>
        </TripProvider>
      </AuthProvider>
    </APIProvider>
  );
}