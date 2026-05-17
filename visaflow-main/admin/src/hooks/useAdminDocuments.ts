import { useQuery } from '@tanstack/react-query';
import { client, handleResponse, type InferResponse, type InferSuccessResponse } from '~/lib/api';

type AdminDocumentsResponse = InferSuccessResponse<InferResponse<
  Awaited<ReturnType<typeof client.api.admin.documents.$get>>
>>;

interface UseAdminDocumentsOptions {
  page?: number;
  pageSize?: number;
  organizationId?: string;
}

export function useAdminDocuments(options: UseAdminDocumentsOptions = {}) {
  const { page = 1, pageSize = 20, organizationId } = options;

  return useQuery({
    queryKey: ['admin', 'documents', { page, pageSize, organizationId }],
    queryFn: async () => {
      const response = await client.api.admin.documents.$get({
        query: {
          page: String(page),
          pageSize: String(pageSize),
          ...(organizationId && { organizationId }),
        },
      });
      return handleResponse<AdminDocumentsResponse>(response);
    },
    placeholderData: (previousData) => previousData,
  });
}
