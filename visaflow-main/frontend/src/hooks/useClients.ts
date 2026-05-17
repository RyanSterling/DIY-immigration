import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { client, handleResponse } from "~/lib/api";
import {
  parseParams,
  stringifyParams,
  type QueryParams,
} from "~/lib/queryString";

// Manually defined success response types
// These exclude the error variants from Hono client types

// Client list item from the list endpoint
export interface Client {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string;
  updatedBy: string | null;
  firstName: string | null;
  lastName: string | null;
  nationality: string | null;
  caseType?: string | null;
}

// List response from /api/clients
interface ClientsListResponse {
  items: Client[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Client detail with active values from /api/clients/:id
export interface ClientDetail {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string;
  updatedBy: string | null;
  activeValues?: Record<string, {
    id: string;
    rawValue: string;
    valueType: string;
    normalizedValue: {
      display: string;
      original: string;
      iso?: string;
      code?: string;
    } | null;
    confidenceScore: number | null;
    documentId: string | null;
  }>;
}

interface UseClientsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

/**
 * Core client list hook - accepts params directly, no URL state.
 * Use this for components like dropdowns that manage their own state.
 */
export function useClients(options: UseClientsOptions = {}) {
  const { page = 1, pageSize = 20, search = "" } = options;
  const queryClient = useQueryClient();

  // List query
  const listQuery = useQuery({
    queryKey: ["clients", "list", { page, pageSize, search }],
    queryFn: async () => {
      const response = await client.api.clients.$get({
        query: {
          page: String(page),
          pageSize: String(pageSize),
          search: search || undefined,
        },
      });
      return handleResponse<ClientsListResponse>(response);
    },
    placeholderData: (previousData) => previousData,
  });

  // Get single client - response IS the client (no wrapper)
  const useGet = (id: string | undefined) => {
    return useQuery({
      queryKey: ["clients", "detail", id],
      queryFn: async () => {
        const response = await client.api.clients[":id"].$get({
          param: { id: id! },
        });
        return handleResponse<ClientDetail>(response);
      },
      enabled: !!id,
    });
  };

  // Create mutation - response IS the client (no wrapper)
  // Note: No auto-invalidation here - caller should invalidate after all related operations complete
  const useCreate = () => {
    return useMutation({
      mutationFn: async (data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
      }) => {
        const response = await client.api.clients.$post({ json: data });
        return handleResponse<ClientDetail>(response);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Operation failed");
      },
    });
  };

  // Delete mutation
  const useDelete = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        const response = await client.api.clients[":id"].$delete({
          param: { id },
        });
        return handleResponse<{ success: boolean }>(response);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Operation failed");
      },
    });
  };

  return {
    // List data - items array directly (no need for data.data)
    data: listQuery.data?.items ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    totalPages: listQuery.data?.totalPages ?? 0,
    total: listQuery.data?.total ?? 0,
    // CRUD hooks
    useGet,
    useCreate,
    useDelete,
  };
}

interface UseClientsSearchParamsOptions {
  paramKey?: string;
  defaultPageSize?: number;
}

/**
 * URL-aware client list hook - manages pagination/search state in URL params.
 * Use this for pages that need URL persistence (e.g., client list page).
 * Wraps useClients with URL state management.
 */
export function useClientsSearchParams(options: UseClientsSearchParamsOptions = {}) {
  const { paramKey = "clients", defaultPageSize = 20 } = options;
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
  const search = String(resourceParams.search || "");

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

  const handleSearch = useCallback(
    (newSearch: string) => {
      updateParams({ search: newSearch || null, page: null });
    },
    [updateParams]
  );

  // Use the base hook
  const queryResult = useClients({ page, pageSize, search });

  return {
    ...queryResult,
    // Pagination state from URL
    page,
    pageSize,
    search,
    // Pagination handlers
    goToPage,
    changePageSize,
    handleSearch,
  };
}

/**
 * Fetch a single client by ID with name fields extracted from activeValues.
 * Returns Client interface (with firstName, lastName, nationality).
 * Use this when you need a Client with normalized name fields from a detail endpoint.
 */
export function useClientById(id: string | null) {
  return useQuery({
    queryKey: ["clients", "detail", id],
    queryFn: async () => {
      const response = await client.api.clients[":id"].$get({
        param: { id: id! },
      });
      const detail = await handleResponse<ClientDetail>(response);

      // Extract firstName and lastName from activeValues
      return {
        id: detail.id,
        organizationId: detail.organizationId,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
        deletedAt: detail.deletedAt,
        createdBy: detail.createdBy,
        updatedBy: detail.updatedBy,
        firstName: detail.activeValues?.first_name?.normalizedValue?.display
          ?? detail.activeValues?.first_name?.rawValue
          ?? null,
        lastName: detail.activeValues?.last_name?.normalizedValue?.display
          ?? detail.activeValues?.last_name?.rawValue
          ?? null,
        nationality: detail.activeValues?.nationality?.normalizedValue?.display
          ?? detail.activeValues?.nationality?.rawValue
          ?? null,
      } as Client;
    },
    enabled: !!id,
  });
}
