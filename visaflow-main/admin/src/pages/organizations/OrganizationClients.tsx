import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '~/components/Card';
import { DataTable, type Column } from '~/components/DataTable';
import Spinner from '~/components/Spinner';
import { useOrganization } from '~/hooks/useOrganizations';
import { useAdminClients } from '~/hooks/useAdminClients';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  organizationName: string;
  createdAt: string;
}

export default function PageOrganizationClients() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);

  const { data: orgData, isLoading: orgLoading } = useOrganization(id!);
  const { data: clientsData, isLoading: clientsLoading } = useAdminClients({
    page,
    pageSize: 10,
    organizationId: id,
  });

  const org = orgData?.data;

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

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (client) => (
        <span className="font-medium text-gray-900">
          {client.firstName || client.lastName
            ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
            : 'Unnamed Client'}
        </span>
      ),
    },
    {
      key: 'nationality',
      header: 'Nationality',
      render: (client) => (
        <span className="text-gray-500">{client.nationality || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (client) => (
        <span className="text-gray-500">
          {new Date(client.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-gray-500">{org.name}</p>
      </div>

      {/* Clients Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={(clientsData?.data ?? []) as Client[]}
            isLoading={clientsLoading}
            emptyMessage="No clients found"
            page={page}
            pageSize={10}
            total={clientsData?.total ?? 0}
            totalPages={clientsData?.totalPages ?? 1}
            onPageChange={setPage}
            rowKey={(client) => client.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
