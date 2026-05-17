import { useQuery } from '@tanstack/react-query';
import { client, handleResponse, type InferResponse } from '~/lib/api';

type StatsResponse = InferResponse<
  Awaited<ReturnType<typeof client.api.admin.stats.$get>>
>;

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await client.api.admin.stats.$get();
      return handleResponse<StatsResponse>(response);
    },
  });
}
