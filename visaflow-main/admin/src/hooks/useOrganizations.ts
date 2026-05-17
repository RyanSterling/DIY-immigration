import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client, handleResponse, type InferResponse, type InferSuccessResponse } from '~/lib/api';

type OrganizationsListResponse = InferSuccessResponse<InferResponse<
  Awaited<ReturnType<typeof client.api.organizations.$get>>
>>;

type OrganizationResponse = InferSuccessResponse<InferResponse<
  Awaited<ReturnType<(typeof client.api.organizations)[':id']['$get']>>
>>;

interface UseOrganizationsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function useOrganizations(options: UseOrganizationsOptions = {}) {
  const { page = 1, pageSize = 20, search = '' } = options;

  return useQuery({
    queryKey: ['organizations', 'list', { page, pageSize, search }],
    queryFn: async () => {
      const response = await client.api.organizations.$get({
        query: {
          page: String(page),
          pageSize: String(pageSize),
          ...(search && { search }),
        },
      });
      return handleResponse<OrganizationsListResponse>(response);
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ['organizations', 'detail', id],
    queryFn: async () => {
      const response = await client.api.organizations[':id'].$get({
        param: { id },
      });
      return handleResponse<OrganizationResponse>(response);
    },
    enabled: !!id,
  });
}

export function useDisableOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api.admin.organizations[':id'].disable.$patch({
        param: { id },
      });
      return handleResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useEnableOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api.admin.organizations[':id'].enable.$patch({
        param: { id },
      });
      return handleResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

interface OnboardOrganizationData {
  organization: {
    name: string;
    slug: string;
  };
  user: {
    email: string;
    password: string;
  };
}

export function useOnboardOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OnboardOrganizationData) => {
      const response = await client.api.admin['onboard-organization'].$post({
        json: data,
      });
      return handleResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}
