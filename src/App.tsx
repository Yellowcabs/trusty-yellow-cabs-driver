import React, { useState, useEffect } from 'react';
import { cn } from './lib/utils';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { Car } from 'lucide-react';

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
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
            <Route path="/requests" element={<PrivateRoute><RequestsPage /></PrivateRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/office-pay" element={<PrivateRoute><OfficePayPage /></PrivateRoute>} />
          </Routes>
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

import { getBaseUrl } from './lib/config';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[FATAL ERROR]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-600 p-8 text-white flex flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-black mb-4 uppercase tracking-tighter">Application Error</h1>
          <p className="bg-black/20 p-4 rounded-xl text-xs font-mono break-all mb-6 max-w-sm">
            {this.state.error?.message || 'Unknown Crash'}
          </p>
          <button 
            onClick={() => {
               localStorage.clear();
               window.location.href = '/';
            }}
            className="bg-white text-red-600 px-8 py-4 rounded-2xl font-black uppercase text-sm"
          >
            Reset App & Data
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  useEffect(() => {
    const isCapacitor = (window as any).Capacitor || (window as any).webkit?.messageHandlers?.bridge;
    console.log('[DEBUG] App Start');
    console.log('[DEBUG] Hostname:', window.location.hostname);
    console.log('[DEBUG] Protocol:', window.location.protocol);
    console.log('[DEBUG] Backend URL:', getBaseUrl());
    console.log('[DEBUG] Capacitor Detect:', !!isCapacitor);

    // Capacitor App State Listeners
    if (isCapacitor) {
      import('@capacitor/app').then(({ App: CapApp }) => {
        CapApp.addListener('appStateChange', ({ isActive }) => {
          console.log('[DEBUG] App State Change:', isActive ? 'FOREGROUND' : 'BACKGROUND');
          if (isActive) {
            // App came to foreground, trigger any necessary refreshes
            window.dispatchEvent(new CustomEvent('app-foreground'));
          }
        });
      });
    }

    // Connection check happens on first meaningful use or in Login page debug tool
  }, []);

  return (
    <ErrorBoundary>
      <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'geometry']}>
        <AuthProvider>
          <TripProvider>
            <NotificationManager />
            <LocationTracker />
            <Router>
              <Layout />
            </Router>
          </TripProvider>
        </AuthProvider>
      </APIProvider>
    </ErrorBoundary>
  );
}
