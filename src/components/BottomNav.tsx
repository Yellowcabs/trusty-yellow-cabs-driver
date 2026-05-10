import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, History, User, ShieldCheck, IndianRupee } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export function BottomNav() {
  const { driver } = useAuth();
  const isAdmin = driver?.id === 'admin';

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 transition-all duration-150">
        <NavLink 
          to="/" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-colors",
            isActive ? "text-primary scale-110" : "text-gray-400"
          )}
        >
          <LayoutDashboard size={24} />
          <span className="text-[10px] font-medium font-sans">Home</span>
        </NavLink>
        
        <NavLink 
          to="/requests" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-colors",
            isActive ? "text-primary scale-110" : "text-gray-400"
          )}
        >
          <Car size={24} />
          <span className="text-[10px] font-medium font-sans">Trips</span>
        </NavLink>

        {!isAdmin && (
          <NavLink 
            to="/office-pay" 
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-colors relative",
              isActive ? "text-primary scale-110" : "text-gray-400"
            )}
          >
            <IndianRupee size={24} />
            <span className="text-[10px] font-medium font-sans">Office</span>
            {(driver?.officeFee || 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </NavLink>
        )}
        
        {isAdmin ? (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-colors",
              isActive ? "text-primary scale-110" : "text-gray-400"
            )}
          >
            <ShieldCheck size={24} />
            <span className="text-[10px] font-medium font-sans">Admin</span>
          </NavLink>
        ) : (
          <NavLink 
            to="/history" 
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-colors",
              isActive ? "text-primary scale-110" : "text-gray-400"
            )}
          >
            <History size={24} />
            <span className="text-[10px] font-medium font-sans">History</span>
          </NavLink>
        )}
        
        <NavLink 
          to="/profile" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-colors",
            isActive ? "text-primary scale-110" : "text-gray-400"
          )}
        >
          <User size={24} />
          <span className="text-[10px] font-medium font-sans">Profile</span>
        </NavLink>
      </nav>

      {/* Desktop Sidebar Nav */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 flex-col p-6 z-50">
        <div className="mb-12 flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl text-white">
            <Car size={24} />
          </div>
          <div>
            <h1 className="font-black text-neutral-900 leading-tight">Trusty Yellow</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">Premium Driver</p>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <NavLink 
            to="/" 
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all",
              isActive ? "bg-primary text-white premium-shadow" : "text-gray-400 hover:bg-neutral-50 hover:text-neutral-900"
            )}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink 
            to="/requests" 
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all",
              isActive ? "bg-primary text-white premium-shadow" : "text-gray-400 hover:bg-neutral-50 hover:text-neutral-900"
            )}
          >
            <Car size={20} />
            <span>Ride Requests</span>
          </NavLink>

          {!isAdmin && (
            <NavLink 
              to="/office-pay" 
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all",
                isActive ? "bg-primary text-white premium-shadow" : "text-gray-400 hover:bg-neutral-50 hover:text-neutral-900"
              )}
            >
              <IndianRupee size={20} />
              <div className="flex-1 flex items-center justify-between">
                <span>Office Fee</span>
                {(driver?.officeFee || 0) > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[8px] animate-pulse">PENDING</span>
                )}
              </div>
            </NavLink>
          )}

          {isAdmin ? (
            <NavLink 
              to="/admin" 
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all",
                isActive ? "bg-primary text-white premium-shadow" : "text-gray-400 hover:bg-neutral-50 hover:text-neutral-900"
              )}
            >
              <ShieldCheck size={20} />
              <span>Admin Panel</span>
            </NavLink>
          ) : (
            <NavLink 
              to="/history" 
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all",
                isActive ? "bg-primary text-white premium-shadow" : "text-gray-400 hover:bg-neutral-50 hover:text-neutral-900"
              )}
            >
              <History size={20} />
              <span>Trip History</span>
            </NavLink>
          )}
        </div>

        <div className="pt-6 border-t border-neutral-100">
          <NavLink 
            to="/profile" 
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all",
              isActive ? "bg-primary text-white premium-shadow" : "text-gray-400 hover:bg-neutral-50 hover:text-neutral-900"
            )}
          >
            <User size={20} />
            <span>My Profile</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
}
