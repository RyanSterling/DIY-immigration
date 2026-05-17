import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '~/components/Card';
import { DataTable, type Column } from '~/components/DataTable';
import { StatusBadge } from '~/components/StatusBadge';
import { SearchBar } from '~/components/forms/SearchBar';
import { Input } from '~/components/forms/Input';
import { Modal } from '~/components/Modal';
import Button from '~/components/Button';
import { useOrganizations, useDisableOrganization, useEnableOrganization, useOnboardOrganization } from '~/hooks/useOrganizations';
import { toast } from 'react-toastify';

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  disabledAt: string | null;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function PageOrganizations() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data, isLoading } = useOrganizations({ page, pageSize: 20, search });
  const disableMutation = useDisableOrganization();
  const enableMutation = useEnableOrganization();
  const onboardMutation = useOnboardOrganization();

  const handleToggleStatus = async (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (org.disabledAt) {
        await enableMutation.mutateAsync(org.id);
        toast.success(`Organization "${org.name}" enabled`);
      } else {
        await disableMutation.mutateAsync(org.id);
        toast.success(`Organization "${org.name}" disabled`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Operation failed'
      );
    }
  };

  const handleOrgNameChange = (value: string) => {
    setOrgName(value);
    setOrgSlug(generateSlug(value));
  };

  const resetForm = () => {
    setOrgName('');
    setOrgSlug('');
    setAdminEmail('');
    setAdminPassword('');
    setFormErrors({});
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!orgName.trim()) {
      errors.orgName = 'Organization name is required';
    }
    if (!orgSlug.trim()) {
      errors.orgSlug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(orgSlug)) {
      errors.orgSlug = 'Slug must be lowercase letters, numbers, and hyphens only';
    }
    if (!adminEmail.trim()) {
      errors.adminEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      errors.adminEmail = 'Invalid email format';
    }
    if (!adminPassword) {
      errors.adminPassword = 'Password is required';
    } else if (adminPassword.length < 8) {
      errors.adminPassword = 'Password must be at least 8 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onboardMutation.mutateAsync({
        organization: {
          name: orgName.trim(),
          slug: orgSlug.trim(),
        },
        user: {
          email: adminEmail.trim(),
          password: adminPassword,
        },
      });

      toast.success(`Organization "${orgName}" created successfully`);
      handleCloseModal();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create organization'
      );
    }
  };

  const columns: Column<Organization>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (org) => (
        <span className="font-medium text-gray-900">{org.name}</span>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (org) => (
        <span className="text-gray-500">{org.slug}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (org) => (
        <StatusBadge status={org.disabledAt ? 'disabled' : 'enabled'} />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (org) => (
        <span className="text-gray-500">
          {new Date(org.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (org) => (
        <Button
          variant={org.disabledAt ? 'primary' : 'danger'}
          size="sm"
          onClick={(e) => handleToggleStatus(org, e)}
          isLoading={disableMutation.isPending || enableMutation.isPending}
        >
          {org.disabledAt ? 'Enable' : 'Disable'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          Create Organization
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <SearchBar
            placeholder="Search organizations..."
            defaultValue={search}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            className="w-64"
          />
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={(data?.data ?? []) as Organization[]}
            isLoading={isLoading}
            emptyMessage="No organizations found"
            page={page}
            pageSize={20}
            total={data?.total ?? 0}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
            onRowClick={(org) => navigate(`/organizations/${org.id}`)}
            rowKey={(org) => org.id}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create Organization"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Organization Name"
            placeholder="Acme Corporation"
            value={orgName}
            onChange={(e) => handleOrgNameChange(e.target.value)}
            error={formErrors.orgName}
          />
          <Input
            label="Slug"
            placeholder="acme-corporation"
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value)}
            error={formErrors.orgSlug}
          />
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Initial Admin User</p>
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="admin@acme.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                error={formErrors.adminEmail}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                error={formErrors.adminPassword}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={onboardMutation.isPending}
            >
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
