import { useAuth } from '~/providers/AuthProvider';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.firstName || 'User'}!
        </h1>
        <p className="text-gray-600 mt-1">
          You're logged in as {user?.role === 'super_admin' ? 'Super Admin' : 'Organization Admin'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <p className="text-gray-600">
          Dashboard content will be added here. For now, the basic auth flow is working.
        </p>
      </div>
    </div>
  );
}
