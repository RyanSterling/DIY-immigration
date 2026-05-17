import { useQuery } from '@tanstack/react-query';
import { client, handleResponse } from '~/lib/api';

interface MonthlyCost {
  billingPeriod: string;
  totalCostUsd: string;
  operationCount: number;
}

interface OrganizationCostsData {
  organizationId: string;
  totalCostUsd: string;
  totalOperations: number;
  monthlyCosts: MonthlyCost[];
}

interface OrganizationCostsResponse {
  data: OrganizationCostsData;
}

export function useOrganizationCosts(organizationId: string) {
  return useQuery({
    queryKey: ['admin', 'organizations', organizationId, 'costs'],
    queryFn: async () => {
      const response = await client.api.admin.organizations[':id'].costs.$get({
        param: { id: organizationId },
      });
      return handleResponse<OrganizationCostsResponse>(response);
    },
    enabled: !!organizationId,
  });
}
