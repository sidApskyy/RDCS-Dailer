import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

import { apiClient , getTenantId } from '../api-client';

// Types
export interface DNCList {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'tenant' | 'campaign' | 'global';
  scope: 'all' | 'specific_campaign' | 'specific_purpose';
  isActive: boolean;
  entryCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DNCEntry {
  id: string;
  tenantId: string;
  dncListId: string;
  phoneNumber: string;
  reason?: string;
  source?: string;
  addedBy: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateDNCListDto {
  name: string;
  description?: string;
  type?: string;
  scope?: string;
}

export interface AddDNCEntryDto {
  phoneNumber: string;
  reason?: string;
  source?: string;
  expiresAt?: string;
}

export interface DNCListListParams {
  page?: number;
  limit?: number;
  type?: string;
  isActive?: boolean;
}

export interface DNCListListResponse {
  data: DNCList[];
  total: number;
  page: number;
  limit: number;
}

// Queries
export function useDNCLists(params?: DNCListListParams, options?: UseQueryOptions<DNCListListResponse>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['dnc-lists', params],
    queryFn: async () => {
      const response = await apiClient.get<DNCListListResponse>('/dnc/lists', {
        params: { ...params, tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

export function useDNCList(id: string, options?: UseQueryOptions<DNCList>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['dnc-list', id],
    queryFn: async () => {
      const response = await apiClient.get<DNCList>(`/dnc/lists/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!id && !!tenantId,
    ...options,
  });
}

export function useDNCEntries(dncListId: string, options?: UseQueryOptions<DNCEntry[]>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['dnc-entries', dncListId],
    queryFn: async () => {
      const response = await apiClient.get<DNCEntry[]>(`/dnc/lists/${dncListId}/entries`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!dncListId && !!tenantId,
    ...options,
  });
}

// Mutations
export function useCreateDNCList() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (data: CreateDNCListDto) => {
      const response = await apiClient.post<DNCList>('/dnc/lists', { ...data, tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dnc-lists'] });
    },
  });
}

export function useUpdateDNCList() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateDNCListDto> }) => {
      const response = await apiClient.patch<DNCList>(`/dnc/lists/${id}`, { ...data, tenantId });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['dnc-lists'] });
      queryClient.invalidateQueries({ queryKey: ['dnc-list', id] });
    },
  });
}

export function useDeleteDNCList() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<DNCList>(`/dnc/lists/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dnc-lists'] });
    },
  });
}

export function useAddDNCEntries() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ dncListId, phoneNumbers }: { dncListId: string; phoneNumbers: string[] }) => {
      const response = await apiClient.post(`/dnc/lists/${dncListId}/entries/bulk`, { phoneNumbers, tenantId });
      return response.data;
    },
    onSuccess: (_, { dncListId }) => {
      queryClient.invalidateQueries({ queryKey: ['dnc-entries', dncListId] });
    },
  });
}

export function useCheckDNC(phoneNumber: string, options?: UseQueryOptions<any>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['dnc-check', phoneNumber],
    queryFn: async () => {
      const response = await apiClient.get(`/dnc/check/${phoneNumber}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!phoneNumber && !!tenantId,
    ...options,
  });
}

export function useRemoveDNCEntry() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ dncListId, entryId }: { dncListId: string; entryId: string }) => {
      const response = await apiClient.delete(`/dnc/lists/${dncListId}/entries/${entryId}`, {
        params: { tenantId },
      });
      return response.data;
    },
    onSuccess: (_, { dncListId }) => {
      queryClient.invalidateQueries({ queryKey: ['dnc-entries', dncListId] });
    },
  });
}
