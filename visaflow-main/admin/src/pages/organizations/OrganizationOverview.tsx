import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '~/components/Card';
import { StatusBadge } from '~/components/StatusBadge';
import Spinner from '~/components/Spinner';
import Button from '~/components/Button';
import { useOrganization, useDisableOrganization, useEnableOrganization } from '~/hooks/useOrganizations';
import { useUsers } from '~/hooks/useUsers';
import { useAdminClients } from '~/hooks/useAdminClients';
import { useAdminDocuments } from '~/hooks/useAdminDocuments';
import { useOrganizationCosts } from '~/hooks/useOrganizationCosts';
import { toast } from 'react-toastify';

export default function PageOrganizationOverview() {
  const { id } = useParams<{ id: string }>();

  const { data: orgData, isLoading: orgLoading } = useOrganization(id!);
  const { data: usersData } = useUsers({ organizationId: id, pageSize: 1 });
  const { data: clientsData } = useAdminClients({ organizationId: id, pageSize: 1 });
  const { data: documentsData } = useAdminDocuments({ organizationId: id, pageSize: 1 });
  const { data: costsData } = useOrganizationCosts(id!);

  const disableOrgMutation = useDisableOrganization();
  const enableOrgMutation = useEnableOrganization();

  const org = orgData?.data;

  const handleToggleOrgStatus = async () => {
    if (!org) return;
    try {
      if (org.disabledAt) {
        await enableOrgMutation.mutateAsync(org.id);
        toast.success(`Organization "${org.name}" enabled`);
      } else {
        await disableOrgMutation.mutateAsync(org.id);
        toast.success(`Organization "${org.name}" disabled`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Operation failed'
      );
    }
  };

  if (orgLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Organization not found</p>
      </div>
    );
  }

  const totalCost = parseFloat(costsData?.data?.totalCostUsd ?? '0');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
            <p className="text-gray-500">/{org.slug}</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={org.disabledAt ? 'disabled' : 'enabled'} />
            <Button
              variant={org.disabledAt ? 'primary' : 'danger'}
              onClick={handleToggleOrgStatus}
              isLoading={disableOrgMutation.isPending || enableOrgMutation.isPending}
            >
              {org.disabledAt ? 'Enable Organization' : 'Disable Organization'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500">Users</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              {usersData?.total ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500">Clients</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              {clientsData?.total ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500">Documents</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              {documentsData?.total ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500">Total Costs</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">
              ${totalCost.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Organization Details</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{org.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Slug</dt>
              <dd className="mt-1 text-sm text-gray-900">{org.slug}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={org.disabledAt ? 'disabled' : 'enabled'} />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(org.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
