import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '~/components/Card';
import { DataTable, type Column } from '~/components/DataTable';
import Spinner from '~/components/Spinner';
import { useOrganization } from '~/hooks/useOrganizations';
import { useAdminDocuments } from '~/hooks/useAdminDocuments';

interface Document {
  id: string;
  documentType: string;
  originalFilename: string;
  fileSize: number;
  createdAt: string;
  costUsd: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDocumentType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function PageOrganizationDocuments() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);

  const { data: orgData, isLoading: orgLoading } = useOrganization(id!);
  const { data: documentsData, isLoading: documentsLoading } = useAdminDocuments({
    page,
    pageSize: 20,
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

  const columns: Column<Document>[] = [
    {
      key: 'originalFilename',
      header: 'Filename',
      render: (doc) => (
        <span className="font-medium text-gray-900">{doc.originalFilename}</span>
      ),
    },
    {
      key: 'documentType',
      header: 'Type',
      render: (doc) => (
        <span className="text-gray-500">{formatDocumentType(doc.documentType)}</span>
      ),
    },
    {
      key: 'fileSize',
      header: 'Size',
      render: (doc) => (
        <span className="text-gray-500">{formatFileSize(doc.fileSize)}</span>
      ),
    },
    {
      key: 'costUsd',
      header: 'Cost',
      render: (doc) => (
        <span className="text-gray-900 font-medium">
          ${parseFloat(doc.costUsd).toFixed(4)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Uploaded',
      render: (doc) => (
        <span className="text-gray-500">
          {new Date(doc.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500">{org.name}</p>
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={(documentsData?.data ?? []) as Document[]}
            isLoading={documentsLoading}
            emptyMessage="No documents found"
            page={page}
            pageSize={20}
            total={documentsData?.total ?? 0}
            totalPages={documentsData?.totalPages ?? 1}
            onPageChange={setPage}
            rowKey={(doc) => doc.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
