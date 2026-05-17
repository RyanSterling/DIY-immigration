import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "~/providers/AuthProvider";
import Spinner from "~/components/Spinner";

export default function LayoutAuth() {
  const { isAuthenticated, isInitialLoad } = useAuth();

  // Show loading while checking auth
  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
