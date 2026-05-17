import { useAuth } from '~/providers/AuthProvider';
import { Card, CardHeader, CardContent } from '~/components/Card';
import Button from '~/atoms/Button';

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Profile</h2>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-gray-100">
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {user?.firstName} {user?.lastName}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {user?.email}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Account</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Sign out of your account on this device.
          </p>
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
