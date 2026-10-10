import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-aqua border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-dark-bg px-4 text-center">
        <h1 className="text-2xl font-bold text-surface-light">Access Denied</h1>
        <p className="mt-2 text-sm text-surface-light/60">
          You need administrator privileges to access this page.
        </p>
        <a href="/" className="btn-primary mt-6">Back to Home</a>
      </div>
    );
  }

  return <>{children}</>;
}
