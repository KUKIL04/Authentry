import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const AdminRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user?.isAdmin) {
    // If a normal user tries to access an admin route, it kicks them to their dashboard
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};