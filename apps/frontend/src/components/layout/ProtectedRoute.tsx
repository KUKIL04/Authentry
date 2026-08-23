import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const ProtectedRoute = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-brand-500">Loading secure environment...</div>;
  }

  if (!isAuthenticated || !user) {
    // Redirects them to login, but remembers where they were trying to go
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // The Waiting Room Trap
  // If they are PENDING and trying to access an active module, force them to the waiting room
  if (user.status === 'PENDING' && location.pathname !== '/waiting-room') {
    return <Navigate to="/waiting-room" replace />;
  }

  // If they are ACTIVE and try to go to the waiting room, push them to the dashboard
  if (user.status === 'ACTIVE' && location.pathname === '/waiting-room') {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
};
