import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "~/providers/AuthProvider";
import Sidebar from "~/components/Sidebar";

export default function LayoutPrivate() {
  const { isAuthenticated, isInitialLoad } = useAuth();

  // Don't redirect while checking initial auth state
  if (isInitialLoad) {
    return (
      <div className="min-h-[calc(100vh-2rem)] bg-white rounded-xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)]">
      <div className="w-80 shrink-0">
        <div className="sticky top-4">
          <Sidebar />
        </div>
      </div>
      <main className="flex-1 bg-white rounded-xl min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
