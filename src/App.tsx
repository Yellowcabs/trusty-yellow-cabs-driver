import React from 'react';
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
import { NotificationManager } from './components/NotificationManager';
import { APIProvider } from '@vis.gl/react-google-maps';

/* -------------------- ROUTES GUARD -------------------- */

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, driver, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!isAuthenticated || driver?.id !== 'admin') {
    return <Navigate to="/login?admin=true" />;
  }

  return <>{children}</>;
}

/* -------------------- LAYOUT -------------------- */

function Layout() {
  const location = useLocation();
  const { activeTrip } = useTrips();

  const hideNav = location.pathname === '/login';
  const isAdminPage = location.pathname === '/admin';

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row relative overflow-hidden">

      {!hideNav && <BottomNav />}

      <main className={cn(
        "flex-1 w-full transition-all duration-150",
        !hideNav && "md:ml-64"
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
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/office-pay" element={<PrivateRoute><OfficePayPage /></PrivateRoute>} />
            </Routes>
          </AnimatePresence>

        </div>
      </main>

      {/* Active Trip Overlay */}
      <AnimatePresence>
        {activeTrip && !isAdminPage && (
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-neutral-50 rounded-[32px] shadow-2xl overflow-hidden">
              <ActiveTripScreen />
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

/* -------------------- APP WRAPPER (IMPORTANT FIX) -------------------- */

function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return <Layout />;
}

/* -------------------- APP -------------------- */

export default function App() {
  const apiKey =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    '';

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'geometry']}>
      <AuthProvider>
        <TripProvider>
          <NotificationManager />
          <LocationTracker />

          <BrowserRouter>
            <AppContent />
          </BrowserRouter>

        </TripProvider>
      </AuthProvider>
    </APIProvider>
  );
}