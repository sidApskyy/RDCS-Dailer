import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

import { apiClient , getTenantId } from '../api-client';

// Types
export interface Campaign {
  id: string;
  tenantId: string;
  organizationId?: string;
  name: string;
  description?: string;
  slug: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  type?: string;
  purpose?: string;
  startDate?: string;
  endDate?: string;
  timezone: string;
  priority: number;
  settings?: any;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  slug: string;
  type?: string;
  purpose?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  priority?: number;
  settings?: any;
}

export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  slug?: string;
  type?: string;
  purpose?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  priority?: number;
  settings?: any;
}

export interface CampaignListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface CampaignListResponse {
  data: Campaign[];
  total: number;
  page: number;
  limit: number;
}

// Queries
export function useCampaigns(params?: CampaignListParams, options?: UseQueryOptions<CampaignListResponse>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: async () => {
      const response = await apiClient.get<CampaignListResponse>('/campaigns', {
        params: { ...params, tenantId },
      });
      return response.data;
    },
    enabled: !!tenantId,
    ...options,
  });
}

export function useCampaign(id: string, options?: UseQueryOptions<Campaign>) {
  const tenantId = getTenantId();
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const response = await apiClient.get<Campaign>(`/campaigns/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    enabled: !!id && !!tenantId,
    ...options,
  });
}

// Mutations
export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (data: CreateCampaignDto) => {
      const response = await apiClient.post<Campaign>('/campaigns', { ...data, tenantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCampaignDto }) => {
      const response = await apiClient.patch<Campaign>(`/campaigns/${id}`, { ...data, tenantId });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<Campaign>(`/campaigns/${id}`, {
        params: { tenantId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();
  const tenantId = getTenantId();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiClient.post<Campaign>(`/campaigns/${id}/transition`, { status, tenantId });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    },
  });
}
