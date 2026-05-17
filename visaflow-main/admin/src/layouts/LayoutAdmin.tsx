import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '~/providers/AuthProvider';
import { Sidebar } from '~/components/Sidebar';
import Spinner from "~/components/Spinner";

export default function LayoutAdmin() {
  const { isAuthenticated, isInitialLoad, user } = useAuth();

  // Show loading while checking auth
  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to login if not super_admin
  if (user?.role !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
