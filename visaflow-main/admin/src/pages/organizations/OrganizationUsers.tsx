import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '~/components/Card';
import { DataTable, type Column } from '~/components/DataTable';
import { StatusBadge } from '~/components/StatusBadge';
import Spinner from '~/components/Spinner';
import Button from '~/components/Button';
import { useOrganization } from '~/hooks/useOrganizations';
import { useUsers, useDisableUser, useEnableUser } from '~/hooks/useUsers';
import { toast } from 'react-toastify';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'super_admin' | 'org_admin';
  createdAt: string;
  disabledAt: string | null;
}

export default function PageOrganizationUsers() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);

  const { data: orgData, isLoading: orgLoading } = useOrganization(id!);
  const { data: usersData, isLoading: usersLoading } = useUsers({
    page,
    pageSize: 10,
    organizationId: id,
  });

  const disableUserMutation = useDisableUser();
  const enableUserMutation = useEnableUser();

  const org = orgData?.data;

  const handleToggleUserStatus = async (user: User) => {
    try {
      if (user.disabledAt) {
        await enableUserMutation.mutateAsync(user.id);
        toast.success(`User "${user.email}" enabled`);
      } else {
        await disableUserMutation.mutateAsync(user.id);
        toast.success(`User "${user.email}" disabled`);
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

  const columns: Column<User>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (user) => (
        <span className="font-medium text-gray-900">{user.email}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (user) => (
        <span className="text-gray-500">
          {user.firstName || user.lastName
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
            : '-'}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <span className="text-gray-500 capitalize">{user.role.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <StatusBadge status={user.disabledAt ? 'disabled' : 'enabled'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => (
        <Button
          variant={user.disabledAt ? 'primary' : 'danger'}
          size="sm"
          onClick={() => handleToggleUserStatus(user)}
          isLoading={disableUserMutation.isPending || enableUserMutation.isPending}
        >
          {user.disabledAt ? 'Enable' : 'Disable'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500">{org.name}</p>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={(usersData?.data ?? []) as User[]}
            isLoading={usersLoading}
            emptyMessage="No users found"
            page={page}
            pageSize={10}
            total={usersData?.total ?? 0}
            totalPages={usersData?.totalPages ?? 1}
            onPageChange={setPage}
            rowKey={(user) => user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
