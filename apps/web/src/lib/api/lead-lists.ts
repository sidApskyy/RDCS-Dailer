import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

import { apiClient , getTenantId } from '../api-client';

// Types
export interface LeadList {
  id: string;
  tenantId: string;
  organizationId?: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'deleted';
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  duplicateRows: number;
  suppressedRows: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateLeadListDto {
  name: string;
  description?: string;
}

export interface UpdateLeadListDto {
  name?: string;
  description?: string;
  status?: string;
}

export interface LeadListListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface LeadListListResponse {
  data: LeadList[];
  total: number;
  page: number;
  limit: number;
}

// Queries
export function useLeadLists(params?: LeadListListParams, options?: UseQueryOptions<LeadListListResponse>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['lead-lists', params],
    queryFn: async () => {
      const response = await apiClient.get<LeadListListResponse>('/lead-lists', {
        params: { ...params, tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

export function useLeadList(id: string, options?: UseQueryOptions<LeadList>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['lead-list', id],
    queryFn: async () => {
      const response = await apiClient.get<LeadList>(`/lead-lists/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!id && !!tenantId,
    ...options,
  });
}

// Mutations
export function useCreateLeadList() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (data: CreateLeadListDto) => {
      const response = await apiClient.post<LeadList>('/lead-lists', { ...data, tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-lists'] });
    },
  });
}

export function useUpdateLeadList() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLeadListDto }) => {
      const response = await apiClient.patch<LeadList>(`/lead-lists/${id}`, { ...data, tenantId });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['lead-lists'] });
      queryClient.invalidateQueries({ queryKey: ['lead-list', id] });
    },
  });
}

export function useDeleteLeadList() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<LeadList>(`/lead-lists/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-lists'] });
    },
  });
}

export function useAttachLeadListToCampaign() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ leadListId, campaignId }: { leadListId: string; campaignId: string }) => {
      const response = await apiClient.post(`/lead-lists/${leadListId}/attach/${campaignId}`, { tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-lists'] });
    },
  });
}

export function useDetachLeadListFromCampaign() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ leadListId, campaignId }: { leadListId: string; campaignId: string }) => {
      const response = await apiClient.delete(`/lead-lists/${leadListId}/detach/${campaignId}`, {
        params: { tenantId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-lists'] });
    },
  });
}
