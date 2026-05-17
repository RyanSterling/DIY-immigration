import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '~/components/Card';
import { DataTable, type Column } from '~/components/DataTable';
import { SearchBar } from '~/components/forms/SearchBar';
import { Modal } from '~/components/Modal';
import Button from '~/components/Button';
import {
  useAdminFormTemplates,
  useDeleteFormTemplate,
  type FormTemplateListItem,
} from '~/hooks/useAdminFormTemplates';
import { toast } from 'react-toastify';

export default function PageFormTemplates() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<FormTemplateListItem | null>(null);

  const { data, isLoading } = useAdminFormTemplates({ page, pageSize: 20, search });
  const deleteMutation = useDeleteFormTemplate();

  const handleDeleteClick = (template: FormTemplateListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplateToDelete(template);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      await deleteMutation.mutateAsync(templateToDelete.id);
      toast.success(`Template "${templateToDelete.formNumber}" deleted successfully`);
      setDeleteModalOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete template'
      );
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setTemplateToDelete(null);
  };

  const columns: Column<FormTemplateListItem>[] = [
    {
      key: 'formNumber',
      header: 'Form Number',
      render: (template) => (
        <span className="font-medium text-gray-900">{template.formNumber}</span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (template) => (
        <span className="text-gray-700">{template.title}</span>
      ),
    },
    {
      key: 'revision',
      header: 'Revision',
      render: (template) => (
        <span className="text-gray-500">{template.revision || '-'}</span>
      ),
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (template) => (
        <span className={template.organizationId ? 'text-gray-700' : 'text-primary-600 font-medium'}>
          {template.organizationId ? template.organizationId : 'Global'}
        </span>
      ),
    },
    {
      key: 'sectionCount',
      header: 'Sections',
      render: (template) => (
        <span className="text-gray-500">{template.sectionCount}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (template) => (
        <span className="text-gray-500">
          {new Date(template.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (template) => (
        <Button
          variant="danger"
          size="sm"
          onClick={(e) => handleDeleteClick(template, e)}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Form Templates</h1>
        <Button onClick={() => navigate('/form-templates/new')}>
          Create Template
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <SearchBar
            placeholder="Search by form number or title..."
            defaultValue={search}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            className="w-80"
          />
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={(data?.data ?? []) as FormTemplateListItem[]}
            isLoading={isLoading}
            emptyMessage="No form templates found"
            page={page}
            pageSize={20}
            total={data?.total ?? 0}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
            onRowClick={(template) => navigate(`/form-templates/${template.id}`)}
            rowKey={(template) => template.id}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Template"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the template{' '}
            <span className="font-semibold text-gray-900">
              {templateToDelete?.formNumber}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDeleteModal}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
