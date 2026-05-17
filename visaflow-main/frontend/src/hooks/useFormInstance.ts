import { useQuery } from "@tanstack/react-query";
import { client, handleResponse } from "~/lib/api";
import type { FormInstanceWithResponses } from "./useFormInstancesApi";

/**
 * Fetch a single form instance with its responses.
 * Only fetches when id is provided.
 */
export function useFormInstance(id: string | undefined) {
  return useQuery({
    queryKey: ["form-instances", "detail", id],
    queryFn: async () => {
      const response = await client.api["form-instances"][":id"].$get({
        param: { id: id! },
      });
      return handleResponse<FormInstanceWithResponses>(response);
    },
    enabled: !!id,
  });
}
