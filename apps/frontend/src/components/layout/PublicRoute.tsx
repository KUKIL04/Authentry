import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // If the auth hook has a loading state while verifying the token, we handle it here
  if (isLoading) {
    return null;
  }

  // If they are already logged in, bounce them to the dashboard
  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  // Otherwise, render the auth pages (Login, Register, etc.)
  return <Outlet />;
}