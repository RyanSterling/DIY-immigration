import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { client, handleResponse } from "~/lib/api";
import {
  parseParams,
  stringifyParams,
  type QueryParams,
} from "~/lib/queryString";
import type { FormInstance, FormInstancesListResponse } from "./useFormInstancesApi";

interface UseFormInstancesListOptions {
  clientId?: string;
  formTemplateId?: string;
  status?: "draft" | "in_progress" | "completed";
  paramKey?: string;
  defaultPageSize?: number;
  enabled?: boolean;
}

export function useFormInstancesList(options: UseFormInstancesListOptions = {}) {
  const {
    clientId,
    formTemplateId,
    status,
    paramKey = "formInstances",
    defaultPageSize = 20,
    enabled = true,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL params
  const params = parseParams(searchParams.toString());
  const resourceParams = (params[paramKey] || {}) as Record<string, unknown>;
  const page = Math.max(
    1,
    parseInt(String(resourceParams.page || "1"), 10) || 1
  );
  const pageSize =
    parseInt(String(resourceParams.pageSize || defaultPageSize), 10) ||
    defaultPageSize;

  // URL param helpers
  const updateParams = useCallback(
    (updates: Record<string, unknown>) => {
      const currentParams = parseParams(searchParams.toString());
      const currentResourceParams = (currentParams[paramKey] || {}) as Record<
        string,
        unknown
      >;

      const newResourceParams = { ...currentResourceParams, ...updates };

      // Remove null/undefined values
      Object.keys(newResourceParams).forEach((key) => {
        if (
          newResourceParams[key] === null ||
          newResourceParams[key] === undefined ||
          newResourceParams[key] === ""
        ) {
          delete newResourceParams[key];
        }
      });

      const newParams: QueryParams = {
        ...currentParams,
        [paramKey]:
          Object.keys(newResourceParams).length > 0
            ? newResourceParams
            : undefined,
      };

      // Remove the paramKey entirely if empty
      if (
        !newParams[paramKey] ||
        Object.keys(newParams[paramKey] as object).length === 0
      ) {
        delete newParams[paramKey];
      }

      const queryString = stringifyParams(newParams);
      setSearchParams(queryString.replace("?", ""));
    },
    [searchParams, setSearchParams, paramKey]
  );

  const goToPage = useCallback(
    (newPage: number) => {
      updateParams({ page: newPage === 1 ? null : newPage });
    },
    [updateParams]
  );

  const changePageSize = useCallback(
    (newPageSize: number) => {
      updateParams({
        pageSize: newPageSize === defaultPageSize ? null : newPageSize,
        page: null,
      });
    },
    [updateParams, defaultPageSize]
  );

  // List query
  const listQuery = useQuery({
    queryKey: [
      "form-instances",
      "list",
      { clientId, formTemplateId, status, page, pageSize },
    ],
    queryFn: async () => {
      const response = await client.api["form-instances"].$get({
        query: {
          clientId: clientId || undefined,
          formTemplateId: formTemplateId || undefined,
          status: status || undefined,
          page: String(page),
          pageSize: String(pageSize),
        },
      });
      return handleResponse<FormInstancesListResponse>(response);
    },
    enabled,
    placeholderData: (previousData) => previousData,
  });

  return {
    // List data
    data: listQuery.data?.items ?? [] as FormInstance[],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    // Pagination state
    page,
    pageSize,
    totalPages: listQuery.data?.totalPages ?? 0,
    total: listQuery.data?.total ?? 0,
    // Pagination handlers
    goToPage,
    changePageSize,
  };
}
