---
name: api-hook
description: Generate React Query hooks for API endpoints. Use when adding new API integrations, creating data fetching hooks, or implementing CRUD operations for a resource.
allowed-tools: Read, Write, Grep, Glob
---

# API Hook Generator

Generate React Query hooks that follow the project's established patterns for API integration.

## Quick Reference

**Location:** `frontend/src/hooks/use<Resource>.ts`

**Key imports:**
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client, handleResponse, type InferResponse } from "~/lib/api";
```

**Query key pattern:** `["resource", "action", id?, { params }?]`

## Patterns

### 1. Type Inference from Hono Client

Always infer types from the backend routes:

```typescript
// List response (has items array)
type ResourceListResponse = InferResponse<
  Awaited<ReturnType<typeof client.api.resources.$get>>
>;

// Single item response
type Resource = InferResponse<
  Awaited<ReturnType<(typeof client.api.resources)[":id"]["$get"]>>
>;

// Extract item type from list
type ResourceItem = NonNullable<ResourceListResponse["items"]>[number];
```

### 2. List Query with Pagination

```typescript
const listQuery = useQuery({
  queryKey: ["resources", "list", { page, pageSize, search }],
  queryFn: async () => {
    const response = await client.api.resources.$get({
      query: {
        page: String(page),
        pageSize: String(pageSize),
        search: search || undefined,
      },
    });
    return handleResponse<ResourceListResponse>(response);
  },
  placeholderData: (previousData) => previousData,
});
```

### 3. Detail Query (Nested Hook)

```typescript
const useGet = (id: string | undefined) => {
  return useQuery({
    queryKey: ["resources", "detail", id],
    queryFn: async () => {
      const response = await client.api.resources[":id"].$get({
        param: { id: id! },
      });
      return handleResponse<Resource>(response);
    },
    enabled: !!id,
  });
};
```

### 4. Create Mutation

```typescript
const useCreate = () => {
  return useMutation({
    mutationFn: async (data: CreateInput) => {
      const response = await client.api.resources.$post({ json: data });
      return handleResponse<Resource>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
};
```

### 5. Delete Mutation

```typescript
const useDelete = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api.resources[":id"].$delete({
        param: { id },
      });
      return handleResponse<{ success: boolean }>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
};
```

### 6. Polling for Status Updates

```typescript
const listQuery = useQuery({
  // ... other options
  refetchInterval: (query) => {
    const items = query.state.data?.items;
    if (!items) return false;
    const hasPending = items.some(
      (item) => item.status === "pending" || item.status === "processing"
    );
    return hasPending ? 3000 : false;
  },
});
```

## Response Conventions

| Endpoint Type | Response Shape |
|--------------|----------------|
| List | `{ items: T[], totalPages: number, total: number }` |
| Detail | `T` (direct, no wrapper) |
| Create | `T` (the created item) |
| Delete | `{ success: boolean }` |
| Bulk create | `{ items: T[] }` |

## Hook Return Patterns

### Pattern A: Paginated Resource Hook

For resources with list + CRUD operations:

```typescript
export function useResources(options = {}) {
  const queryClient = useQueryClient();
  // ... pagination state and queries

  return {
    // List data
    data: listQuery.data?.items ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    // Pagination
    page,
    pageSize,
    totalPages: listQuery.data?.totalPages ?? 0,
    total: listQuery.data?.total ?? 0,
    goToPage,
    changePageSize,
    // Nested CRUD hooks
    useGet,
    useCreate,
    useDelete,
  };
}
```

### Pattern B: Mutation-Only Hook

For operations without list views:

```typescript
export function useResourceOperations() {
  const queryClient = useQueryClient();

  const useCreate = () => { /* ... */ };
  const useBulkCreate = () => { /* ... */ };
  const useSetActive = () => { /* ... */ };

  return {
    useCreate,
    useBulkCreate,
    useSetActive,
  };
}
```

## Instructions

When asked to create an API hook:

1. **Identify the resource** - What entity are we working with?
2. **Check backend routes** - Look at `backend/src/index.ts` or route files for endpoint structure
3. **Determine hook pattern** - Use Pattern A for CRUD resources, Pattern B for operations-only
4. **Infer types from Hono client** - Never manually define response types
5. **Follow query key convention** - `["resource", "action", ...params]`
6. **Use handleResponse<T>** - For all API calls
7. **Invalidate on mutations** - Use `queryClient.invalidateQueries`

## Reference Files

- `frontend/src/hooks/useClients.ts` - Full CRUD with URL-based pagination
- `frontend/src/hooks/useDocuments.ts` - CRUD with state pagination + polling
- `frontend/src/hooks/useClientFieldValues.ts` - Mutation-only pattern
- `frontend/src/lib/api.ts` - Client setup, handleResponse, InferResponse
