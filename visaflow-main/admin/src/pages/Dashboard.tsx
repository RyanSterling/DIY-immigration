import {
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { StatCard } from '~/components/StatCard';
import Spinner from '~/components/Spinner';
import { useAdminStats } from '~/hooks/useAdminStats';

export default function PageDashboard() {
  const { data, isLoading, error } = useAdminStats();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load stats</p>
      </div>
    );
  }

  const stats = data?.data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Organizations"
          value={stats?.organizations ?? 0}
          icon={BuildingOfficeIcon}
        />
        <StatCard
          title="Users"
          value={stats?.users ?? 0}
          icon={UsersIcon}
        />
        <StatCard
          title="Clients"
          value={stats?.clients ?? 0}
          icon={UserGroupIcon}
        />
        <StatCard
          title="Documents"
          value={stats?.documents ?? 0}
          icon={DocumentTextIcon}
        />
      </div>
    </div>
  );
}
