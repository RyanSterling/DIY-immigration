import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client, handleResponse, type InferResponse, type InferSuccessResponse } from '~/lib/api';

type UsersListResponse = InferSuccessResponse<InferResponse<
  Awaited<ReturnType<typeof client.api.users.$get>>
>>;

interface UseUsersOptions {
  page?: number;
  pageSize?: number;
  organizationId?: string;
  search?: string;
}

export function useUsers(options: UseUsersOptions = {}) {
  const { page = 1, pageSize = 20, organizationId, search } = options;

  return useQuery({
    queryKey: ['users', 'list', { page, pageSize, organizationId, search }],
    queryFn: async () => {
      const response = await client.api.users.$get({
        query: {
          page: String(page),
          pageSize: String(pageSize),
          ...(organizationId && { organizationId }),
          ...(search && { search }),
        },
      });
      return handleResponse<UsersListResponse>(response);
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useDisableUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api.admin.users[':id'].disable.$patch({
        param: { id },
      });
      return handleResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useEnableUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api.admin.users[':id'].enable.$patch({
        param: { id },
      });
      return handleResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}
