import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

import { apiClient , getTenantId } from '../api-client';

// Types
export interface LeadListImport {
  id: string;
  tenantId: string;
  leadListId: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partially_completed';
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  duplicateRows: number;
  suppressedRows: number;
  invalidRows: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateImportDto {
  leadListId: string;
  fileName: string;
  fileSize: number;
}

export interface ImportListParams {
  page?: number;
  limit?: number;
  status?: string;
  leadListId?: string;
}

export interface ImportListResponse {
  data: LeadListImport[];
  total: number;
  page: number;
  limit: number;
}

// Queries
export function useImports(params?: ImportListParams, options?: UseQueryOptions<ImportListResponse>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['imports', params],
    queryFn: async () => {
      const response = await apiClient.get<ImportListResponse>('/lead-imports', {
        params: { ...params, tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

export function useImport(id: string, options?: UseQueryOptions<LeadListImport>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['import', id],
    queryFn: async () => {
      const response = await apiClient.get<LeadListImport>(`/lead-imports/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!id && !!tenantId,
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 2000 : false),
    ...options,
  });
}

// Mutations
export function useCreateImport() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (data: CreateImportDto) => {
      const response = await apiClient.post<LeadListImport>('/lead-imports', { ...data, tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });
}

// Upload endpoint removed - backend does not have a separate upload endpoint
// File upload should be handled by the create import endpoint with file data

export function useImportProgress(id: string, options?: UseQueryOptions<{ processedRows: number; totalRows: number; status: string }>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['import-progress', id],
    queryFn: async () => {
      const response = await apiClient.get(`/lead-imports/${id}/progress`, {
        params: { tenantId },
      });
      return response.data as { processedRows: number; totalRows: number; status: string };
    },
    enabled: !!id && !!tenantId,
    refetchInterval: 2000,
    ...options,
  });
}

export function useImportRows(id: string, params?: { status?: string; skip?: number; take?: number }, options?: UseQueryOptions<any>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['import-rows', id, params],
    queryFn: async () => {
      const response = await apiClient.get(`/lead-imports/${id}/rows`, {
        params: { ...params, tenantId },
      });
      return response.data;
    },
    enabled: !!id && !!tenantId,
    ...options,
  });
}

export function useStartImport() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/lead-imports/${id}/start`, { tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });
}
