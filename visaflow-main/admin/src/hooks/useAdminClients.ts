import { useQuery } from '@tanstack/react-query';
import { client, handleResponse, type InferResponse, type InferSuccessResponse } from '~/lib/api';

type AdminClientsResponse = InferSuccessResponse<InferResponse<
  Awaited<ReturnType<typeof client.api.admin.clients.$get>>
>>;

interface UseAdminClientsOptions {
  page?: number;
  pageSize?: number;
  organizationId?: string;
}

export function useAdminClients(options: UseAdminClientsOptions = {}) {
  const { page = 1, pageSize = 20, organizationId } = options;

  return useQuery({
    queryKey: ['admin', 'clients', { page, pageSize, organizationId }],
    queryFn: async () => {
      const response = await client.api.admin.clients.$get({
        query: {
          page: String(page),
          pageSize: String(pageSize),
          ...(organizationId && { organizationId }),
        },
      });
      return handleResponse<AdminClientsResponse>(response);
    },
    placeholderData: (previousData) => previousData,
  });
}
