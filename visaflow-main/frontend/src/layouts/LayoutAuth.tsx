import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "~/providers/AuthProvider";

export default function LayoutAuth() {
  const { isAuthenticated, isInitialLoad } = useAuth();

  // Don't redirect while checking initial auth state
  if (isInitialLoad) {
    return (
      <div className="min-h-[calc(100vh-2rem)] bg-white rounded-xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-white rounded-xl flex overflow-hidden">
      {/* Left panel - Form area */}
      <div className="w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>

      {/* Right panel - Image placeholder */}
      <div className="w-1/2  from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <svg
            className="w-32 h-32 mx-auto opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
